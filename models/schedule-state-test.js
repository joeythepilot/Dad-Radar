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

  assert.equal(result.mode, "DELAYED");
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
    0
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
    "DADDY'S FLIGHT TO BILLINGS, MONTANA IS 60 MIN LATE"
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

function testBoardingWindow() {
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
      boardingLeadMinutes: 30
    }
  );

  assert.equal(result.mode, "BOARDING");
  assert.equal(
    result.state.flight.progress,
    0
  );
}

function testBoardingOverridesGroundCalendarOverlap() {
  const now = "2026-09-08T14:39:00.000Z";
  const flight = createFlight({id: "test-3498", flightNumber: "3498", origin: "ORD", destination: "BIL",
    times: {startUtc: "2026-09-08T14:40:00.000Z", endUtc: "2026-09-08T17:40:00.000Z"}});
  const home = {id: "day-off", kind: "duty-free", summary: "HOME - DAY OFF", status: "confirmed",
    times: {startUtc: "2026-09-08T04:00:00.000Z", endUtc: "2026-09-09T04:00:00.000Z"}};
  for (const kind of ["duty-free", "layover"]) {
    const ground = {...home, kind, airport: "ORD"};
    const schedule = createSchedule([ground, {...ground, id: "duplicate-ground"}, flight]);
    for (const time of ["2026-09-08T14:10:00Z", now, "2026-09-08T14:40:00Z"]) {
      const result = resolveScheduleState(schedule, {now: time, boardingLeadMinutes: 30});
      assert.equal(result.mode, "BOARDING");
      assert.equal(result.event.id, flight.id, "A day-off or layover cannot hide an imminent added flight.");
    }
    assert.notEqual(resolveScheduleState(schedule, {now: "2026-09-08T14:09:59Z"}).mode, "BOARDING", "Ground context remains until boarding begins.");
    const cancelled = createSchedule([ground, {...flight, status: "cancelled"}]);
    assert.notEqual(resolveScheduleState(cancelled, {now}).event.id, flight.id);
  }
  const active = createFlight({id: "still-flying", times: {startUtc: "2026-09-08T12:00:00Z", endUtc: "2026-09-08T15:00:00Z"}});
  const schedule = createSchedule([home, active, flight]);
  assert.equal(resolveScheduleState(schedule, {now}).event.id, active.id, "Boarding for the next flight cannot replace an active flight.");
  active.times.endUtc = "2026-09-08T14:00:00Z";
  assert.equal(resolveScheduleState(schedule, {now, preferredEventId: active.id}).event.id, active.id, "An explicitly locked delayed flight keeps priority.");
}

function testClockAloneCannotConfirmArrival() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        times: {
          startUtc:
            "2026-08-04T11:30:00.000Z",
          endUtc:
            "2026-08-04T13:55:00.000Z"
        }
      })
    ]),
    { now: NOW }
  );

  assert.equal(result.mode, "TRACKING_LOST");
  assert.equal(result.state.status, "NO TRACK");
}

function testCalendarOnlyFlightBecomesDelayed() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        times: {
          source:
            "description-wall-times",
          startUtc:
            "2026-08-04T13:50:00.000Z",
          endUtc:
            "2026-08-04T16:00:00.000Z",
          endEastern:
            "2026-08-04T12:00:00.000-04:00"
        }
      })
    ]),
    {
      now: NOW,
      delayGraceMinutes: 5
    }
  );

  assert.equal(result.mode, "DELAYED");
  assert.equal(
    result.state.status,
    "DELAYED"
  );
  assert.equal(
    result.state.flight
      .departureDelayMinutes,
    10
  );

  const timeline = buildDailySchedule(
    createSchedule([result.event]),
    result,
    { now: NOW }
  );

  assert.equal(
    timeline.context,
    "DADDY'S FLIGHT TO WILKES-BARRE/SCRANTON, PENNSYLVANIA IS 10 MIN LATE"
  );
}

function testPreferredFlightWinsCalendarOverlap() {
  const firstFlight = createFlight({
    id: "first-flight",
    origin: "DFW",
    destination: "AVL",
    flightNumber: "1429",
    times: {
      startUtc:
        "2026-08-04T12:30:00.000Z",
      endUtc:
        "2026-08-04T15:30:00.000Z"
    }
  });

  const nextFlight = createFlight({
    id: "next-flight",
    origin: "AVL",
    destination: "ORD",
    flightNumber: "3407",
    times: {
      startUtc:
        "2026-08-04T13:45:00.000Z",
      endUtc:
        "2026-08-04T16:00:00.000Z"
    }
  });

  const result = resolveScheduleState(
    createSchedule([
      firstFlight,
      nextFlight
    ]),
    {
      now: NOW,
      preferredEventId: "first-flight"
    }
  );

  assert.equal(
    result.event.id,
    "first-flight"
  );
  assert.equal(
    result.state.flight.number,
    "AA 1429"
  );
}

