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

function testManualFltAlias() {
  const baseline = parsePilotEvent(createEvent({summary: "Flight 3553 MIA->MSY"}));
  for (const summary of ["FLT 3553 MIA->MSY", "flt 3553 mia -> msy", "FLT 3553 MIA→MSY"]) {
    const flight = parsePilotEvent(createEvent({summary}));
    assert.equal(flight.kind, "flight", `${summary} must select a flight rather than a generic duty entry`);
    for (const field of ["flightNumber", "origin", "destination", "route", "carrierCode", "marketingCarrierCode", "isCommute", "isDeadhead"])
      assert.deepEqual(flight[field], baseline[field], `FLT alias preserves ${field}`);
    assert.deepEqual(flight.times, baseline.times, "FLT alias retains calendar timing");
    assert.deepEqual(flight.liveLookupCandidates, baseline.liveLookupCandidates, "FLT alias preserves operating-flight matching");
  }
  for (const summary of ["FLT 3553", "FLT 3553 MIA", "FLT briefing"])
    assert.equal(parsePilotEvent(createEvent({summary})).kind, "other", "An incomplete FLT title cannot fabricate a route");
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

function testMisspelledCommuteMarker() {
  const result = parsePilotEvent(
    createEvent({
      summary:
        "COMMMUTE AA3963 AVL->ORD",
      description: "",
      start: {
        dateTime:
          "2026-09-17T15:00:00-04:00"
      },
      end: {
        dateTime:
          "2026-09-17T17:00:00-04:00"
      }
    })
  );

  assert.equal(
    result.kind,
    "flight",
    "A common extra-M typo in COMMUTE must still produce a flight."
  );
  assert.equal(result.isCommute, true);
  assert.equal(result.carrierCode, "AA");
  assert.equal(result.flightNumber, "3963");
  assert.equal(result.origin, "AVL");
  assert.equal(result.destination, "ORD");
}

function testNoteDrivenCommute() {
  const result = parsePilotEvent(
    createEvent({
      summary: "Commute",
      description:
        "Commute\nFlight: UA 1234 Stations: AVL->ORD Time: 2026-08-04T11:34:00 - 2026-08-04T12:44:00"
    })
  );

  assert.equal(result.kind, "flight");
  assert.equal(result.isCommute, true);
  assert.equal(result.travelRole, "commute");
  assert.equal(result.carrierCode, "UA");
  assert.equal(result.flightNumber, "1234");
  assert.equal(result.origin, "AVL");
  assert.equal(result.destination, "ORD");
  assert.deepEqual(
    result.liveLookupCandidates,
    ["UA1234"]
  );
  assert.equal(
    result.times.source,
    "description-wall-times"
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
  const rap = parsePilotEvent(createEvent({summary:'RAP',start:{dateTime:'2026-10-01T09:00:00-05:00'},end:{dateTime:'2026-10-01T17:00:00-05:00'}}));
  assert.equal(rap.kind,'reserve');
  assert.equal(rap.airport,'ORD');
  assert.equal(rap.reserveType,'RAP');
  assert.equal(rap.allDay,false);
  assert.equal(rap.times.startUtc,'2026-10-01T14:00:00.000Z');
  const block = parsePilotEvent(createEvent({summary:'Reserve ORD',start:{date:'2026-10-01'},end:{date:'2026-10-04'}}));
  assert.equal(block.kind,'reserve');
  assert.equal(block.airport,'ORD');
  assert.equal(block.allDay,true);
  assert.equal(block.times.endUtc,'2026-10-04T04:00:00.000Z');
  const dutyFree = parsePilotEvent(createEvent({summary:'Duty free period',start:{date:'2026-10-02'},end:{date:'2026-10-04'}}));
  assert.equal(dutyFree.kind,'duty-free');
  assert.equal(dutyFree.allDay,true,'An imported multi-day Duty Free Period retains its calendar-date scope.');
  assert.equal(dutyFree.times.startUtc,'2026-10-02T04:00:00.000Z');
  assert.equal(dutyFree.times.endUtc,'2026-10-04T04:00:00.000Z');
  assert.equal(parsePilotEvent(createEvent({summary:'RAP review'})).kind,'other');
  assert.equal(parsePilotEvent(createEvent({summary:'Reserve'})).kind,'other');
  const cci = createEvent({summary: 'FLT 3632', description: 'SEQ#: 18073 Flight#: 3632 Stations: ORD→EVV Local Time: Sun, Sep 27, 2026\n22:37 - Sun, Sep 27, 2026 23:58 UTC Time: Mon, Sep 28, 2026 03:37 UTC - Mon,\nSep 28, 2026 04:58 UTC'});
  const flight = parsePilotEvent(cci);
  assert.equal(flight.kind, 'flight');
  assert.equal(flight.route, 'ORD→EVV');
  assert.equal(flight.flightNumber, '3632');
  assert.equal(flight.times.startUtc, '2026-09-28T03:37:00.000Z');
  assert.equal(flight.times.endUtc, '2026-09-28T04:58:00.000Z');
  assert.deepEqual(flight.liveLookupCandidates, ['AA3632', 'MQ3632', 'ENY3632']);
  assert.equal(parsePilotEvent(createEvent({summary:'Layover in EVV'})).airport, 'EVV');
  assert.equal(parsePilotEvent(createEvent({summary:'Layover in EVV'})).kind, 'layover');
  assert.equal(parsePilotEvent(createEvent({summary:'FLT 3632'})).kind, 'other');
  assert.equal(parsePilotEvent({...cci, summary:'FLT 9999'}).kind, 'other', 'Do not associate mismatched flight numbers');
  const deadheadCci = {...cci, description:cci.description.replace(/3632/g, '3679')};
  for (const summary of ['DHD FLT3679', 'DHD FLT 3679']) {
    const deadhead = parsePilotEvent({...deadheadCci, summary});
    assert.equal(deadhead.kind, 'flight');
    assert.equal(deadhead.isDeadhead, true);
    assert.equal(deadhead.travelRole, 'deadhead');
    assert.equal(deadhead.flightNumber, '3679');
    assert.equal(deadhead.route, 'ORD→EVV');
    assert.deepEqual(deadhead.liveLookupCandidates, ['AA3679', 'MQ3679', 'ENY3679']);
    assert.equal(deadhead.times.startUtc, '2026-09-28T03:37:00.000Z');
  }
  assert.equal(parsePilotEvent({...deadheadCci, summary:'FLT3679'}).kind, 'flight');
  assert.equal(parsePilotEvent({...deadheadCci, summary:'DHD FLT9999'}).kind, 'other', 'Do not pair a deadhead title with another flight number');
  assert.equal(parsePilotEvent(createEvent({summary:'DHD FLT3679'})).kind, 'other', 'A shorthand title needs flight details');
  assert.equal(parsePilotEvent({...cci, description:cci.description.replace('04:58 UTC', '02:58 UTC')}).kind, 'other', 'Reject reversed explicit UTC times');
  const weekly = require('../App/weekly-ticker');
  const overnight = parsePilotEvent(createEvent({summary:'Layover in EVV',start:{dateTime:'2026-09-27T23:58:00-04:00'},end:{dateTime:'2026-09-28T15:53:00-04:00'}}));
  assert.equal(weekly.buildWeeklyOvernightModules({events:[overnight]}, {now:'2026-09-26T23:00:00Z'})[1].code, 'EVV', 'Imported overnight reaches Sunday wheel');
  testManualFltAlias();
  testRosterFlightTimeZones();
  testManualCommute();
  testMisspelledCommuteMarker();
  testNoteDrivenCommute();
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
