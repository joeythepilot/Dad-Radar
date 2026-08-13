const assert = require("node:assert/strict");

const {
  DISPLAY_TIME_ZONE,
  parsePilotEvent,
  parsePilotSchedule
} = require("./pilot-schedule-parser");

function createEvent(overrides = {}) {
  return {
    id: "test-event",
    status: "confirmed",
    summary: "",
    description: "",
    start: {
      dateTime:
        "2026-08-03T22:18:00-04:00"
    },
    end: {
      dateTime:
        "2026-08-04T01:18:00-04:00"
    },
    updated:
      "2026-08-01T12:00:00.000Z",
    ...overrides
  };
}

function testRosterFlightTimeZones() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 4140 ORD->AVP",
      description:
        "Flight: 4140 Stations: ORD->AVP Time: 2026-08-03T22:18:00 - 2026-08-04T01:18:00"
    })
  );

  assert.equal(result.kind, "flight");
  assert.equal(result.isCommute, false);
  assert.equal(result.flightNumber, "4140");
  assert.equal(result.origin, "ORD");
  assert.equal(result.destination, "AVP");
  assert.equal(result.route, "ORD\u2192AVP");

  assert.deepEqual(
    result.liveLookupCandidates,
    [
      "AA4140",
      "MQ4140",
      "ENY4140"
    ]
  );

  assert.equal(
    result.times.source,
    "description-wall-times"
  );

  assert.equal(
    result.times.departureZone,
    "America/Chicago"
  );

  assert.equal(
    result.times.arrivalZone,
    "America/New_York"
  );

  assert.equal(
    result.times.startEastern,
    "2026-08-03T23:18:00.000-04:00"
  );

  assert.equal(
    result.times.endEastern,
    "2026-08-04T01:18:00.000-04:00"
  );

  assert.equal(
    result.times.needsTimeZoneVerification,
    false
  );
}

function testManualCommute() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "COMMUTE UA1234 AVL->ORD",
      description: ""
    })
  );

  assert.equal(result.kind, "flight");
  assert.equal(result.isCommute, true);
  assert.equal(result.carrierCode, "UA");
  assert.equal(result.flightNumber, "1234");
  assert.equal(result.origin, "AVL");
  assert.equal(result.destination, "ORD");

  assert.deepEqual(
    result.liveLookupCandidates,
    ["UA1234"]
  );

  assert.equal(
    result.requiresFlightVerification,
    false
  );

  assert.equal(
    result.times.source,
    "calendar-event"
  );
}

function testDeadheadSummary() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Deadhead AA2456 ORD->ROC",
      description: ""
    })
  );

  assert.equal(result.kind, "flight");
  assert.equal(result.isCommute, false);
  assert.equal(result.isDeadhead, true);
  assert.equal(
    result.travelRole,
    "deadhead"
  );
  assert.equal(result.carrierCode, "AA");
  assert.equal(result.flightNumber, "2456");
  assert.equal(result.origin, "ORD");
  assert.equal(result.destination, "ROC");
  assert.deepEqual(
    result.liveLookupCandidates,
    ["AA2456", "MQ2456", "ENY2456"]
  );
  assert.equal(
    result.requiresFlightVerification,
    false
  );
}

function testDeadheadDescriptionMarker() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 1429 DFW->AVL",
      description:
        "Deadhead\nFlight: 1429 Stations: DFW->AVL Time: 2026-08-04T13:42:00 - 2026-08-04T16:35:00"
    })
  );

  assert.equal(result.isDeadhead, true);
  assert.equal(
    result.travelRole,
    "deadhead"
  );
  assert.equal(result.flightNumber, "1429");
  assert.equal(result.origin, "DFW");
  assert.equal(result.destination, "AVL");
}

function testLayover() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Layover AVP (17h 16m)",
      description:
        "Airport: AVP Duration: 17h 16m"
    })
  );

  assert.equal(result.kind, "layover");
  assert.equal(result.airport, "AVP");
  assert.equal(
    result.durationText,
    "17h 16m"
  );
}

function testMissingAirportTimeZone() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 9999 XYZ->AVL",
      description:
        "Flight: 9999 Stations: XYZ->AVL Time: 2026-08-10T09:00:00 - 2026-08-10T11:00:00"
    })
  );

  assert.equal(result.kind, "flight");

  assert.equal(
    result.times.needsTimeZoneVerification,
    true
  );

  assert.deepEqual(
    result.times.missingAirportTimeZones,
    ["XYZ"]
  );
}

function testGsoTimeZoneIsKnown() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 3744 ORD->GSO",
      description:
        "Flight: 3744 Stations: ORD->GSO Time: 2026-08-04T10:00:00 - 2026-08-04T13:00:00"
    })
  );

  assert.equal(
    result.times.needsTimeZoneVerification,
    false
  );
  assert.equal(
    result.times.missingAirportTimeZones,
    undefined
  );
}

function testBilTimeZoneIsKnown() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 3429 DFW->BIL",
      description:
        "Flight: 3429 Stations: DFW->BIL Time: 2026-08-04T11:11:00 - 2026-08-04T12:31:00"
    })
  );

  assert.equal(
    result.times.departureZone,
    "America/Chicago"
  );
  assert.equal(
    result.times.arrivalZone,
    "America/Denver"
  );
  assert.equal(
    result.times.needsTimeZoneVerification,
    false
  );
}

function testGlobalCatalogTimeZoneIsKnown() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "Flight 5555 SEA->MCI",
      description:
        "Flight: 5555 Stations: SEA->MCI Time: 2026-08-04T09:00:00 - 2026-08-04T14:30:00"
    })
  );

  assert.equal(
    result.times.departureZone,
    "America/Los_Angeles"
  );
  assert.equal(
    result.times.arrivalZone,
    "America/Chicago"
  );
  assert.equal(
    result.times.needsTimeZoneVerification,
    false
  );
}

function testFullSchedule() {
  const calendarData = {
    calendarId: "pilot-schedule",
    calendarTimeZone:
      "America/New_York",
    retrievedAt:
      "2026-08-04T12:00:00.000Z",
    events: [
      createEvent({
        summary:
          "Flight 4140 ORD->AVP",
        description:
          "Flight: 4140 Stations: ORD->AVP Time: 2026-08-03T22:18:00 - 2026-08-04T01:18:00"
      }),
      createEvent({
        id: "layover-event",
        summary:
          "Layover AVP (17h 16m)",
        description:
          "Airport: AVP Duration: 17h 16m"
      })
    ]
  };

  const result =
    parsePilotSchedule(calendarData);

  assert.equal(
    result.displayTimeZone,
    DISPLAY_TIME_ZONE
  );

  assert.equal(result.events.length, 2);
  assert.equal(
    result.events[0].kind,
    "flight"
  );
  assert.equal(
    result.events[1].kind,
    "layover"
  );
}

function runTests() {
  testRosterFlightTimeZones();
  testManualCommute();
  testDeadheadSummary();
  testDeadheadDescriptionMarker();
  testLayover();
  testMissingAirportTimeZone();
  testGsoTimeZoneIsKnown();
  testBilTimeZoneIsKnown();
  testGlobalCatalogTimeZoneIsKnown();
  testFullSchedule();

  console.log(
    "Pilot schedule parser tests passed."
  );
}

runTests();
