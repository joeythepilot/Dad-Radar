"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
async function run() {
  const urls = [], timers = [], states = [], events = [];
  let failure = false;
  const payload = {ok: true, calendarOk: true, liveOk: true, calendarAt: "2026-09-10T18:00:00Z",
    liveAt: "2026-09-10T18:01:00Z", resolved: {mode: "ARRIVED", state: {status: "ARRIVED",
      flight: {arrivalEstimated: true, actualTrack: [{latitude: 43, longitude: -89}]}}}};
  const context = {location: {protocol: "https:"}, console, Date, Promise,
    setInterval(fn) {timers.push(fn); return timers.length;}, clearInterval() {},
    setDadRadarState(state, mode) {states.push({state, mode});},
    CustomEvent: class {constructor(type, value) {this.type = type; this.detail = value.detail;}},
    dispatchEvent(event) {events.push(event);},
    fetch: async url => {urls.push(url); if (failure) throw new Error("Offline"); return {ok: true, json: async () => payload};},
    localStorage: {getItem() {return null;}, setItem() {throw new Error("Viewer must not save flight decisions");}}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "calendar-state-controller.js"), "utf8"), context);
  await context.startCalendarStateController();
  await Promise.all([context.refreshCalendarState(), context.refreshLiveFlightState()]);
  assert.deepEqual(urls, ["/api/state", "/api/state"]);
  assert.equal(timers.length, 1);
  assert.equal(states.at(-1).mode, "ARRIVED");
  assert.equal(states.at(-1).state.flight.arrivalEstimated, true);
  failure = true;
  await context.refreshCalendarState();
  assert.equal(states.length, 1, "Repeated reads and outages do not restart map animation or change flight state");
  assert.equal(events.at(-1).detail.ok, false);
  console.log("Master display tests passed.");
}
run().catch(error => {console.error(error); process.exitCode = 1;});
