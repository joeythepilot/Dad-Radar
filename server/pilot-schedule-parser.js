const { DateTime } = require("luxon");
const airportCatalog = require(
  "../data/airport-catalog"
);

const DISPLAY_TIME_ZONE =
  "America/New_York";

const ROUTE_ARROW_PATTERN =
  "(?:\\u2192|->)";

const FLIGHT_SUMMARY_PATTERN =
  new RegExp(
    `^Flight\\s+(\\d{1,4})\\s+([A-Z]{3})\\s*${ROUTE_ARROW_PATTERN}\\s*([A-Z]{3})`,
    "i"
  );

const COMMUTE_SUMMARY_PATTERN =
  new RegExp(
    `^COMMUTE\\s+([A-Z]{2,3})\\s*(\\d{1,4})\\s+([A-Z]{3})\\s*${ROUTE_ARROW_PATTERN}\\s*([A-Z]{3})`,
    "i"
  );const LAYOVER_SUMMARY_PATTERN =
  /^Layover\s+([A-Z]{3})(?:\s+\(([^)]+)\))?/i;

const DUTY_FREE_PATTERN =
  /^Duty free period$/i;

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeAirport(value) {
  const airport = cleanText(value).toUpperCase();

  return /^[A-Z]{3}$/.test(airport)
    ? airport
    : null;
}

function normalizeCarrier(value) {
  const carrier = cleanText(value).toUpperCase();

  return /^[A-Z]{2,3}$/.test(carrier)
    ? carrier
    : null;
}

function parseFlightDescription(description) {
  const text = cleanText(description)
    .replace(/\s+/g, " ");

  const flightMatch = text.match(
    /Flight:\s*(?:([A-Z]{2,3})\s*)?(\d{1,4})\s+Stations:\s*([A-Z]{3})\s*(?:→|->)\s*([A-Z]{3})/i
  );

  const timeMatch = text.match(
    /Time:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)\s*-\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/i
  );

  if (!flightMatch || !timeMatch) {
    return null;
  }

  return {
    carrierCode:
      normalizeCarrier(flightMatch[1]),
    flightNumber:
      flightMatch[2],
    origin:
      normalizeAirport(flightMatch[3]),
    destination:
      normalizeAirport(flightMatch[4]),
    departureWallTime:
      timeMatch[1],
    arrivalWallTime:
      timeMatch[2]
  };
}
function parseLayoverDescription(description) {
  const text = cleanText(description)
    .replace(/\s+/g, " ");

  const match = text.match(
    /Airport:\s*([A-Z]{3})\s+Duration:\s*(.+)$/i
  );

  if (!match) {
    return null;
  }

  return {
    airport:
      normalizeAirport(match[1]),
    durationText:
      cleanText(match[2])
  };
}

function parseCalendarDateTime(value) {
  if (!value) {
    return null;
  }

  if (value.dateTime) {
    const parsed = DateTime.fromISO(
      value.dateTime,
      { setZone: true }
    );

    return parsed.isValid
      ? parsed
      : null;
  }

  if (value.date) {
    const parsed = DateTime.fromISO(
      value.date,
      { zone: DISPLAY_TIME_ZONE }
    );

    return parsed.isValid
      ? parsed.startOf("day")
      : null;
  }

  return null;
}

function createFallbackTimes(event) {
  const start =
    parseCalendarDateTime(event.start);

  const end =
    parseCalendarDateTime(event.end);

  return {
    source: "calendar-event",
    departureZone:
      start?.zoneName ?? null,
    arrivalZone:
      end?.zoneName ?? null,
    startUtc:
      start?.toUTC().toISO() ?? null,
    endUtc:
      end?.toUTC().toISO() ?? null,
    startEastern:
      start
        ?.setZone(DISPLAY_TIME_ZONE)
        .toISO() ?? null,
    endEastern:
      end
        ?.setZone(DISPLAY_TIME_ZONE)
        .toISO() ?? null,
    needsTimeZoneVerification: false
  };
}

function createFlightTimes(
  event,
  flightDescription,
  airportTimeZoneFor
) {
  const fallback =
    createFallbackTimes(event);

  if (!flightDescription) {
    return fallback;
  }

  const departureZone =
    airportTimeZoneFor(
      flightDescription.origin
    );

  const arrivalZone =
    airportTimeZoneFor(
      flightDescription.destination
    );

  if (!departureZone || !arrivalZone) {
    return {
      ...fallback,
      needsTimeZoneVerification: true,
      missingAirportTimeZones: [
        departureZone
          ? null
          : flightDescription.origin,
        arrivalZone
          ? null
          : flightDescription.destination
      ].filter(Boolean)
    };
  }

  let departure =
    DateTime.fromISO(
      flightDescription.departureWallTime,
      { zone: departureZone }
    );

  let arrival =
    DateTime.fromISO(
      flightDescription.arrivalWallTime,
      { zone: arrivalZone }
    );

  if (!departure.isValid || !arrival.isValid) {
    return {
      ...fallback,
      needsTimeZoneVerification: true
    };
  }

  if (
    arrival.toUTC().toMillis() <=
    departure.toUTC().toMillis()
  ) {
    arrival = arrival.plus({ days: 1 });
  }

  return {
    source: "description-wall-times",
    departureZone,
    arrivalZone,
    departureWallTime:
      flightDescription.departureWallTime,
    arrivalWallTime:
      flightDescription.arrivalWallTime,
    startUtc:
      departure.toUTC().toISO(),
    endUtc:
      arrival.toUTC().toISO(),
    startEastern:
      departure
        .setZone(DISPLAY_TIME_ZONE)
        .toISO(),
    endEastern:
      arrival
        .setZone(DISPLAY_TIME_ZONE)
        .toISO(),
    needsTimeZoneVerification: false
  };
}

