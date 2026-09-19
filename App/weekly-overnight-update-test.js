"use strict";
const assert = require("node:assert/strict");
const {buildWeeklyOvernightModules} = require("./weekly-ticker");
const options = {homeAirport:"AVL",timeZone:"America/New_York",now:"2026-09-17T16:00:00Z"};
const schedule = {events:[{id:"overnight",kind:"layover",status:"confirmed",airport:"CMH",
  times:{startUtc:"2026-09-17T20:00:00Z",endUtc:"2026-09-18T12:00:00Z"}}]};
const before = JSON.stringify(schedule);
assert.deepEqual(buildWeeklyOvernightModules(schedule,options).map(day=>day.code),
  ["CMH","HOME","HOME","HOME","HOME","HOME","HOME"]);
assert.equal(JSON.stringify(schedule),before,"Rendering does not mutate the authoritative schedule.");
schedule.events[0].airport="MSN";
assert.equal(buildWeeklyOvernightModules(schedule,options)[0].code,"MSN","A mid-trip edit updates the overnight destination.");
schedule.events[0].status="cancelled";
assert.equal(buildWeeklyOvernightModules(schedule,options)[0].code,"HOME","A cancelled overnight is excluded.");
console.log("Weekly overnight update tests passed: schedule edits, cancellation and input preservation.");
