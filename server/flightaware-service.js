const AEROAPI_BASE_URL =
  "https://aeroapi.flightaware.com/aeroapi";

const LOOKUP_WINDOW_HOURS = 6;
const REQUEST_TIMEOUT_MS = 10000;

const IATA_TO_ICAO_CARRIERS = Object.freeze({
  AA: "AAL",
  AS: "ASA",
  B6: "JBU",
  DL: "DAL",
  F9: "FFT",
  MQ: "ENY",
  NK: "NKS",
  UA: "UAL",
  WN: "SWA"
});

class FlightAwareConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name =
      "FlightAwareConfigurationError";
  }
}

class FlightAwareRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "FlightAwareRequestError";
    this.status = status;
  }
}

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function finiteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeAirportCode(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return normalizeAirportCode(
      value.code_iata ??
      value.code_lid ??
      value.code ??
      value.code_icao
    );
  }

  const code = String(value)
    .trim()
    .toUpperCase();

  if (/^[A-Z]{3}$/.test(code)) {
    return code;
  }

  if (/^K[A-Z]{3}$/.test(code)) {
    return code.slice(1);
  }

  return code || null;
}

function splitFlightIdent(value) {
  const match = String(value ?? "")
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2,3})(\d{1,4}[A-Z]?)$/);

  if (!match) {
    return null;
  }

  return {
    carrier: match[1],
    flightNumber: match[2]
  };
}

function prioritizeLookupCandidates(values) {
  const supplied = Array.isArray(values)
    ? values
    : [];

  const existingIcao = [];
  const expandedIcao = [];
  const original = [];

  for (const value of supplied) {
    const ident = splitFlightIdent(value);

    if (!ident) {
      continue;
    }

    const normalized =
      `${ident.carrier}${ident.flightNumber}`;

    if (ident.carrier.length === 3) {
      existingIcao.push(normalized);
    } else {
      const icaoCarrier =
        IATA_TO_ICAO_CARRIERS[
          ident.carrier
        ];

      if (icaoCarrier) {
        expandedIcao.push(
          `${icaoCarrier}${ident.flightNumber}`
        );
      }

      original.push(normalized);
    }
  }

  return [
    ...new Set([
      ...existingIcao,
      ...expandedIcao,
      ...original
    ])
  ];
}

function normalizeLookup(lookup) {
  const startUtc = toDate(
    lookup?.startUtc ??
    lookup?.times?.startUtc
  );

  const candidates =
    prioritizeLookupCandidates(
      lookup?.lookupCandidates ??
      lookup?.liveLookupCandidates
    );

  if (!startUtc) {
    throw new TypeError(
      "A valid scheduled startUtc is required."
    );
  }

  if (candidates.length === 0) {
    throw new TypeError(
      "At least one valid flight lookup candidate is required."
    );
  }

  return {
    lookupCandidates: candidates,
    origin: normalizeAirportCode(
      lookup.origin
    ),
    destination: normalizeAirportCode(
      lookup.destination
    ),
    startUtc
  };
}

function lookupWindow(startUtc) {
  const windowMilliseconds =
    LOOKUP_WINDOW_HOURS * 60 * 60 * 1000;

  return {
    start: new Date(
      startUtc.getTime() -
      windowMilliseconds
    ).toISOString(),
    end: new Date(
      startUtc.getTime() +
      windowMilliseconds
    ).toISOString()
  };
}

function flightDepartureTime(flight) {
  return toDate(
    flight?.scheduled_out ??
    flight?.scheduled_off ??
    flight?.estimated_out ??
    flight?.estimated_off ??
    flight?.actual_out ??
    flight?.actual_off
  );
}

function routeMatches(flight, lookup) {
  const origin = normalizeAirportCode(
    flight?.origin
  );

  const destination =
    normalizeAirportCode(
      flight?.destination
    );

  return (
    (!lookup.origin ||
      origin === lookup.origin) &&
    (!lookup.destination ||
      destination === lookup.destination)
  );
}

