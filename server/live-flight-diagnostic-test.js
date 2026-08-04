const assert = require("node:assert/strict");

const {
  formatDiagnosticReport,
  runDiagnostic,
  selectDiagnosticFlight
} = require("./live-flight-diagnostic");

const NOW = new Date(
  "2026-08-04T18:00:00.000Z"
);

function flightEvent(
  id,
  startUtc,
  endUtc,
  overrides = {}
) {
  return {
    id,
    kind: "flight",
    status: "confirmed",
    carrierCode: "MQ",
    flightNumber: "4140",
    origin: "ORD",
    destination: "AVL",
    liveLookupCandidates: [
      "ENY4140",
      "MQ4140"
    ],
    times: {
      startUtc,
      endUtc,
      source: "calendar"
    },
    ...overrides
  };
}

function schedule(events) {
  return {
    calendarId: "pilot-schedule",
    retrievedAt: NOW.toISOString(),
    events
  };
}

function matchedSnapshot() {
  return {
    provider: "flightaware",
    retrievedAt: NOW.toISOString(),
    providerFlightId: "ENY4140-1",
    ident: "ENY4140",
    displayIdent: "MQ4140",
    phase: "EN_ROUTE",
    status: "En Route / On Time",
    origin: "ORD",
    destination: "AVL",
    progressPercent: 55,
    departure: {
      delayMinutes: 4
    },
    arrival: {
      best:
        "2026-08-04T19:15:00.000Z",
      delayMinutes: 7,
      gate: "B4"
    },
    position: {
      latitude: 38.2,
      longitude: -84.6,
      altitudeFeet: 27000,
      groundSpeedKnots: 421,
      headingDegrees: 142,
      recordedAt:
        "2026-08-04T17:59:30.000Z"
    }
  };
}

function testActiveFlightWinsOverNext() {
  const active = flightEvent(
    "active",
    "2026-08-04T17:00:00.000Z",
    "2026-08-04T19:00:00.000Z"
  );

  const next = flightEvent(
    "next",
    "2026-08-05T17:00:00.000Z",
    "2026-08-05T19:00:00.000Z"
  );

  assert.equal(
    selectDiagnosticFlight(
      schedule([next, active]),
      NOW
    ),
    active
  );
}

async function testMatchedFlightReport() {
  const event = flightEvent(
    "active",
    "2026-08-04T17:00:00.000Z",
    "2026-08-04T19:00:00.000Z"
  );

  let requestedEvent = null;

  const report = await runDiagnostic(
    {
      async getUpcomingEvents() {
        return schedule([event]);
      },
      async getLiveFlightSnapshot(
        lookup
      ) {
        requestedEvent = lookup;
        return matchedSnapshot();
      }
    },
    { now: NOW }
  );

  assert.equal(requestedEvent, event);
  assert.equal(report.outcome, "matched");
  assert.equal(
    report.flightAware.phase,
    "EN_ROUTE"
  );
  assert.equal(
    report.display.source,
    "flightaware"
  );
  assert.equal(
    report.display.groundSpeedKnots,
    421
  );

  const formatted =
    formatDiagnosticReport(report);

  assert.match(
    formatted,
    /FlightAware: MATCHED MQ4140/
  );
  assert.match(
    formatted,
    /GS 421 kt/
  );
}

async function testNextFlightCanBeCheckedEarly() {
  const next = flightEvent(
    "next",
    "2026-08-06T17:00:00.000Z",
    "2026-08-06T19:00:00.000Z"
  );

  const report = await runDiagnostic(
    {
      async getUpcomingEvents() {
        return schedule([next]);
      },
      async getLiveFlightSnapshot() {
        return null;
      }
    },
    { now: NOW }
  );

  assert.equal(
    report.outcome,
    "no-live-match"
  );
  assert.equal(
    report.selectedFlight.eventId,
    "next"
  );
  assert.equal(
    report.display.mode,
    "PRE_FLIGHT"
  );
  assert.equal(
    report.display.source,
    "calendar"
  );
}

async function testMismatchedSnapshotIsRejected() {
  const event = flightEvent(
    "active",
    "2026-08-04T17:00:00.000Z",
    "2026-08-04T19:00:00.000Z"
  );

  const mismatch = matchedSnapshot();
  mismatch.destination = "TYS";

  const report = await runDiagnostic(
    {
      async getUpcomingEvents() {
        return schedule([event]);
      },
      async getLiveFlightSnapshot() {
        return mismatch;
      }
    },
    { now: NOW }
  );

  assert.equal(
    report.outcome,
    "rejected-live-match"
  );
  assert.equal(
    report.display.source,
    "calendar"
  );
  assert.match(
    formatDiagnosticReport(report),
    /Snapshot rejected/
  );
}

async function testNoFlightSkipsProvider() {
  let providerCalled = false;

  const report = await runDiagnostic(
    {
      async getUpcomingEvents() {
        return schedule([]);
      },
      async getLiveFlightSnapshot() {
        providerCalled = true;
        return null;
      }
    },
    { now: NOW }
  );

  assert.equal(
    providerCalled,
    false
  );
  assert.equal(
    report.outcome,
    "no-calendar-flight"
  );
  assert.match(
    formatDiagnosticReport(report),
    /No active or upcoming Calendar flight/
  );
}

async function runTests() {
  testActiveFlightWinsOverNext();
  await testMatchedFlightReport();
  await testNextFlightCanBeCheckedEarly();
  await testMismatchedSnapshotIsRejected();
  await testNoFlightSkipsProvider();

  console.log(
    "Live flight diagnostic tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
