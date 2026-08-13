const {
  resolveScheduleState
} = require("../models/schedule-state");

const {
  reconcileScheduleWithLive
} = require("../models/live-flight-state");

const DEFAULT_DAYS = 14;

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

function eventStart(event) {
  return toDate(
    event?.times?.startUtc ??
    event?.startUtc
  );
}

function eventEnd(event) {
  return toDate(
    event?.times?.endUtc ??
    event?.endUtc
  );
}

function usableFlights(schedule) {
  return (Array.isArray(schedule?.events)
    ? schedule.events
    : [])
    .filter((event) => (
      event?.kind === "flight" &&
      event.status !== "cancelled" &&
      eventStart(event) &&
      eventEnd(event)
    ))
    .slice()
    .sort(
      (left, right) =>
        eventStart(left) -
        eventStart(right)
    );
}

function selectDiagnosticFlight(
  schedule,
  providedNow = new Date()
) {
  const now =
    toDate(providedNow) ??
    new Date();

  const flights =
    usableFlights(schedule);

  const activeFlight =
    flights.find((event) => (
      eventStart(event) <= now &&
      now < eventEnd(event)
    ));

  if (activeFlight) {
    return activeFlight;
  }

  return flights.find(
    (event) => eventStart(event) > now
  ) ?? null;
}

function flightLabel(event) {
  const carrier = String(
    event?.carrierCode ?? ""
  )
    .trim()
    .toUpperCase();

  const number = String(
    event?.flightNumber ?? ""
  ).trim();

  return [carrier, number]
    .filter(Boolean)
    .join(" ") || "UNKNOWN";
}

function resolveSelectedFlight(
  schedule,
  event,
  now
) {
  return resolveScheduleState(
    {
      ...schedule,
      events: [event]
    },
    {
      now,
      boardingLeadMinutes:
        DEFAULT_DAYS * 24 * 60
    }
  );
}

function positionSummary(position) {
  if (!position) {
    return null;
  }

  return {
    latitude:
      position.latitude ?? null,
    longitude:
      position.longitude ?? null,
    altitudeFeet:
      position.altitudeFeet ?? null,
    groundSpeedKnots:
      position.groundSpeedKnots ?? null,
    headingDegrees:
      position.headingDegrees ?? null,
    recordedAt:
      position.recordedAt ?? null
  };
}

function createDiagnosticReport(
  schedule,
  selectedEvent,
  liveFlight,
  providedNow = new Date()
) {
  const now =
    toDate(providedNow) ??
    new Date();

  if (!selectedEvent) {
    return {
      outcome: "no-calendar-flight",
      checkedAt: now.toISOString(),
      calendar: {
        retrievedAt:
          schedule?.retrievedAt ?? null,
        eventCount:
          Array.isArray(schedule?.events)
            ? schedule.events.length
            : 0
      },
      selectedFlight: null,
      flightRadar24: null,
      display: null
    };
  }

  const calendarResolved =
    resolveSelectedFlight(
      schedule,
      selectedEvent,
      now
    );

  const reconciled = liveFlight
    ? reconcileScheduleWithLive(
        calendarResolved,
        liveFlight,
        { now }
      )
    : calendarResolved;

  const displayFlight =
    reconciled.state?.flight ?? null;

  const liveAccepted = Boolean(
    liveFlight &&
    reconciled.state?.source ===
      "flightradar24"
  );

  return {
    outcome: liveAccepted
      ? "matched"
      : liveFlight
        ? "rejected-live-match"
        : "no-live-match",
    checkedAt: now.toISOString(),
    calendar: {
      retrievedAt:
        schedule?.retrievedAt ?? null,
      eventCount:
        Array.isArray(schedule?.events)
          ? schedule.events.length
          : 0
    },
    selectedFlight: {
      eventId:
        selectedEvent.id ?? null,
      label:
        flightLabel(selectedEvent),
      origin:
        selectedEvent.origin ?? null,
      destination:
        selectedEvent.destination ?? null,
      startUtc:
        eventStart(selectedEvent)
          ?.toISOString() ?? null,
      endUtc:
        eventEnd(selectedEvent)
          ?.toISOString() ?? null,
      isCommute:
        Boolean(selectedEvent.isCommute),
      lookupCandidates:
        selectedEvent
          .liveLookupCandidates ?? []
    },
    flightRadar24: liveFlight
      ? {
          providerFlightId:
            liveFlight
              .providerFlightId ?? null,
          ident:
            liveFlight.displayIdent ??
            liveFlight.ident ?? null,
          phase:
            liveFlight.phase ?? null,
          status:
            liveFlight.status ?? null,
          origin:
            liveFlight.origin ?? null,
          destination:
            liveFlight.destination ?? null,
          retrievedAt:
            liveFlight.retrievedAt ?? null,
          eta:
            liveFlight.arrival?.best ??
            null,
          position:
            positionSummary(
              liveFlight.position
            )
        }
      : null,
    display: {
      source:
        reconciled.state?.source ??
        null,
      mode: reconciled.mode ?? null,
      status:
        reconciled.state?.status ??
        null,
      eta:
        displayFlight?.eta ?? null,
      progress:
        displayFlight?.progress ?? null,
      altitudeFeet:
        displayFlight?.altitude ?? null,
      groundSpeedKnots:
        displayFlight?.groundSpeed ??
        null,
      headingDegrees:
        displayFlight?.heading ?? null,
      positionSource:
        displayFlight
          ?.positionSource ?? null
    }
  };
}

