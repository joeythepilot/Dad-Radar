const FR24_API_BASE_URL =
  "https://fr24api.flightradar24.com/api";

const REQUEST_TIMEOUT_MS = 10000;
const APPROACH_ALTITUDE_FEET = 10000;
const APPROACH_CAPTURE_ALTITUDE_FEET = 18000;
const APPROACH_GROUND_SPEED_KNOTS = 250;
const APPROACH_DISTANCE_NM = 90;
const GROUND_SPEED_KNOTS = 65;
const TAXI_SPEED_KNOTS = 3;
const AIRPORT_PROXIMITY_NM = 4;
const METADATA_CACHE_LIMIT = 128;

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

const airportCatalog = require(
  "../data/airport-catalog"
);

const flightMetadataCache = new Map();

class Flightradar24ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name =
      "Flightradar24ConfigurationError";
  }
}

class Flightradar24RequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "Flightradar24RequestError";
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
  const code = String(value ?? "")
    .trim()
    .toUpperCase();

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
    flightNumber: match[2],
    ident: `${match[1]}${match[2]}`
  };
}

function normalizeLookup(lookup) {
  const startUtc = toDate(
    lookup?.startUtc ??
    lookup?.times?.startUtc
  );

  if (!startUtc) {
    throw new TypeError(
      "A valid scheduled startUtc is required."
    );
  }

  const supplied = Array.isArray(
    lookup?.lookupCandidates ??
    lookup?.liveLookupCandidates
  )
    ? lookup.lookupCandidates ??
      lookup.liveLookupCandidates
    : [];

  const callsigns = [];
  const flights = [];

  for (const value of supplied) {
    const ident = splitFlightIdent(value);

    if (!ident) {
      continue;
    }

    if (ident.carrier.length === 3) {
      callsigns.push(ident.ident);
      continue;
    }

    flights.push(ident.ident);

    const icaoCarrier =
      IATA_TO_ICAO_CARRIERS[
        ident.carrier
      ];

    if (icaoCarrier) {
      callsigns.push(
        `${icaoCarrier}${ident.flightNumber}`
      );
    }
  }

  if (
    callsigns.length === 0 &&
    flights.length === 0
  ) {
    throw new TypeError(
      "At least one valid flight lookup candidate is required."
    );
  }

  return {
    callsigns: [...new Set(callsigns)],
    flights: [...new Set(flights)],
    providerFlightId:
      String(
        lookup?.providerFlightId ?? ""
      ).trim() || null,
    origin: normalizeAirportCode(
      lookup?.origin
    ),
    destination: normalizeAirportCode(
      lookup?.destination
    ),
    startUtc
  };
}

function responseAirport(record, side) {
  return normalizeAirportCode(
    record?.[`${side}_iata`] ??
    record?.[`${side}_icao`]
  );
}

function routeMatches(record, lookup) {
  const origin = responseAirport(
    record,
    "orig"
  );

  const destination = responseAirport(
    record,
    "dest"
  );

  return (
    (!lookup.origin ||
      !origin ||
      lookup.origin === origin) &&
    (!lookup.destination ||
      !destination ||
      lookup.destination === destination)
  );
}

function selectBestFlight(records, lookup) {
  const matching = (
    Array.isArray(records) ? records : []
  ).filter((record) =>
    routeMatches(record, lookup)
  );

  if (lookup.providerFlightId) {
    const exact = matching.find(
      (record) =>
        String(record?.fr24_id ?? "") ===
        lookup.providerFlightId
    );

    if (exact) {
      return exact;
    }
  }

  return matching[0] ?? null;
}

function cacheFlightMetadata(
  cache,
  record
) {
  const flightId = String(
    record?.fr24_id ?? ""
  ).trim();

  if (!flightId) {
    return;
  }

  cache.set(flightId, {
    fr24_id: flightId,
    flight: record.flight ?? null,
    callsign: record.callsign ?? null,
    type: record.type ?? null,
    reg: record.reg ?? null,
    operating_as:
      record.operating_as ?? null,
    painted_as:
      record.painted_as ?? null,
    orig_iata: record.orig_iata ?? null,
    orig_icao: record.orig_icao ?? null,
    dest_iata: record.dest_iata ?? null,
    dest_icao: record.dest_icao ?? null,
    eta: record.eta ?? null
  });

  while (cache.size > METADATA_CACHE_LIMIT) {
    const oldestKey =
      cache.keys().next().value;

    cache.delete(oldestKey);
  }
}

