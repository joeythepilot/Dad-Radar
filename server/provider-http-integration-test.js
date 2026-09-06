"use strict";

// Exercise the real HTTP routes and provider orchestrator. Only external
// Calendar, telemetry, filed-route and radar calls are replaced with fixtures.
const assert = require("node:assert/strict");
const adsb = require("./adsb-lol-service");
const fr24 = require("./flightradar24-service");
const flightaware = require("./flightaware-route-service");
const weather = require("./weather-radar-service");
const calendar = require("./calendar-service");
let adsbAvailable = true;
let fr24Available = false;
let radarError = false;
let calendarError = false;
let adsbCalls = 0;
let fr24Calls = 0;
const filedRoute = {
  provider: "flightaware",
  routeText: "PHX TEST CLT",
  fixes: [{ name: "TEST", latitude: 34, longitude: -100 }]
};
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
adsb.getLiveFlightSnapshot = async () => {
  adsbCalls++;
  return adsbAvailable ? { provider: "adsb.lol", ident: "AAL3009" } : null;
};
fr24.getLiveFlightSnapshot = async () => {
  fr24Calls++;
  return fr24Available ? { provider: "flightradar24", ident: "AAL3009" } : null;
};
flightaware.getFiledRoute = async () => filedRoute;
weather.getRadarImage = async () => {
  if (radarError) throw new Error("Fixture radar outage");
  return { buffer: png, contentType: "image/png", cached: false };
};
calendar.getUpcomingEvents = async () => {
  if (calendarError) throw Object.assign(new Error("invalid_grant"), {
    code: 400, response: { data: { error: "invalid_grant" } }
  });
  return { events: [] };
};
const { app } = require("./index");

(async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const lookup = async () => {
    const response = await fetch(`${base}/api/flights/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: "PHX", destination: "CLT",
        startUtc: "2026-09-04T12:00:00Z", liveLookupCandidates: ["AA3009"] })
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.flightData.primaryProvider, "adsb.lol");
    assert.equal(health.flightData.filedRoute.provider, "flightaware");
    assert.equal(health.flightData.weatherRadar.provider, "NOAA NWS");

    let result = await lookup();
    assert.equal(result.provider, "adsb.lol");
    assert.equal(adsbCalls, 1);
    assert.equal(fr24Calls, 0, "FR24 should not run when adsb.lol matches.");
    assert.deepEqual(result.filedRoute, filedRoute);
    assert.deepEqual(result.liveFlight.filedRoute, filedRoute);

    adsbAvailable = false;
    fr24Available = true;
    result = await lookup();
    assert.equal(result.provider, "flightradar24");
    assert.deepEqual(result.filedRoute, filedRoute);

    fr24Available = false;
    result = await lookup();
    assert.equal(result.liveFlight, null);
    assert.deepEqual(result.filedRoute, filedRoute,
      "The filed plan must reach the display before telemetry is available.");

    let radar = await fetch(`${base}/api/weather/radar`);
    assert.equal(radar.status, 200);
    assert.equal(radar.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await radar.arrayBuffer()), png);
    radarError = true;
    radar = await fetch(`${base}/api/weather/radar`);
    assert.equal(radar.status, 204);
    assert.equal((await lookup()).ok, true, "Weather outage must not stop tracking.");

    const diagnosticResponse = await fetch(`${base}/api/diagnostics/recent`);
    assert.equal(diagnosticResponse.status, 200);
    const diagnostics = await diagnosticResponse.json();
    assert(diagnostics.entries.some(e => e.type === "provider-attempt" && e.provider === "adsb.lol"));
    assert(diagnostics.entries.some(e => e.type === "provider-attempt" && e.provider === "flightaware-route"));
    assert(diagnostics.entries.some(e => e.type === "weather-error"));

    const chime = await fetch(`${base}/api/diagnostics/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "altitude-chime-test" })
    });
    assert.equal(chime.status, 200);
    calendarError = true;
    const schedule = await fetch(`${base}/api/calendar/upcoming`);
    assert.equal(schedule.status, 401);
    assert.equal((await schedule.json()).code, "calendar-authorization-required");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  console.log("Provider HTTP integration tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