async function runDiagnostic(
  dependencies,
  providedOptions = {}
) {
  if (
    typeof dependencies
      ?.getUpcomingEvents !==
      "function" ||
    typeof dependencies
      ?.getLiveFlightSnapshot !==
      "function"
  ) {
    throw new TypeError(
      "Calendar and live-flight dependencies are required."
    );
  }

  const now =
    toDate(providedOptions.now) ??
    new Date();

  const schedule = await dependencies
    .getUpcomingEvents({
      days:
        providedOptions.days ??
        DEFAULT_DAYS,
      timeMin: now
    });

  const selectedEvent =
    selectDiagnosticFlight(
      schedule,
      now
    );

  if (!selectedEvent) {
    return createDiagnosticReport(
      schedule,
      null,
      null,
      now
    );
  }

  const liveFlight = await dependencies
    .getLiveFlightSnapshot(
      selectedEvent
    );

  return createDiagnosticReport(
    schedule,
    selectedEvent,
    liveFlight,
    now
  );
}

function reportValue(
  value,
  fallback = "---"
) {
  return value === null ||
    value === undefined ||
    value === ""
    ? fallback
    : String(value);
}

function formatDiagnosticReport(report) {
  const lines = [
    "DAD RADAR LIVE FLIGHT DIAGNOSTIC",
    `Checked: ${report.checkedAt}`,
    `Calendar events: ${report.calendar.eventCount}`
  ];

  if (
    report.outcome ===
    "no-calendar-flight"
  ) {
    lines.push(
      "Result: No active or upcoming Calendar flight was found."
    );

    return lines.join("\n");
  }

  const selected =
    report.selectedFlight;

  lines.push(
    `Selected: ${selected.label} ${selected.origin} -> ${selected.destination}`,
    `Scheduled: ${selected.startUtc}`,
    `Lookup candidates: ${selected.lookupCandidates.join(", ") || "---"}`
  );

  if (
    report.outcome ===
    "no-live-match"
  ) {
    lines.push(
      "Flightradar24: No live aircraft match.",
      `Display fallback: ${report.display.mode} (${report.display.source})`
    );

    return lines.join("\n");
  }

  if (
    report.outcome ===
    "rejected-live-match"
  ) {
    lines.push(
      `Flightradar24: Snapshot rejected (${reportValue(report.flightRadar24.ident)}).`,
      "Reason: The snapshot was stale or did not match the Calendar route.",
      `Display fallback: ${report.display.mode} (${report.display.source})`
    );

    return lines.join("\n");
  }

  const live = report.flightRadar24;
  const position =
    live.position ?? {};

  lines.push(
    `Flightradar24: MATCHED ${reportValue(live.ident)}`,
    `Phase: ${reportValue(live.phase)} | Status: ${reportValue(live.status)}`,
    `Route: ${reportValue(live.origin)} -> ${reportValue(live.destination)}`,
    `Provider ETA: ${reportValue(live.eta)}`,
    `Position: ${reportValue(position.latitude)}, ${reportValue(position.longitude)}`,
    `Telemetry: ${reportValue(position.altitudeFeet)} ft | GS ${reportValue(position.groundSpeedKnots)} kt | HDG ${reportValue(position.headingDegrees)}`,
    `Display: ${reportValue(report.display.mode)} | ${reportValue(report.display.status)} | source ${reportValue(report.display.source)}`,
    `Display ETA: ${reportValue(report.display.eta)} | progress ${reportValue(report.display.progress)}%`
  );

  return lines.join("\n");
}

async function runCli() {
  require("dotenv").config({
    quiet: true
  });

  const {
    getUpcomingEvents
  } = require("./calendar-service");

  const {
    getLiveFlightSnapshot
  } = require("./flightradar24-service");

  const report = await runDiagnostic({
    getUpcomingEvents,
    getLiveFlightSnapshot
  });

  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify(report, null, 2)
    );
  } else {
    console.log(
      formatDiagnosticReport(report)
    );
  }

  if (report.outcome !== "matched") {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    if (
      error.name ===
      "Flightradar24ConfigurationError"
    ) {
      console.error(
        "Flightradar24 is not configured. Add FR24_API_TOKEN to .env and try again."
      );
    } else if (
      error.code === "ENOENT" &&
      String(error.path ?? "")
        .endsWith("token.json")
    ) {
      console.error(
        "Google Calendar is not authorized. Create token.json with the Calendar authorization utility and try again."
      );
    } else {
      console.error(
        `Live-flight diagnostic failed: ${error.message}`
      );
    }

    process.exitCode = 1;
  });
}

module.exports = {
  createDiagnosticReport,
  formatDiagnosticReport,
  runDiagnostic,
  selectDiagnosticFlight
};
