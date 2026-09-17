"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {resolveScheduleState} = require("./schedule-state");

const settingsSource = fs.readFileSync(
  path.join(__dirname, "..", "config", "settings.js"),
  "utf8"
);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${settingsSource}\nglobalThis.__dadRadarSettings = dadRadarSettings;`, sandbox);
const settings = sandbox.__dadRadarSettings;

const commute = {
  id: "late-commute-avl-ord",
  kind: "flight",
  isCommute: true,
  travelRole: "commute",
  status: "confirmed",
  carrierCode: "UA",
  flightNumber: "1234",
  origin: "AVL",
  destination: "ORD",
  liveLookupCandidates: ["UA1234"],
  times: {
    source: "description-wall-times",
    startUtc: "2026-09-17T15:34:00.000Z",
    endUtc: "2026-09-17T16:44:00.000Z",
    endEastern: "2026-09-17T12:44:00.000-04:00"
  }
};

const laterWorkLeg = {
  id: "later-work-leg",
  kind: "flight",
  isCommute: false,
  status: "confirmed",
  flightNumber: "3917",
  origin: "ORD",
  destination: "CMH",
  liveLookupCandidates: ["AA3917", "MQ3917", "ENY3917"],
  times: {
    startUtc: "2026-09-17T22:27:00.000Z",
    endUtc: "2026-09-17T23:45:00.000Z"
  }
};

const now = "2026-09-17T18:07:00.000Z";
const result = resolveScheduleState(
  {events: [commute, laterWorkLeg]},
  {
    now,
    homeAirport: settings.homeAirport,
    baseAirport: settings.baseAirport,
    displayTimeZone: settings.displayTimeZone,
    ...settings.schedule
  }
);

assert.equal(
  result.event?.id,
  commute.id,
  "An overdue commute with no confirmed arrival must remain the unresolved leg."
);
assert.equal(
  result.mode,
  "COMMUTING_TO_BASE",
  "An overdue commute stays active as a commute until arrival is confirmed or the safety timeout expires."
);
assert.equal(result.state.flight?.origin, "AVL");
assert.equal(result.state.flight?.destination, "ORD");
assert.equal(result.state.status, "COMMUTING TO BASE");
assert.notEqual(result.mode, "HOME");
assert.notEqual(result.mode, "AT_BASE");
assert.notEqual(result.mode, "LAYOVER");

console.log("Overdue commute retention test passed.");
