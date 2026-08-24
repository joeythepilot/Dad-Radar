"use strict";

const assert = require("node:assert/strict");
const {
  getLiveFlightSnapshot,
  normalizeAdsbSnapshot,
  selectAircraft
} = require("./adsb-lol-service");

const lookup = {
  liveLookupCandidates: ["ENY3631", "MQ3631"],
  origin: "SYR",
  destination: "ORD",
  startUtc: "2026-08-22T22:09:00.000Z"
};

const record = {
  hex: "a12345",
  flight: "ENY3631 ",
  r: "N123AA",
  t: "E75L",
  lat: 42.1,
  lon: -80.2,
  alt_baro: 34000,
  gs: 409,
  track: 256,
  baro_rate: -64,
  seen_pos: 1.2
};

assert.equal(selectAircraft([record], "ENY3631"), record);
assert.equal(selectAircraft([record], "AAL3631"), null);

const normalized = normalizeAdsbSnapshot(
  record,
  require("./flightradar24-service").normalizeLookup(lookup),
  "2026-08-22T22:41:00.000Z"
);

assert.equal(normalized.provider, "adsb.lol");
assert.equal(normalized.providerFlightId, "a12345");
assert.equal(normalized.phase, "EN_ROUTE");
assert.equal(normalized.position.altitude, 34000);
assert.equal(normalized.aircraft.registration, "N123AA");

(async () => {
  let requestedUrl = null;
  const snapshot = await getLiveFlightSnapshot(lookup, {
    async fetchImpl(url) {
      requestedUrl = String(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { ac: [record] };
        }
      };
    }
  });

  assert.match(requestedUrl, /\/callsign\/ENY3631$/);
  assert.equal(snapshot.provider, "adsb.lol");
  console.log("adsb.lol live-flight service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
