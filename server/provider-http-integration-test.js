"use strict";
// Real HTTP readers and server controller; only external sources use fixtures.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-http-master-"));
const factory = require("./master-state-service");
const create = factory.createMasterStateService;
factory.createMasterStateService = options => create({...options, file: path.join(dir, "state.json")});
let aircraftCalls = 0, calendarCalls = 0, calendarError = false, radarError = false;
const airport = require("../data/airport-catalog").lookupAirport("MSN");
require("./calendar-service").getUpcomingEvents = async () => {
  calendarCalls++;
  if (calendarError) throw new Error("Fixture Calendar outage");
  return {retrievedAt: new Date().toISOString(), events: [{id: "test-1", kind: "flight", status: "confirmed",
    origin: "ORD", destination: "MSN", carrierCode: "MQ", flightNumber: "4038", liveLookupCandidates: ["ENY4038"],
    times: {startUtc: new Date(Date.now() - 3600000).toISOString(), endUtc: new Date(Date.now() + 600000).toISOString()}}]};
};
require("./adsb-lol-service").getLiveFlightSnapshot = async () => {
  aircraftCalls++;
  return {provider: "adsb.lol", ident: "ENY4038", phase: "APPROACH", origin: "ORD", destination: "MSN", progressPercent: 99,
    retrievedAt: new Date().toISOString(), position: {latitude: airport.latitude, longitude: airport.longitude,
      altitudeFeet: airport.elevationFeet + 800, groundSpeedKnots: 140, altitudeTrend: "D", recordedAt: new Date().toISOString()}};
};
require("./flightradar24-service").getLiveFlightSnapshot = async () => {throw new Error("Paid fallback should not be needed");};
require("./flightaware-route-service").getFiledRoute = async () => null;
require("./weather-radar-service").getRadarImage = async () => {
  if (radarError) throw new Error("Fixture radar outage");
  return {buffer: Buffer.from("fixture"), contentType: "image/png", cached: false};
};
const {app, masterState} = require("./index");
(async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + "/api/state")).status, 503);
    assert.equal(aircraftCalls, 0);
    await masterState.start(); await masterState.poll();
    const count = aircraftCalls, schedules = calendarCalls;
    const screens = await Promise.all(Array.from({length: 30}, async () => {
      const response = await fetch(base + "/api/state");
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/);
      return response.json();
    }));
    assert(screens.every(screen => screen.resolved.mode === "LANDING"));
    assert(screens.every(screen => screen.revision === screens[0].revision));
    await fetch(base + "/api/calendar/upcoming?days=60");
    const legacy = await fetch(base + "/api/flights/lookup", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({origin: "PHX", destination: "CLT", liveLookupCandidates: ["AA3009"]})});
    assert.equal(legacy.status, 410, "Old clients cannot multiply provider calls or change the tracked flight");
    assert.equal(aircraftCalls, count);
    assert.equal(calendarCalls, schedules);
    assert.equal((await fetch(base + "/api/weather/radar")).status, 200);
    radarError = true;
    assert.equal((await fetch(base + "/api/weather/radar")).status, 204);
    assert.equal((await (await fetch(base + "/api/state")).json()).resolved.mode, "LANDING");
    calendarError = true;
    await masterState.refreshCalendar();
    const held = await (await fetch(base + "/api/state")).json();
    assert.equal(held.calendarOk, false);
    assert.equal(held.resolved.mode, "LANDING");
    for (const privatePath of ["/runtime/master-state.json", "/server/master-state-service.js"]) {
      assert.equal((await fetch(base + privatePath)).status, 404);
    }
  } finally {
    masterState.stop(); await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, {recursive: true, force: true});
  }
  console.log("Provider HTTP integration tests passed: read-only state and no per-device lookups.");
})().catch(error => {console.error(error); process.exitCode = 1;});
