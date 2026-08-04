const assert = require("node:assert/strict");

const {
  isLiveSnapshotFresh,
  reconcileScheduleWithLive
} = require("./live-flight-state");

const NOW = "2026-08-04T18:00:00.000Z";

function calendarResolved(
  mode = "EN_ROUTE",
  overrides = {}
) {
  const event = {
    id: "flight-1",
    kind: "flight",
    carrierCode: "MQ",
    flightNumber: "4140",
    origin: "ORD",
    destination: "AVL",
    liveLookupCandidates: [
      "ENY4140",
      "MQ4140"
    ],
    times: {
      startUtc:
        "2026-08-04T17:00:00.000Z",
      endUtc:
        "2026-08-04T19:00:00.000Z"
    },
    ...overrides.event
  };

  return {
    mode,
    state: {
      status:
        mode.replace(/_/g, " "),
      source: "calendar",
      eventId: event.id,
      flight: {
        number: "MQ 4140",
        carrierCode: "MQ",
        origin: "ORD",
        destination: "AVL",
        destinationCity: "ASHEVILLE",
        airspeed: null,
        heading: null,
        altitude: null,
        progress: 50,
        eta: "3:00 PM",
        timingSource: "calendar",
        positionSource:
          "schedule-estimate"
      }
    },
    event
  };
}

function liveSnapshot(overrides = {}) {
  return {
    provider: "flightaware",
    retrievedAt: NOW,
    providerFlightId: "ENY4140-1",
    ident: "ENY4140",
    displayIdent: "MQ4140",
    phase: "EN_ROUTE",
    status: "En Route / On Time",
    cancelled: false,
    diverted: false,
    origin: "ORD",
    destination: "AVL",
    progressPercent: 68,
    aircraft: {
      registration: "N123XY",
      type: "E75L"
    },
    departure: {
      delayMinutes: 7,
      terminal: "3",
      gate: "L10"
    },
    arrival: {
      best:
        "2026-08-04T18:42:00.000Z",
      delayMinutes: 4,
      terminal: null,
      gate: "B4"
    },
    position: {
      latitude: 38.2,
      longitude: -84.6,
      altitudeFeet: 27000,
      altitudeTrend: "D",
      groundSpeedKnots: 421,
      headingDegrees: 142,
      recordedAt:
        "2026-08-04T17:59:30.000Z"
    },
    ...overrides
  };
}

function testFreshLiveFlightWins() {
  const resolved =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot(),
      { now: NOW }
    );

  assert.equal(resolved.mode, "EN_ROUTE");
  assert.equal(
    resolved.state.source,
    "flightaware"
  );
  assert.equal(
    resolved.state.status,
    "EN ROUTE"
  );
  assert.equal(
    resolved.state.flight.progress,
    68
  );
  assert.equal(
    resolved.state.flight.altitude,
    27000
  );
  assert.equal(
    resolved.state.flight.heading,
    142
  );
  assert.equal(
    resolved.state.flight.groundSpeed,
    421
  );
  assert.equal(
    resolved.state.flight.airspeed,
    null,
    "Groundspeed must not be presented as airspeed."
  );
  assert.equal(
    resolved.state.flight.eta,
    "2:42 PM"
  );
  assert.equal(
    resolved.state.flight.latitude,
    38.2
  );
  assert.equal(
    resolved.state.flight.arrivalGate,
    "B4"
  );
}

function testStaleLiveFlightFallsBack() {
  const calendar = calendarResolved();

  const resolved =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        retrievedAt:
          "2026-08-04T17:55:00.000Z"
      }),
      {
        now: NOW,
        staleAfterMs: 3 * 60 * 1000
      }
    );

  assert.equal(resolved, calendar);
  assert.equal(
    isLiveSnapshotFresh(
      liveSnapshot(),
      { now: NOW }
    ),
    true
  );
}

function testRouteMismatchFallsBack() {
  const calendar = calendarResolved();

  const resolved =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        destination: "TYS"
      }),
      { now: NOW }
    );

  assert.equal(resolved, calendar);
}

function testLivePhasesDriveModes() {
  const approach =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  assert.equal(
    approach.mode,
    "APPROACH"
  );

  const diverted =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "DIVERTED",
        diverted: true
      }),
      { now: NOW }
    );

  assert.equal(
    diverted.mode,
    "DIVERTED"
  );

  const cancelled =
    reconcileScheduleWithLive(
      calendarResolved("PRE_FLIGHT"),
      liveSnapshot({
        phase: "CANCELLED",
        cancelled: true
      }),
      { now: NOW }
    );

  assert.equal(
    cancelled.mode,
    "PRE_FLIGHT"
  );
  assert.equal(
    cancelled.state.status,
    "CANCELLED"
  );
}

function testCommuteModeIsPreservedInFlight() {
  const commute =
    reconcileScheduleWithLive(
      calendarResolved(
        "COMMUTING_HOME",
        {
          event: { isCommute: true }
        }
      ),
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  assert.equal(
    commute.mode,
    "COMMUTING_HOME"
  );
  assert.equal(
    commute.state.status,
    "APPROACH"
  );
}

function runTests() {
  testFreshLiveFlightWins();
  testStaleLiveFlightFallsBack();
  testRouteMismatchFallsBack();
  testLivePhasesDriveModes();
  testCommuteModeIsPreservedInFlight();

  console.log(
    "Live flight state tests passed."
  );
}

runTests();
