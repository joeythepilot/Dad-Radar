"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createMasterStateService} = require("./master-state-service");
const airport = require("../data/airport-catalog").lookupAirport("MSN");

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-master-"));
  let clock = Date.parse("2026-09-10T18:00:00Z");
  let calls = 0, calendarCalls = 0, missing = false, outage = false;
  let point = 0;
  const jobs = new Map();
  const event = {id: "work-1", kind: "flight", status: "confirmed", carrierCode: "MQ", flightNumber: "4038",
    origin: "ORD", destination: "MSN", liveLookupCandidates: ["ENY4038"],
    times: {startUtc: "2026-09-10T17:00:00Z", endUtc: "2026-09-10T18:02:00Z"}};
  const options = {
    file: path.join(dir, "state.json"), now: () => clock,
    console: {warn() {}, error() {}},
    setInterval(fn, delay) {const key = {}; jobs.set(key, {fn, delay}); return key;},
    clearInterval(key) {jobs.delete(key);},
    getCalendar: async () => {calendarCalls++; return {events: [event], retrievedAt: new Date(clock).toISOString()};},
    async getFlight() {
      calls++;
      await Promise.resolve();
      if (outage) return {snapshot: null, attempts: [{provider: "adsb.lol", outcome: "cooldown"}]};
      if (missing) return {snapshot: null, attempts: [{provider: "adsb.lol", outcome: "no-match"}]};
      return {attempts: [], snapshot: {provider: "adsb.lol", phase: "APPROACH", origin: "ORD", destination: "MSN",
        progressPercent: 99, retrievedAt: new Date(clock).toISOString(), position: {
          latitude: airport.latitude + .067 - point * .001, longitude: airport.longitude,
          altitudeFeet: airport.elevationFeet + 2000, altitudeTrend: "D", verticalSpeedFeetPerMinute: -600,
          groundSpeedKnots: 140, recordedAt: new Date(clock).toISOString()
        }}};
    }
  };
  let master = createMasterStateService(options);
  try {
    await master.start();
    await master.poll();
    assert.equal(master.read().resolved.mode, "LANDING");
    const count = calls, calendars = calendarCalls;
    const screens = await Promise.all(Array.from({length: 50}, async () => master.read()));
    assert(screens.every(screen => JSON.stringify(screen) === JSON.stringify(screens[0])));
    assert.equal(calls, count, "Fifty displays do not request fifty aircraft lookups");
    assert.equal(calendarCalls, calendars, "Display reads do not pull Calendar");
    screens[0].resolved.mode = "HOME";
    assert.equal(master.read().resolved.mode, "LANDING", "A viewer cannot mutate server state");
    point++; clock += 30000;
    await Promise.all([master.poll(), master.poll(), master.poll()]);
    assert.equal(calls, count + 1, "Overlapping server checks share one provider request");
    assert.equal(master.read().resolved.state.flight.actualTrack.length, 2);
    master.stop();
    assert.equal(jobs.size, 0);
    missing = true;
    master = createMasterStateService(options);
    await master.start();
    await master.poll();
    assert.equal(master.read().resolved.state.flight.actualTrack.length, 2, "Restart restores the actual track");
    for (let i = 0; i < 5; i++) {clock += 60000; await master.poll();}
    outage = true; clock += 60000; await master.poll();
    assert.equal(master.read().liveOk, false);
    assert.notEqual(master.read().resolved.mode, "ARRIVED", "An outage does not confirm arrival");
    outage = false;
    clock += 30000;
    await master.poll();
    for (let i = 0; i < 10; i++) {clock += 60000; await master.poll();}
    const arrived = master.read();
    assert.equal(arrived.resolved.mode, "ARRIVED");
    assert.equal(arrived.resolved.state.flight.arrivalEstimated, true);
    assert.equal(master.read().resolved.mode, "ARRIVED", "A newly opened display sees the same arrival");
    master.stop();
    master = createMasterStateService(options);
    await master.start(); await master.poll();
    assert.equal(master.read().resolved.mode, "ARRIVED", "Server restart preserves estimated arrival");
    assert.equal(master.read().resolved.state.flight.arrivalEstimated, true);
    // A calendar reassignment with the same event ID must retire the old route.
    event.destination = "CLT";
    await master.refreshCalendar(); await master.poll();
    assert.notEqual(master.read().resolved.state.flight?.arrivalEstimated, true);
    assert.equal(master.read().resolved.state.flight?.destination, "CLT");
    assert.equal(jobs.size, 3, "One set of timers exists independently of connected viewers");
  } finally {master.stop(); fs.rmSync(dir, {recursive: true, force: true});}
  console.log("Master state tests passed: shared polling, arrival, outages, restart, tracks and schedule edits.");
}
run().catch(error => {console.error(error); process.exitCode = 1;});