function selectBestFlight(flights, lookup) {
  const maximumDifferenceMs =
    LOOKUP_WINDOW_HOURS * 60 * 60 * 1000;

  return (Array.isArray(flights)
    ? flights
    : [])
    .filter((flight) =>
      routeMatches(flight, lookup)
    )
    .map((flight) => {
      const departure =
        flightDepartureTime(flight);

      return {
        flight,
        difference: departure
          ? Math.abs(
              departure.getTime() -
              lookup.startUtc.getTime()
            )
          : Number.POSITIVE_INFINITY
      };
    })
    .filter(
      (candidate) =>
        candidate.difference <=
        maximumDifferenceMs
    )
    .sort(
      (left, right) =>
        left.difference -
        right.difference
    )[0]?.flight ?? null;
}

async function requestAeroApi(
  path,
  query,
  options
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.requestTimeoutMs ??
      REQUEST_TIMEOUT_MS
  );

  const baseUrl = String(
    options.baseUrl ??
      AEROAPI_BASE_URL
  ).replace(/\/$/, "");

  const url = new URL(
    `${baseUrl}/${String(path)
      .replace(/^\//, "")}`
  );

  for (const [key, value] of
    Object.entries(query ?? {})) {
    if (value !== null &&
        value !== undefined) {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  }

  try {
    const response =
      await options.fetchImpl(
        url,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-apikey": options.apiKey
          },
          signal: controller.signal
        }
      );

    if (response.status === 404) {
      return null;
    }

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const detail =
        data?.detail ??
        data?.title ??
        `FlightAware returned status ${response.status}.`;

      throw new FlightAwareRequestError(
        detail,
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new FlightAwareRequestError(
        "The FlightAware request timed out."
      );
    }

    if (
      error instanceof
      FlightAwareRequestError
    ) {
      throw error;
    }

    throw new FlightAwareRequestError(
      `Unable to reach FlightAware: ${error.message}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePosition(position) {
  if (!position) {
    return null;
  }

  const altitudeHundreds =
    finiteNumber(position.altitude);

  return {
    latitude:
      finiteNumber(position.latitude),
    longitude:
      finiteNumber(position.longitude),
    altitudeFeet:
      altitudeHundreds !== null
        ? altitudeHundreds * 100
        : null,
    altitudeTrend:
      position.altitude_change ?? null,
    groundSpeedKnots:
      finiteNumber(position.groundspeed),
    headingDegrees:
      finiteNumber(position.heading),
    recordedAt:
      position.timestamp ?? null,
    updateType:
      position.update_type ?? null
  };
}

function determinePhase(flight, position) {
  if (flight.cancelled) {
    return "CANCELLED";
  }

  if (flight.diverted) {
    return "DIVERTED";
  }

  if (flight.actual_in) {
    return "ARRIVED";
  }

  if (flight.actual_on) {
    return "LANDED";
  }

  if (flight.actual_off) {
    if (
      Number.isFinite(
        position?.altitudeFeet
      ) &&
      position?.altitudeFeet <= 10000 &&
      position?.altitudeTrend === "D"
    ) {
      return "APPROACH";
    }

    return "EN_ROUTE";
  }

  if (flight.actual_out) {
    return "TAXI_OUT";
  }

  const status = String(
    flight.status ?? ""
  ).toLowerCase();

  if (status.includes("board")) {
    return "BOARDING";
  }

  return "SCHEDULED";
}

function differenceMinutes(actual, planned) {
  const actualDate = toDate(actual);
  const plannedDate = toDate(planned);

  if (!actualDate || !plannedDate) {
    return null;
  }

  return Math.round(
    (
      actualDate.getTime() -
      plannedDate.getTime()
    ) / 60000
  );
}

function normalizeFlightSnapshot(
  flight,
  matchedIdent,
  positionData,
  retrievedAt
) {
  const position = normalizePosition(
    positionData?.last_position ??
    positionData
  );

  const scheduledDeparture =
    flight.scheduled_out ??
    flight.scheduled_off ?? null;

  const bestDeparture =
    flight.actual_out ??
    flight.estimated_out ??
    scheduledDeparture;

  const scheduledArrival =
    flight.scheduled_in ??
    flight.scheduled_on ?? null;

  const bestArrival =
    flight.actual_in ??
    flight.estimated_in ??
    flight.actual_on ??
    flight.estimated_on ??
    scheduledArrival;

  return {
    provider: "flightaware",
    retrievedAt,
    matchedIdent,
    providerFlightId:
      flight.fa_flight_id ?? null,
    ident:
      flight.ident_icao ??
      flight.ident ??
      matchedIdent,
    displayIdent:
      flight.ident_iata ??
      flight.ident ??
      matchedIdent,
    phase:
      determinePhase(
        flight,
        position
      ),
    status: flight.status ?? null,
    cancelled:
      Boolean(flight.cancelled),
    diverted:
      Boolean(flight.diverted),
    origin:
      normalizeAirportCode(
        flight.origin
      ),
    destination:
      normalizeAirportCode(
        flight.destination
      ),
    progressPercent:
      finiteNumber(
        flight.progress_percent
      ),
    aircraft: {
      registration:
        flight.registration ?? null,
      type:
        flight.aircraft_type ?? null
    },
    departure: {
      scheduled: scheduledDeparture,
      estimated:
        flight.estimated_out ??
        flight.estimated_off ?? null,
      actualGate:
        flight.actual_out ?? null,
      actualRunway:
        flight.actual_off ?? null,
      best: bestDeparture,
      delayMinutes:
        differenceMinutes(
          bestDeparture,
          scheduledDeparture
        ),
      terminal:
        flight.origin?.terminal ?? null,
      gate: flight.gate_origin ?? null
    },
    arrival: {
      scheduled: scheduledArrival,
      estimated:
        flight.estimated_in ??
        flight.estimated_on ?? null,
      actualRunway:
        flight.actual_on ?? null,
      actualGate:
        flight.actual_in ?? null,
      best: bestArrival,
      delayMinutes:
        differenceMinutes(
          bestArrival,
          scheduledArrival
        ),
      terminal:
        flight.destination?.terminal ?? null,
      gate: flight.gate_destination ?? null
    },
    position
  };
}

async function getLiveFlightSnapshot(
  requestedLookup,
  providedOptions = {}
) {
  const apiKey =
    providedOptions.apiKey ??
    process.env.FLIGHTAWARE_AEROAPI_KEY;

  if (!apiKey) {
    throw new FlightAwareConfigurationError(
      "FLIGHTAWARE_AEROAPI_KEY is not configured."
    );
  }

  const lookup = normalizeLookup(
    requestedLookup
  );

  const options = {
    apiKey,
    baseUrl:
      providedOptions.baseUrl ??
      AEROAPI_BASE_URL,
    fetchImpl:
      providedOptions.fetchImpl ?? fetch,
    requestTimeoutMs:
      providedOptions.requestTimeoutMs
  };

  const window = lookupWindow(
    lookup.startUtc
  );

  for (const ident of
    lookup.lookupCandidates) {
    const data = await requestAeroApi(
      `/flights/${encodeURIComponent(ident)}`,
      {
        ident_type: "designator",
        start: window.start,
        end: window.end,
        max_pages: 1
      },
      options
    );

    const flight = selectBestFlight(
      data?.flights,
      lookup
    );

    if (!flight) {
      continue;
    }

    let positionData = null;

    if (
      flight.fa_flight_id &&
      flight.actual_off &&
      !flight.actual_on
    ) {
      positionData = await requestAeroApi(
        `/flights/${encodeURIComponent(
          flight.fa_flight_id
        )}/position`,
        null,
        options
      );
    }

    return normalizeFlightSnapshot(
      flight,
      ident,
      positionData,
      new Date().toISOString()
    );
  }

  return null;
}

module.exports = {
  AEROAPI_BASE_URL,
  FlightAwareConfigurationError,
  FlightAwareRequestError,
  determinePhase,
  getLiveFlightSnapshot,
  normalizeAirportCode,
  normalizeFlightSnapshot,
  normalizeLookup,
  normalizePosition,
  prioritizeLookupCandidates,
  selectBestFlight
};
