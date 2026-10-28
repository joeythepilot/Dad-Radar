const assert = require('node:assert/strict');
const {parsePilotSchedule} = require('./pilot-schedule-parser');
const {resolveScheduleState, buildDailySchedule} = require('../models/schedule-state');
const {buildWeeklyOvernightModules} = require('../App/weekly-ticker');

function raw(summary) {
  return {id: summary, summary, start: {dateTime: '2026-10-28T17:00:00-04:00'},
    end: {dateTime: '2026-10-28T22:00:00-04:00'}};
}
for (const baseAirport of ['ORD', 'DFW']) {
  for (const summary of ['reserve', 'RESERVE', 'rsv', 'RSV', 'standby', 'Stand By',
    'stand-by', 'SBY', 'STBY', 'STDBY', 'Airport standby', 'STBY shift 2', 'RAP']) {
    const schedule = parsePilotSchedule({events: [raw(summary)]}, {baseAirport});
    const event = schedule.events[0];
    assert.equal(event.kind, 'reserve', summary);
    assert.equal(event.airport, baseAirport, summary);
    const options = {now: '2026-10-28T22:00:00Z', baseAirport};
    const resolved = resolveScheduleState(schedule, options);
    assert.equal(resolved.mode, 'RESERVE', summary);
    assert.equal(resolved.state.locationAirport, baseAirport, summary);
    assert.equal(buildDailySchedule(schedule, resolved, options).entries[0].kind, 'reserve');
    assert.equal(buildWeeklyOvernightModules(schedule, {now: options.now})[0].code, baseAirport);
    const continuation = resolveScheduleState({events: [...schedule.events, {
      id: 'off', kind: 'duty-free', times: {
        startUtc: '2026-11-01T04:00:00Z', endUtc: '2026-11-02T05:00:00Z'}
    }]}, {...options, now: '2026-10-31T16:00:00Z'});
    assert.equal(continuation.mode, 'RESERVE', `${summary} continues until the day off`);
    assert.equal(continuation.state.locationAirport, baseAirport);
  }
}
for (const summary of ['Reserve LAX', 'RSV LAX', 'Standby LAX', 'SBY LAX', 'STBY LAX', 'STDBY LAX']) {
  assert.equal(parsePilotSchedule([raw(summary)], {baseAirport: 'DFW'}).events[0].airport, 'LAX');
}
for (const summary of ['reserve dinner', 'RSVP', 'standby passenger', 'reservation']) {
  assert.equal(parsePilotSchedule([raw(summary)], {baseAirport: 'DFW'}).events[0].kind, 'other');
}
console.log('Reserve aliases, configured bases, explicit airports, and multi-day continuation passed.');