function radians(value) {
  return value * Math.PI / 180;
}

function distanceNauticalMiles(
  left,
  right
) {
  const leftLatitude = finiteNumber(
    left?.latitude
  );
  const leftLongitude = finiteNumber(
    left?.longitude
  );
  const rightLatitude = finiteNumber(
    right?.latitude
  );
  const rightLongitude = finiteNumber(
    right?.longitude
  );

  if (
    leftLatitude === null ||
    leftLongitude === null ||
    rightLatitude === null ||
    rightLongitude === null
  ) {
    return null;
  }

  const latitudeDelta = radians(
    rightLatitude - leftLatitude
  );
  const longitudeDelta = radians(
    rightLongitude - leftLongitude
  );

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(leftLatitude)) *
      Math.cos(radians(rightLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 3440.065 * 2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}

function airportPosition(code) {
  const airport =
    airportCatalog.lookupAirport(code);

  if (!airport) {
    return null;
  }

  return {
    latitude: airport.latitude,
    longitude: airport.longitude
  };
}

function routeMetrics(
  position,
  origin,
  destination
) {
  const originPosition =
    airportPosition(origin);

  const destinationPosition =
    airportPosition(destination);

  const routeDistance =
    distanceNauticalMiles(
      originPosition,
      destinationPosition
    );

  const distanceFromOrigin =
    distanceNauticalMiles(
      originPosition,
      position
    );

  const distanceToDestination =
    distanceNauticalMiles(
      position,
      destinationPosition
    );

  const progressPercent =
    routeDistance !== null &&
    routeDistance > 0 &&
    distanceFromOrigin !== null &&
    distanceToDestination !== null
      ? Math.max(
          0,
          Math.min(
            100,
            distanceFromOrigin /
              (
                distanceFromOrigin +
                distanceToDestination
              ) * 100
          )
        )
      : null;

  return {
    distanceFromOrigin,
    distanceToDestination,
    progressPercent
  };
}

function normalizePosition(record) {
  if (!record) {
    return null;
  }

  const verticalSpeed = finiteNumber(
    record.vspeed
  );

  return {
    latitude: finiteNumber(record.lat),
    longitude: finiteNumber(record.lon),
    altitudeFeet: finiteNumber(record.alt),
    altitudeTrend:
      verticalSpeed !== null &&
      verticalSpeed <= -100
        ? "D"
        : verticalSpeed !== null &&
            verticalSpeed >= 100
          ? "C"
          : "",
    verticalSpeedFeetPerMinute:
      verticalSpeed,
    groundSpeedKnots:
      finiteNumber(record.gspeed),
    headingDegrees:
      finiteNumber(record.track),
    recordedAt:
      record.timestamp ?? null,
    updateType:
      record.source ?? null
  };
}

function determinePhase(
  position,
  metrics
) {
  const altitudeFeet = finiteNumber(
    position?.altitudeFeet
  );
  const groundSpeedKnots = finiteNumber(
    position?.groundSpeedKnots
  );
  const verticalSpeed = finiteNumber(
    position
      ?.verticalSpeedFeetPerMinute
  );
  const progressPercent = finiteNumber(
    metrics?.progressPercent
  );
  const distanceFromOrigin = finiteNumber(
    metrics?.distanceFromOrigin
  );
  const distanceToDestination = finiteNumber(
    metrics?.distanceToDestination
  );

  const isGroundSpeed =
    groundSpeedKnots !== null &&
    groundSpeedKnots <=
      GROUND_SPEED_KNOTS;

  if (
    isGroundSpeed &&
    distanceToDestination !== null &&
    distanceToDestination <=
      AIRPORT_PROXIMITY_NM
  ) {
    return "ARRIVED";
  }

  if (
    isGroundSpeed &&
    distanceFromOrigin !== null &&
    distanceFromOrigin <=
      AIRPORT_PROXIMITY_NM
  ) {
    return groundSpeedKnots >=
      TAXI_SPEED_KNOTS
      ? "TAXI_OUT"
      : "BOARDING";
  }

  const isDescending =
    verticalSpeed !== null &&
    verticalSpeed <= -100;

  const isClimbing =
    verticalSpeed !== null &&
    verticalSpeed >= 100;

  const hasArrivalProgress =
    progressPercent !== null &&
    progressPercent >= 65;

  const isNearDestination =
    distanceToDestination !== null &&
    distanceToDestination <=
      APPROACH_DISTANCE_NM;

  const isApproachSpeed =
    groundSpeedKnots !== null &&
    groundSpeedKnots <=
      APPROACH_GROUND_SPEED_KNOTS;

  const isLowArrival =
    altitudeFeet !== null &&
    altitudeFeet <=
      APPROACH_ALTITUDE_FEET &&
    !isClimbing &&
    (
      hasArrivalProgress ||
      isNearDestination
    ) &&
    (
      isDescending ||
      isApproachSpeed
    );

  const isCapturedDescent =
    altitudeFeet !== null &&
    altitudeFeet <=
      APPROACH_CAPTURE_ALTITUDE_FEET &&
    isDescending &&
    (
      hasArrivalProgress ||
      isNearDestination
    );

  return isLowArrival ||
    isCapturedDescent
    ? "APPROACH"
    : "EN_ROUTE";
}

function titleCasePhase(phase) {
  return String(phase ?? "")
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (
      _match,
      prefix,
      letter
    ) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
}

function normalizeFlightSnapshot(
  record,
  lookup,
  retrievedAt = new Date().toISOString()
) {
  const position = normalizePosition(record);

  const origin =
    responseAirport(record, "orig") ??
    lookup.origin;

  const destination =
    responseAirport(record, "dest") ??
    lookup.destination;

  const metrics = routeMetrics(
    position,
    origin,
    destination
  );

  let phase = determinePhase(
    position,
    metrics
  );

  // FR24's live-position response has no explicit surface flag. Infer surface
  // evidence only from a current ADSB report at a route endpoint, zero reported
  // altitude, low speed and no climb/descent. Never use heading/speed alone.
  const recordedAt = toDate(position.recordedAt);
  const receivedAt = toDate(retrievedAt);
  const positionAge = recordedAt && receivedAt
    ? receivedAt.getTime() - recordedAt.getTime() : NaN;
  const nearOrigin = metrics.distanceFromOrigin !== null &&
    metrics.distanceFromOrigin <= AIRPORT_PROXIMITY_NM;
  const nearDestination = metrics.distanceToDestination !== null &&
    metrics.distanceToDestination <= AIRPORT_PROXIMITY_NM;
  const surfaceReport = /^ADSB$/i.test(position.updateType ?? "") &&
    position.latitude !== null && position.longitude !== null &&
    positionAge >= -5000 && positionAge <= 90000 &&
    position.altitudeFeet === 0 &&
    position.groundSpeedKnots !== null && position.groundSpeedKnots >= 0 &&
    position.groundSpeedKnots <= GROUND_SPEED_KNOTS &&
    (position.verticalSpeedFeetPerMinute === null ||
      Math.abs(position.verticalSpeedFeetPerMinute) < 100) &&
    (nearOrigin || nearDestination);
  position.onGround = surfaceReport ? true : null;
  position.groundEvidence = surfaceReport ? "fr24-adsb-zero-altitude" : null;
  if (surfaceReport) {
    phase = nearDestination && metrics.progressPercent > 80 ? "ARRIVED" : "TAXI_OUT";
  }

  return {
    provider: "flightradar24",
    retrievedAt,
    matchedIdent:
      record.callsign ??
      record.flight ?? null,
    providerFlightId:
      record.fr24_id ?? null,
    ident:
      record.callsign ??
      record.flight ?? null,
    displayIdent:
      record.flight ??
      record.callsign ?? null,
    phase,
    status: titleCasePhase(phase),
    cancelled: false,
    diverted: false,
    origin,
    destination,
    progressPercent:
      metrics.progressPercent,
    aircraft: {
      registration: record.reg ?? null,
      type: record.type ?? null
    },
    filedRoute: null,
    departure: {
      scheduled: null,
      estimated: null,
      actualGate: null,
      actualRunway: null,
      best: null,
      delayMinutes: null,
      terminal: null,
      gate: null
    },
    arrival: {
      scheduled: null,
      estimated: record.eta ?? null,
      actualRunway: null,
      actualGate: null,
      best: record.eta ?? null,
      delayMinutes: null,
      terminal: null,
      gate: null
    },
    position
  };
}

async function requestFr24(
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
      FR24_API_BASE_URL
  ).replace(/\/$/, "");

  const url = new URL(
    `${baseUrl}/${String(path)
      .replace(/^\//, "")}`
  );

  for (const [key, value] of
    Object.entries(query ?? {})) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      url.searchParams.set(
        key,
        Array.isArray(value)
          ? value.join(",")
          : String(value)
      );
    }
  }

  try {
    const response = await options.fetchImpl(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Version": "v1",
          Authorization:
            `Bearer ${options.apiToken}`
        },
        signal: controller.signal
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const detail =
        data?.message ??
        data?.detail ??
        `Flightradar24 returned status ${response.status}.`;

      throw new Flightradar24RequestError(
        detail,
        response.status
      );
    }

    return Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Flightradar24RequestError(
        "The Flightradar24 request timed out."
      );
    }

    if (
      error instanceof
      Flightradar24RequestError
    ) {
      throw error;
    }

    throw new Flightradar24RequestError(
      `Unable to reach Flightradar24: ${error.message}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getLiveFlightSnapshot(
  requestedLookup,
  providedOptions = {}
) {
  const apiToken =
    providedOptions.apiToken ??
    process.env.FR24_API_TOKEN;

  if (!apiToken) {
    throw new Flightradar24ConfigurationError(
      "FR24_API_TOKEN is not configured."
    );
  }

  const lookup = normalizeLookup(
    requestedLookup
  );

  const options = {
    apiToken,
    baseUrl:
      providedOptions.baseUrl ??
      FR24_API_BASE_URL,
    fetchImpl:
      providedOptions.fetchImpl ?? fetch,
    requestTimeoutMs:
      providedOptions.requestTimeoutMs,
    metadataCache:
      providedOptions.metadataCache ??
      flightMetadataCache
  };

  const queries = [];

  if (lookup.callsigns.length > 0) {
    queries.push({
      callsigns: lookup.callsigns,
      limit: 20
    });
  }

  if (lookup.flights.length > 0) {
    queries.push({
      flights: lookup.flights,
      limit: 20
    });
  }

  for (const query of queries) {
    const isContinuingFlight = Boolean(
      lookup.providerFlightId
    );

    const records = await requestFr24(
      isContinuingFlight
        ? "/live/flight-positions/light"
        : "/live/flight-positions/full",
      query,
      options
    );

    const flight = selectBestFlight(
      records,
      lookup
    );

    if (!flight) {
      continue;
    }

    const cachedMetadata =
      options.metadataCache.get(
        flight.fr24_id
      ) ?? {};

    const completeFlight = {
      ...cachedMetadata,
      ...flight
    };

    if (!isContinuingFlight) {
      cacheFlightMetadata(
        options.metadataCache,
        completeFlight
      );
    }

    return normalizeFlightSnapshot(
      completeFlight,
      lookup
    );
  }

  return null;
}

module.exports = {
  FR24_API_BASE_URL,
  Flightradar24ConfigurationError,
  Flightradar24RequestError,
  determinePhase,
  cacheFlightMetadata,
  distanceNauticalMiles,
  getLiveFlightSnapshot,
  normalizeAirportCode,
  normalizeFlightSnapshot,
  normalizeLookup,
  normalizePosition,
  requestFr24,
  routeMetrics,
  selectBestFlight
};
