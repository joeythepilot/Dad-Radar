const assert = require("node:assert/strict");

const {
  calculateProgress,
  resolveScheduleState
} = require("./schedule-state");

const NOW =
  "2026-08-04T14:00:00.000Z";

function createFlight(overrides = {}) {
  return {
    id: "flight-event",
    kind: "flight",
    isCommute: false,
    status: "confirmed",
    flightNumber: "4140",
    carrierCode: null,
    origin: "ORD",
    destination: "AVP",
    liveLookupCandidates: [
      "AA4140",
      "MQ4140",
      "ENY4140"
    ],
    times: {
      source:
        "description-wall-times",
      startUtc:
        "2026-08-04T13:00:00.000Z",
      endUtc:
        "2026-08-04T15:00:00.000Z",
      endEastern:
        "2026-08-04T11:00:00.000-04:00"
    },
    ...overrides
  };
}

function createSchedule(events) {
  return {
    calendarId: "pilot-schedule",
    retrievedAt:
      "2026-08-04T13:55:00.000Z",
    events
  };
}

function testActiveFlight() {
  const event = createFlight();
  const result =
    resolveScheduleState(
      createSchedule([event]),
      { now: NOW }
    );

  assert.equal(result.mode, "EN_ROUTE");
  assert.equal(
    result.state.source,
    "calendar"
  );
  assert.equal(
    result.state.flight.number,
    "AA 4140"
  );
  assert.equal(
    result.state.flight.origin,
    "ORD"
  );
  assert.equal(
    result.state.flight.destination,
    "AVP"
  );
  assert.equal(
    result.state.flight.destinationCity,
    "SCRANTON"
  );
  assert.equal(
    result.state.flight.progress,
    50
  );
  assert.equal(
    result.state.flight.eta,
    "11:00 AM"
  );
  assert.equal(
    result.state.flight.airspeed,
    null
  );
}

function testCalendarProgress() {
  const event = createFlight();

  assert.equal(
    calculateProgress(
      event,
      new Date(NOW)
    ),
    50
  );
}

function testCommuteModes() {
  const toBase = resolveScheduleState(
    createSchedule([
      createFlight({
        isCommute: true,
        carrierCode: "UA",
        flightNumber: "1234",
        origin: "AVL",
        destination: "ORD"
      })
    ]),
    { now: NOW }
  );

  assert.equal(
    toBase.mode,
    "COMMUTING_TO_BASE"
  );

  const home = resolveScheduleState(
    createSchedule([
      createFlight({
        isCommute: true,
        carrierCode: "UA",
        flightNumber: "5678",
        origin: "ORD",
        destination: "AVL"
      })
    ]),
    { now: NOW }
  );

  assert.equal(
    home.mode,
    "COMMUTING_HOME"
  );
}

function testPreFlightWindow() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        times: {
          source:
            "description-wall-times",
          startUtc:
            "2026-08-04T14:30:00.000Z",
          endUtc:
            "2026-08-04T16:30:00.000Z",
          endEastern:
            "2026-08-04T12:30:00.000-04:00"
        }
      })
    ]),
    {
      now: NOW,
      preFlightLeadMinutes: 45
    }
  );

  assert.equal(result.mode, "PRE_FLIGHT");
  assert.equal(
    result.state.flight.progress,
    0
  );
}

function testLayover() {
  const result = resolveScheduleState(
    createSchedule([
      {
        id: "layover-event",
        kind: "layover",
        status: "confirmed",
        airport: "AVP",
        times: {
          startUtc:
            "2026-08-04T12:00:00.000Z",
          endUtc:
            "2026-08-05T12:00:00.000Z"
        }
      }
    ]),
    { now: NOW }
  );

  assert.equal(result.mode, "LAYOVER");
  assert.equal(
    result.state.message,
    "DAD IS ON LAYOVER IN AVP"
  );
}

function testRecentlyArrived() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        times: {
          startUtc:
            "2026-08-04T11:30:00.000Z",
          endUtc:
            "2026-08-04T13:30:00.000Z",
          endEastern:
            "2026-08-04T09:30:00.000-04:00"
        }
      })
    ]),
    {
      now: NOW,
      arrivedHoldMinutes: 45
    }
  );

  assert.equal(result.mode, "ARRIVED");
  assert.equal(
    result.state.flight.progress,
    100
  );
}

function testCancelledFlightIsIgnored() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        status: "cancelled"
      })
    ]),
    { now: NOW }
  );

  assert.equal(result.mode, "HOME");
}

function runTests() {
  testActiveFlight();
  testCalendarProgress();
  testCommuteModes();
  testPreFlightWindow();
  testLayover();
  testRecentlyArrived();
  testCancelledFlightIsIgnored();

  console.log(
    "Schedule state tests passed."
  );
}

runTests();