function createLiveLookupCandidates(
  carrierCode,
  flightNumber,
  isCommute
) {
  if (!flightNumber) {
    return [];
  }

  if (isCommute && carrierCode) {
    return [
      `${carrierCode}${flightNumber}`
    ];
  }

  return [
    `AA${flightNumber}`,
    `MQ${flightNumber}`,
    `ENY${flightNumber}`
  ];
}

function parsePilotEvent(
  event,
  options = {}
) {
  const airportTimeZones =
    options.airportTimeZones ?? {};

  const airportTimeZoneFor =
    (code) =>
      airportTimeZones[code] ??
      airportCatalog
        .getAirportTimeZone(code);

  const summary =
    cleanText(event.summary);

  const description =
    cleanText(event.description);

  const commuteMatch =
    summary.match(
      COMMUTE_SUMMARY_PATTERN
    );

  const flightMatch =
    summary.match(
      FLIGHT_SUMMARY_PATTERN
    );

  const layoverMatch =
    summary.match(
      LAYOVER_SUMMARY_PATTERN
    );

  const descriptionFlight =
    parseFlightDescription(description);

  if (commuteMatch || flightMatch) {
    const isCommute =
      Boolean(commuteMatch);

    const match =
      commuteMatch ?? flightMatch;

    const summaryCarrier =
      isCommute
        ? normalizeCarrier(match[1])
        : null;

    const summaryFlightNumber =
      isCommute
        ? match[2]
        : match[1];

    const summaryOrigin =
      isCommute
        ? normalizeAirport(match[3])
        : normalizeAirport(match[2]);

    const summaryDestination =
      isCommute
        ? normalizeAirport(match[4])
        : normalizeAirport(match[3]);

    const carrierCode =
      summaryCarrier ??
      descriptionFlight?.carrierCode ??
      null;

    const flightNumber =
      descriptionFlight?.flightNumber ??
      summaryFlightNumber;

    const origin =
      descriptionFlight?.origin ??
      summaryOrigin;

    const destination =
      descriptionFlight?.destination ??
      summaryDestination;

    const normalizedDescriptionFlight =
      descriptionFlight
        ? {
            ...descriptionFlight,
            flightNumber,
            origin,
            destination
          }
        : null;

    return {
      id: event.id ?? null,
      kind: "flight",
      isCommute,
      summary,
      description,
      status:
        event.status ?? null,
      carrierCode,
      flightNumber,
      origin,
      destination,
      route:
        origin && destination
          ? `${origin}→${destination}`
          : null,
      liveLookupCandidates:
        createLiveLookupCandidates(
          carrierCode,
          flightNumber,
          isCommute
        ),
      requiresFlightVerification:
        !isCommute,
      times:
        createFlightTimes(
          event,
          normalizedDescriptionFlight,
          airportTimeZoneFor
        ),
      updated:
        event.updated ?? null
    };
  }

  if (layoverMatch) {
    const descriptionLayover =
      parseLayoverDescription(
        description
      );

    return {
      id: event.id ?? null,
      kind: "layover",
      summary,
      description,
      status:
        event.status ?? null,
      airport:
        descriptionLayover?.airport ??
        normalizeAirport(
          layoverMatch[1]
        ),
      durationText:
        descriptionLayover?.durationText ??
        cleanText(layoverMatch[2]) ??
        null,
      times:
        createFallbackTimes(event),
      updated:
        event.updated ?? null
    };
  }

  if (DUTY_FREE_PATTERN.test(summary)) {
    return {
      id: event.id ?? null,
      kind: "duty-free",
      summary,
      description,
      status:
        event.status ?? null,
      times:
        createFallbackTimes(event),
      updated:
        event.updated ?? null
    };
  }

  return {
    id: event.id ?? null,
    kind: "other",
    summary,
    description,
    status:
      event.status ?? null,
    location:
      cleanText(event.location),
    times:
      createFallbackTimes(event),
    updated:
      event.updated ?? null
  };
}

function parsePilotSchedule(
  calendarData,
  options = {}
) {
  const events =
    Array.isArray(calendarData)
      ? calendarData
      : calendarData?.events ?? [];

  return {
    calendarId:
      calendarData?.calendarId ?? null,
    calendarTimeZone:
      calendarData?.calendarTimeZone ??
      null,
    displayTimeZone:
      DISPLAY_TIME_ZONE,
    retrievedAt:
      calendarData?.retrievedAt ?? null,
    events:
      events.map((event) =>
        parsePilotEvent(
          event,
          options
        )
      )
  };
}

module.exports = {
  DISPLAY_TIME_ZONE,
  parseFlightDescription,
  parseLayoverDescription,
  parsePilotEvent,
  parsePilotSchedule
};
