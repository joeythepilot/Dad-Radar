const assert = require("node:assert/strict");

const {
  buildDailySchedule,
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
    "Wilkes-Barre/Scranton"
  );
  assert.equal(
    result.state.flight.destinationLocation,
    "Wilkes-Barre/Scranton, Pennsylvania"
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

function testGsoDestinationCity() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        destination: "GSO"
      })
    ]),
    { now: NOW }
  );

  assert.equal(
    result.state.flight.destinationCity,
    "Greensboro"
  );
  assert.equal(
    result.state.flight.destinationLocation,
    "Greensboro, North Carolina"
  );
}

function testBilDestinationCity() {
  const schedule = createSchedule([
    createFlight({
      destination: "BIL"
    })
  ]);

  const result = resolveScheduleState(
    schedule,
    { now: NOW }
  );

  assert.equal(
    result.state.flight.destinationCity,
    "Billings"
  );
  assert.equal(
    result.state.flight.destinationLocation,
    "Billings, Montana"
  );

  const timeline = buildDailySchedule(
    schedule,
    result,
    { now: NOW }
  );

  assert.equal(
    timeline.context,
    "DADDY IS FLYING TO BILLINGS, MONTANA"
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
    "DADDY IS ON LAYOVER IN WILKES-BARRE/SCRANTON, PENNSYLVANIA"
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

  assert.equal(
    result.mode,
    "LOCATION_UNKNOWN"
  );
  assert.equal(
    result.state.status,
    "LOCATION UNKNOWN"
  );
}

function testAwayLocationPersistsAfterArrivalHold() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        destination: "GSO",
        times: {
          startUtc:
            "2026-08-04T10:00:00.000Z",
          endUtc:
            "2026-08-04T12:00:00.000Z"
        }
      })
    ]),
    { now: NOW }
  );

  assert.equal(result.mode, "LAYOVER");
  assert.equal(
    result.state.message,
    "DADDY IS ON THE GROUND IN GREENSBORO, NORTH CAROLINA"
  );
  assert.equal(
    result.state.locationAirport,
    "GSO"
  );
}

function testAvlArrivalProvidesHomeEvidence() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        destination: "AVL",
        times: {
          startUtc:
            "2026-08-04T10:00:00.000Z",
          endUtc:
            "2026-08-04T12:00:00.000Z"
        }
      })
    ]),
    { now: NOW }
  );

  assert.equal(result.mode, "HOME");
  assert.equal(
    result.state.locationAirport,
    "AVL"
  );
}

function testNextFlightOriginProvidesLocationEvidence() {
  const away = resolveScheduleState(
    createSchedule([
      createFlight({
        origin: "ORD",
        destination: "BIL",
        times: {
          startUtc:
            "2026-08-04T16:00:00.000Z",
          endUtc:
            "2026-08-04T18:00:00.000Z"
        }
      })
    ]),
    { now: NOW }
  );

  assert.equal(away.mode, "LAYOVER");
  assert.equal(
    away.state.locationAirport,
    "ORD"
  );

  const home = resolveScheduleState(
    createSchedule([
      createFlight({
        origin: "AVL",
        destination: "ORD",
        times: {
          startUtc:
            "2026-08-04T16:00:00.000Z",
          endUtc:
            "2026-08-04T18:00:00.000Z"
        }
      })
    ]),
    { now: NOW }
  );

  assert.equal(home.mode, "HOME");
  assert.equal(
    home.state.locationAirport,
    "AVL"
  );
}

function testDailyScheduleTimeline() {
  const completedFlight =
    createFlight({
      id: "completed-flight",
      origin: "GSO",
      destination: "ORD",
      flightNumber: "3390",
      times: {
        startUtc:
          "2026-08-04T10:00:00.000Z",
        endUtc:
          "2026-08-04T12:00:00.000Z"
      }
    });

  const activeFlight =
    createFlight();

  const upcomingFlight =
    createFlight({
      id: "upcoming-flight",
      origin: "AVP",
      destination: "ORD",
      flightNumber: "4412",
      times: {
        startUtc:
          "2026-08-04T16:00:00.000Z",
        endUtc:
          "2026-08-04T18:00:00.000Z"
      }
    });

  const schedule = createSchedule([
    upcomingFlight,
    completedFlight,
    activeFlight
  ]);

  const resolved =
    resolveScheduleState(
      schedule,
      { now: NOW }
    );

  const timeline =
    buildDailySchedule(
      schedule,
      resolved,
      {
        now: NOW,
        displayTimeZone:
          "America/New_York",
        displayTimeZoneLabel:
          "EASTERN TIME"
      }
    );

  assert.equal(
    timeline.dateLabel,
    "TUE AUG 4"
  );
  assert.equal(
    timeline.context,
    "DADDY IS FLYING TO WILKES-BARRE/SCRANTON, PENNSYLVANIA"
  );
  assert.equal(
    timeline.timeZoneLabel,
    "EASTERN TIME"
  );
  assert.deepEqual(
    timeline.entries.map(
      (entry) => entry.status
    ),
    [
      "completed",
      "current",
      "upcoming"
    ]
  );
  assert.deepEqual(
    timeline.entries.map(
      (entry) => entry.label
    ),
    [
      "GSO → ORD",
      "ORD → AVP",
      "AVP → ORD"
    ]
  );
}

function testEmptyDailySchedule() {
  const schedule = createSchedule([]);
  const resolved =
    resolveScheduleState(
      schedule,
      { now: NOW }
    );

  const timeline =
    buildDailySchedule(
      schedule,
      resolved,
      { now: NOW }
    );

  assert.equal(
    timeline.context,
    "DADDY'S LOCATION IS NOT CONFIRMED"
  );
  assert.deepEqual(
    timeline.entries,
    []
  );
}

function testDailyScheduleHasOneCurrentActivity() {
  const activeFlight = createFlight();
  const overlappingLayover = {
    id: "overlapping-layover",
    kind: "layover",
    status: "confirmed",
    airport: "AVP",
    times: {
      startUtc:
        "2026-08-04T12:00:00.000Z",
      endUtc:
        "2026-08-04T16:00:00.000Z"
    }
  };

  const schedule = createSchedule([
    overlappingLayover,
    activeFlight
  ]);

  const resolved =
    resolveScheduleState(
      schedule,
      { now: NOW }
    );

  const timeline =
    buildDailySchedule(
      schedule,
      resolved,
      { now: NOW }
    );

  assert.equal(
    timeline.entries.filter(
      (entry) =>
        entry.status === "current"
    ).length,
    1
  );
  assert.equal(
    timeline.entries.find(
      (entry) =>
        entry.status === "current"
    ).id,
    activeFlight.id
  );
}

function runTests() {
  testActiveFlight();
  testGsoDestinationCity();
  testBilDestinationCity();
  testCalendarProgress();
  testCommuteModes();
  testPreFlightWindow();
  testLayover();
  testRecentlyArrived();
  testCancelledFlightIsIgnored();
  testAwayLocationPersistsAfterArrivalHold();
  testAvlArrivalProvidesHomeEvidence();
  testNextFlightOriginProvidesLocationEvidence();
  testDailyScheduleTimeline();
  testEmptyDailySchedule();
  testDailyScheduleHasOneCurrentActivity();

  console.log(
    "Schedule state tests passed."
  );
}

runTests();
