"use strict";

const assert = require("node:assert/strict");
const {
  getLiveFlightSnapshot,
  providerOrder
} = require("./live-flight-provider-service");

assert.deepEqual(providerOrder(), ["adsb.lol", "flightradar24"]);
assert.deepEqual(providerOrder("flightradar24"), ["flightradar24", "adsb.lol"]);

(async () => {
  const calls = [];
  const result = await getLiveFlightSnapshot(
    { provider: null, providerFlightId: "old-id" },
    {
      async adsbLookup(lookup) {
        calls.push(["adsb.lol", lookup.providerFlightId]);
        return null;
      },
      async fr24Lookup(lookup) {
        calls.push(["flightradar24", lookup.providerFlightId]);
        return { provider: "flightradar24" };
      }
    }
  );

  assert.deepEqual(calls, [
    ["adsb.lol", null],
    ["flightradar24", null]
  ]);
  assert.equal(result.snapshot.provider, "flightradar24");
  assert.deepEqual(result.attempts.map((entry) => entry.outcome), ["no-match", "matched"]);

  const sticky = await getLiveFlightSnapshot(
    { provider: "flightradar24", providerFlightId: "fr24-id" },
    {
      async fr24Lookup(lookup) {
        assert.equal(lookup.providerFlightId, "fr24-id");
        return { provider: "flightradar24" };
      }
    }
  );
  assert.equal(sticky.snapshot.provider, "flightradar24");
  console.log("Live-flight provider fallback tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