function testEarlierFlightWinsColdStartOverlap() {
  const firstFlight = createFlight({
    id: "first-flight",
    origin: "DFW",
    destination: "AVL",
    flightNumber: "1429",
    times: {
      startUtc:
        "2026-08-04T12:30:00.000Z",
      endUtc:
        "2026-08-04T15:30:00.000Z"
    }
  });

  const nextFlight = createFlight({
    id: "next-flight",
    origin: "AVL",
    destination: "ORD",
    flightNumber: "3407",
    times: {
      startUtc:
        "2026-08-04T13:45:00.000Z",
      endUtc:
        "2026-08-04T16:00:00.000Z"
    }
  });

  const result = resolveScheduleState(
    createSchedule([
      firstFlight,
      nextFlight
    ]),
    { now: NOW }
  );

  assert.equal(
    result.event.id,
    "first-flight"
  );
}

function testPreferredDelayedFlightSurvivesScheduledEnd() {
  const delayedFlight = createFlight({
    id: "delayed-flight",
    origin: "DFW",
    destination: "AVL",
    flightNumber: "1429",
    times: {
      startUtc:
        "2026-08-04T10:00:00.000Z",
      endUtc:
        "2026-08-04T13:30:00.000Z"
    }
  });

  const overlappingFlight =
    createFlight({
      id: "overlapping-flight",
      origin: "AVL",
      destination: "ORD",
      flightNumber: "3407",
      times: {
        startUtc:
          "2026-08-04T13:45:00.000Z",
        endUtc:
          "2026-08-04T16:00:00.000Z"
      }
    });

  const result = resolveScheduleState(
    createSchedule([
      delayedFlight,
      overlappingFlight
    ]),
    {
      now: NOW,
      preferredEventId:
        "delayed-flight",
      legLockTimeoutMinutes: 8 * 60
    }
  );

  assert.equal(
    result.event.id,
    "delayed-flight"
  );
  assert.equal(result.mode, "DELAYED");
}

function testDeadheadFamilyLanguage() {
  const event = createFlight({
    isDeadhead: true,
    travelRole: "deadhead",
    destination: "ROC"
  });

  const resolved = resolveScheduleState(
    createSchedule([event]),
    { now: NOW }
  );

  const timeline = buildDailySchedule(
    createSchedule([event]),
    resolved,
    { now: NOW }
  );

  assert.equal(
    timeline.entries[0].tag,
    "DEADHEAD"
  );
  assert.equal(
    timeline.context,
    "DADDY'S RIDE TO ROCHESTER, NEW YORK IS 60 MIN LATE"
  );
  assert.equal(
    resolved.state.flight.travelRole,
    "deadhead"
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
        confirmedArrivalAt:
          "2026-08-04T13:30:00.000Z",
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

function testSameDayBaseSitIsNotLayover() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        id: "arrived-at-base",
        origin: "AVL",
        destination: "ORD",
        times: {
          startUtc:
            "2026-08-04T14:00:00.000Z",
          endUtc:
            "2026-08-04T17:24:00.000Z"
        }
      }),
      createFlight({
        id: "next-base-flight",
        origin: "ORD",
        destination: "XNA",
        times: {
          startUtc:
            "2026-08-04T22:04:00.000Z",
          endUtc:
            "2026-08-05T00:00:00.000Z"
        }
      })
    ]),
    {
      now: "2026-08-04T18:10:00.000Z",
      arrivedHoldMinutes: 45
    }
  );

  assert.equal(result.mode, "AT_BASE");
  assert.equal(result.state.status, "AT BASE");
  assert.equal(
    result.state.message,
    "DADDY IS BETWEEN FLIGHTS IN CHICAGO, ILLINOIS"
  );
  assert.equal(
    result.state.locationAirport,
    "ORD"
  );
  assert.equal(result.state.flight, null);
}

function testOvernightAtBaseRemainsLayover() {
  const result = resolveScheduleState(
    createSchedule([
      createFlight({
        id: "arrived-at-base",
        origin: "AVL",
        destination: "ORD",
        times: {
          startUtc:
            "2026-08-04T14:00:00.000Z",
          endUtc:
            "2026-08-04T17:24:00.000Z"
        }
      }),
      createFlight({
        id: "tomorrow-base-flight",
        origin: "ORD",
        destination: "XNA",
        times: {
          startUtc:
            "2026-08-05T14:00:00.000Z",
          endUtc:
            "2026-08-05T16:00:00.000Z"
        }
      })
    ]),
    {
      now: "2026-08-04T18:10:00.000Z",
      arrivedHoldMinutes: 45
    }
  );

  assert.equal(result.mode, "LAYOVER");
  assert.equal(
    result.state.locationAirport,
    "ORD"
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
    "DADDY'S FLIGHT TO WILKES-BARRE/SCRANTON, PENNSYLVANIA IS 60 MIN LATE"
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
  testBoardingWindow();
  testBoardingOverridesGroundCalendarOverlap();
  testCalendarOnlyFlightBecomesDelayed();
  testPreferredFlightWinsCalendarOverlap();
  testEarlierFlightWinsColdStartOverlap();
  testPreferredDelayedFlightSurvivesScheduledEnd();
  testDeadheadFamilyLanguage();
  testLayover();
  testRecentlyArrived();
  testClockAloneCannotConfirmArrival();
  testCancelledFlightIsIgnored();
  testAwayLocationPersistsAfterArrivalHold();
  testSameDayBaseSitIsNotLayover();
  testOvernightAtBaseRemainsLayover();
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
