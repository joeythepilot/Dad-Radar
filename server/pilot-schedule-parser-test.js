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

function testEditedCciCalendarTimesOverrideStaleDescription() {
  const description = 'SEQ#: 6663 Flight#: 9868 Stations: CMI→ORD Local Time: Fri, Oct 16, 2026 17:00 - Fri, Oct 16, 2026 17:55 UTC Time: Fri, Oct 16, 2026 22:00 UTC - Fri, Oct 16, 2026 22:55 UTC';
  const event = createEvent({summary: 'FLT 9868', description,
    start: {dateTime: '2026-10-16T14:30:00-04:00'}, end: {dateTime: '2026-10-16T15:25:00-04:00'}});
  const edited = parsePilotEvent(event);
  assert.equal(edited.times.startUtc, '2026-10-16T18:30:00.000Z', 'A Calendar time edit must override stale embedded CCI text');
  assert.equal(edited.times.endUtc, '2026-10-16T19:25:00.000Z');
  assert.equal(edited.route, 'CMI→ORD', 'Keep imported flight identity while honoring its edited times');
  assert.equal(edited.times.source, 'calendar-event-edited');
  const untouched = parsePilotEvent({...event, start:{dateTime:'2026-10-16T17:00:00-04:00'}, end:{dateTime:'2026-10-16T17:55:00-04:00'}});
  assert.equal(untouched.times.startUtc, '2026-10-16T22:00:00.000Z', 'Unmodified single-zone imports still use airport-correct explicit UTC');
  assert.equal(untouched.times.endUtc, '2026-10-16T22:55:00.000Z');
  const utc = parsePilotEvent({...event, start:{dateTime:'2026-10-16T22:00:00Z'}, end:{dateTime:'2026-10-16T22:55:00Z'}});
  assert.equal(utc.times.source, 'description-utc-times', 'Instant-equivalent headers are not mistaken for edits');
  const endOnly = parsePilotEvent({...event, start:{dateTime:'2026-10-16T17:00:00-04:00'}, end:{dateTime:'2026-10-16T19:00:00-04:00'}});
  assert.equal(endOnly.times.startUtc, '2026-10-16T22:00:00.000Z', 'Resizing the end must preserve the untouched start timezone correction');
  assert.equal(endOnly.times.endUtc, '2026-10-16T23:00:00.000Z');
  for (const start of ['2026-10-16T21:00:00Z', '2026-10-16T16:00:00-05:00']) {
    const normalized = parsePilotEvent({...event,start:{dateTime:start,timeZone:'America/New_York'},end:{dateTime:'2026-10-16T21:55:00Z',timeZone:'America/New_York'}});
    assert.equal(normalized.times.startUtc,'2026-10-16T22:00:00.000Z','Equivalent original header representations preserve the CCI correction');
  }
  const calendarZone = parsePilotSchedule({calendarTimeZone:'America/New_York',events:[{...event,
    start:{dateTime:'2026-10-16T21:00:00Z'},end:{dateTime:'2026-10-16T21:55:00Z'}}]});
  assert.equal(calendarZone.events[0].times.startUtc,'2026-10-16T22:00:00.000Z','Calendar timezone metadata normalizes headers when per-event zone is absent');
  const fold = parsePilotEvent({...event, description:'Flight#: 9868 Stations: ORD→CMI UTC Time: Sun, Nov 1, 2026 06:30 UTC - Sun, Nov 1, 2026 08:30 UTC',
    start:{dateTime:'2026-11-01T01:30:00-06:00',timeZone:'America/Chicago'},end:{dateTime:'2026-11-01T02:30:00-06:00',timeZone:'America/Chicago'}});
  assert.equal(fold.times.startUtc,'2026-11-01T07:30:00.000Z','An explicitly airport-zoned repeated-hour edit must retain its actual offset');
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

function testImportedReserveAndLeaveDates() {
  const {resolveScheduleState}=require('../models/schedule-state');
  const {buildWeeklyOvernightModules}=require('../App/weekly-ticker');
  const parsed=(summary,start,end)=>parsePilotEvent(createEvent({id:`${summary}-${start}`,summary,
    start:{dateTime:start},end:{dateTime:end}}));
  // Actual connected-calendar shapes, with private event identifiers omitted.
  const reserve=parsed('RESERVE ORD','2026-10-14T13:00:00-04:00','2026-10-15T00:55:00-04:00');
  const off=parsed('Duty free period','2026-10-17T00:00:00-04:00','2026-10-17T23:59:59-04:00');
  const vacation=parsed('Vacation','2026-10-17T00:00:00-04:00','2026-10-23T23:58:59-04:00');
  const schedule={events:[reserve,off]};
  const wheels=(events,now='2026-10-14T21:00:00Z')=>buildWeeklyOvernightModules({events},{now}).map(module=>module.code);
  assert.equal(reserve.reserveType,'BLOCK','A daily Reserve ORD does not invent a RAP assignment');
  for(const day of [14,15,16]) {
    assert.equal(resolveScheduleState(schedule,{now:`2026-10-${day}T18:00:00Z`}).mode,'RESERVE',
      `The imported daily reserve continues on October ${day}`);
  }
  assert.equal(resolveScheduleState(schedule,{now:'2026-10-17T18:00:00Z'}).mode,'HOME');
  assert.deepEqual(wheels([reserve,off]).slice(0,5),['ORD','ORD','HOME','HOME','UNKN'],
    'The final reserve night before an explicit day off predicts HOME');
  assert.deepEqual(wheels([reserve,off,vacation]),['ORD','ORD','HOME','HOME','HOME','HOME','HOME']);
  assert.deepEqual(wheels([vacation],'2026-10-22T18:00:00Z').slice(0,3),['HOME','HOME','UNKN'],
    'The final vacation date is included without extending leave');
  const laterOff=parsed('Duty free period','2026-10-20T00:00:00-04:00','2026-10-20T23:59:59-04:00');
  assert.deepEqual(wheels([reserve,laterOff]),['ORD','ORD','ORD','ORD','ORD','HOME','HOME'],
    'An imported midnight-start day off bounds up to five continuation dates');
  const longBlock=parsed('Reserve ORD','2026-10-14T13:00:00-04:00','2026-10-16T00:55:00-04:00');
  assert.notEqual(resolveScheduleState({events:[longBlock,off]},{now:'2026-10-16T18:00:00Z'}).mode,'RESERVE',
    'A timed multi-day block does not imply reserve beyond its explicit coverage');
  assert.equal(wheels([longBlock,off])[2],'UNKN');
  const allDayBlock=parsePilotEvent(createEvent({summary:'Reserve ORD',start:{date:'2026-10-14'},end:{date:'2026-10-15'}}));
  assert.equal(wheels([allDayBlock,off])[1],'UNKN','An all-day block retains its explicit end');
  assert.notEqual(resolveScheduleState({events:[allDayBlock,off]},{now:'2026-10-15T18:00:00Z'}).mode,'RESERVE');
  const assigned=parsed('FLIGHT 1234 ORD->DFW','2026-10-15T11:00:00-04:00','2026-10-15T15:00:00-04:00');
  assert.equal(resolveScheduleState({events:[reserve,assigned,off]},{now:'2026-10-15T18:00:00Z'}).event.id,assigned.id,
    'Assigned flying supersedes inferred reserve');
  assert.deepEqual(wheels([reserve,assigned,off]).slice(0,4),['ORD','DFW','UNKN','HOME']);
}

function testOverlappingRapAndStandby() {
  const {resolveScheduleState,buildDailySchedule}=require('../models/schedule-state');
  const {buildDutyCardView}=require('../App/daily-schedule-layout');
  const {buildWeeklyOvernightModules}=require('../App/weekly-ticker');
  // Explicit UTC is synthetic normalized test data, not an interpretation of
  // MobileCCI's floating ICS times. Preserve the two separate source events.
  const rap=createEvent({id:'overlap-rap',summary:'RAP',
    start:{dateTime:'2026-10-15T09:00:00Z'},end:{dateTime:'2026-10-15T23:00:00Z'}});
  const stby=createEvent({id:'overlap-stby',summary:'STBY',
    start:{dateTime:'2026-10-15T09:00:00Z'},end:{dateTime:'2026-10-15T16:59:59Z'}});
  for(const records of [[rap,stby],[stby,rap]]) {
    const schedule=parsePilotSchedule({events:records});
    assert.equal(schedule.events.length,2,'Keep both overlapping calendar records');
    assert.equal(schedule.events.find(event=>event.id===stby.id).reserveType,'STANDBY');
    const options={now:'2026-10-15T12:00:00Z',displayTimeZone:'UTC'};
    const resolved=resolveScheduleState(schedule,options);
    assert.equal(resolved.mode,'RESERVE');
    assert.equal(resolved.event.id,stby.id,'Assigned standby takes precedence during the overlap');
    const daily=buildDailySchedule(schedule,resolved,options);
    assert.equal(daily.entries.length,2,'Duty data retains both RAP and standby');
    assert.deepEqual(daily.entries.map(entry=>[entry.id,entry.tag,entry.status]),
      [[stby.id,'STBY','current'],[rap.id,'RAP','upcoming']]);
    const card=buildDutyCardView(daily,1920,{rowCapacity:5,ruledSlots:5});
    assert.deepEqual(card.rows.map(row=>row.flight),['STBY','RAP'],
      'The physical duty card keeps both shifts, with standby first');
    assert.equal(card.rows[0].arrivalTime,'4:59 PM');
    assert.equal(card.rows[1].arrivalTime,'11:00 PM');
    assert.equal(resolveScheduleState(schedule,{...options,now:'2026-10-15T17:00:00Z'}).event.id,rap.id,
      'After standby ends, the still-active RAP remains reserve duty');
    assert.equal(buildWeeklyOvernightModules(schedule,{now:options.now})[0].code,'ORD');
    assert.deepEqual(schedule.events.map(event=>event.id),records.map(event=>event.id),
      'Presentation priority must not mutate or deduplicate the source schedule');
  }
  for(const summary of ['STBY','stby','StBy']) {
    assert.equal(parsePilotEvent({...stby,summary}).reserveType,'STANDBY');
  }
  for(const summary of ['Stand by','Stand-by','Airport Standby','STBY 1','Standby shift 2','SBY ORD 2',
    'STBY1','AirportStandby','Standby shift 4','Stand  by','Standby 2 ORD','STBY #2']) {
    const event=parsePilotEvent({...stby,summary});
    assert.equal(event.reserveType,'STANDBY',`${summary} is reserve duty`);
    assert.equal(resolveScheduleState({events:[event]},{now:'2026-10-15T12:00:00Z'}).mode,'RESERVE');
  }
  assert.equal(parsePilotEvent({...stby,summary:'STBY training'}).kind,'other');

  const calendarStandby=createEvent({id:'calendar-standby',summary:'STBY ORD',
    start:{dateTime:'2026-10-15T10:00:00-04:00'},end:{dateTime:'2026-10-15T18:00:00-04:00'}});
  const importedStandby=parsePilotEvent(calendarStandby);
  assert.equal(importedStandby.reserveType,'STANDBY','Recognize the observed connected-calendar title');
  assert.equal(importedStandby.airport,'ORD');
  assert.equal(importedStandby.times.startUtc,'2026-10-15T14:00:00.000Z');
  assert.equal(importedStandby.times.endUtc,'2026-10-15T22:00:00.000Z');
  assert.equal(parsePilotEvent({...stby,summary:'STBY DFW'}).airport,'DFW');

  const laterRap={...rap,start:{dateTime:'2026-10-15T10:00:00Z'}};
  const overlapping=parsePilotSchedule({events:[laterRap,stby]});
  assert.equal(resolveScheduleState(overlapping,{now:'2026-10-15T12:00:00Z'}).event.id,stby.id,
    'A later RAP start cannot displace an active assigned standby shift');

  const laterStandby={...stby,start:{dateTime:'2026-10-15T10:00:00Z'}};
  const other=createEvent({id:'other',summary:'Briefing',start:rap.start,end:rap.end});
  for (const records of [[rap,laterStandby],[rap,other,stby],[stby,other,rap]]) {
    const schedule=parsePilotSchedule({events:records});
    const options={now:'2026-10-15T12:00:00Z',displayTimeZone:'UTC'};
    const daily=buildDailySchedule(schedule,resolveScheduleState(schedule,options),options);
    const before=JSON.stringify(daily.entries);
    const card=buildDutyCardView(daily,1920,{rowCapacity:5,ruledSlots:5});
    assert.equal(card.rows.find(row=>['RAP','STBY'].includes(row.flight)).flight,'STBY',
      'Active standby leads RAP even with different starts or interleaved records');
    assert.equal(JSON.stringify(daily.entries),before,'Card ordering must not mutate duty data');
  }

  const flight=createEvent({id:'assigned-flight',summary:'Flight 4140 ORD->AVP',
    start:{dateTime:'2026-10-15T12:00:00Z'},end:{dateTime:'2026-10-15T14:00:00Z'}});
  const assigned=parsePilotSchedule({events:[rap,stby,flight]});
  const flightOptions={now:'2026-10-15T13:00:00Z',displayTimeZone:'UTC'};
  const flying=resolveScheduleState(assigned,flightOptions);
  assert.equal(flying.event.id,flight.id,'Assigned flying supersedes both reserve records');
  assert.equal(buildWeeklyOvernightModules(assigned,{now:flightOptions.now})[0].code,'AVP',
    'Assigned flying supersedes the predicted ORD overnight');
  assert.equal(buildDailySchedule(assigned,flying,flightOptions).entries.length,3,
    'Flight presentation does not remove either source reserve record');
}

function runTests() {
  testOverlappingRapAndStandby();
  testImportedReserveAndLeaveDates();
  const rap = parsePilotEvent(createEvent({summary:'RAP',start:{dateTime:'2026-10-01T09:00:00-05:00'},end:{dateTime:'2026-10-01T17:00:00-05:00'}}));
  assert.equal(rap.kind,'reserve');
  assert.equal(rap.airport,'ORD');
  assert.equal(rap.reserveType,'RAP');
  assert.equal(rap.allDay,false);
  assert.equal(rap.times.startUtc,'2026-10-01T14:00:00.000Z');
  for (const label of ['Standby','SBY','standby','sby']) {
    const standby=parsePilotEvent(createEvent({summary:label,start:{dateTime:'2026-10-13T09:00:00-05:00'},end:{dateTime:'2026-10-13T17:00:00-05:00'}}));
    assert.equal(standby.kind,'reserve',label+' is reserve duty');
    assert.equal(standby.reserveType,'STANDBY');
    assert.equal(standby.airport,'ORD');
    assert.equal(standby.allDay,false);
  }
  assert.equal(parsePilotEvent(createEvent({summary:'Standby training'})).kind,'other');
  const block = parsePilotEvent(createEvent({summary:'Reserve ORD',start:{date:'2026-10-01'},end:{date:'2026-10-04'}}));
  assert.equal(block.kind,'reserve');
  assert.equal(block.airport,'ORD');
  assert.equal(block.allDay,true);
  assert.equal(block.times.endUtc,'2026-10-04T04:00:00.000Z');
  for (const label of ['Vacation','VAC','vacation','vac']) {
    const leave=parsePilotEvent(createEvent({summary:label,start:{date:'2026-10-20'},end:{date:'2026-10-23'}}));
    assert.equal(leave.kind,'duty-free',label+' should follow day-off HOME semantics');
    assert.equal(leave.leaveType,'vacation');
    assert.equal(leave.allDay,true);
  }
  assert.equal(parsePilotEvent(createEvent({summary:'Vacation review'})).kind,'other');
  const dutyFree = parsePilotEvent(createEvent({summary:'Duty free period',start:{date:'2026-10-02'},end:{date:'2026-10-04'}}));
  assert.equal(dutyFree.kind,'duty-free');
  assert.equal(dutyFree.allDay,true,'An imported multi-day Duty Free Period retains its calendar-date scope.');
  assert.equal(dutyFree.times.startUtc,'2026-10-02T04:00:00.000Z');
  assert.equal(dutyFree.times.endUtc,'2026-10-04T04:00:00.000Z');
  assert.equal(parsePilotEvent(createEvent({summary:'RAP review'})).kind,'other');
  assert.equal(parsePilotEvent(createEvent({summary:'Reserve'})).kind,'reserve');
  require('./reserve-base-alias-test');
  testEditedCciCalendarTimesOverrideStaleDescription();
  const cci = createEvent({summary: 'FLT 3632', start:{dateTime:'2026-09-27T22:37:00-04:00'}, end:{dateTime:'2026-09-27T23:58:00-04:00'}, description: 'SEQ#: 18073 Flight#: 3632 Stations: ORD→EVV Local Time: Sun, Sep 27, 2026\n22:37 - Sun, Sep 27, 2026 23:58 UTC Time: Mon, Sep 28, 2026 03:37 UTC - Mon,\nSep 28, 2026 04:58 UTC'});
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
