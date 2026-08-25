"use strict";

const assert = require("node:assert/strict");
const {
  ADSB_LOL_FORBIDDEN_COOLDOWN_MS,
  adsbLolIsCoolingDown,
  getLiveFlightSnapshot,
  providerOrder,
  resetProviderCooldowns
} = require("./live-flight-provider-service");

assert.deepEqual(providerOrder(), ["adsb.lol", "flightradar24"]);
assert.deepEqual(providerOrder("flightradar24"), ["flightradar24", "adsb.lol"]);

(async () => {
  resetProviderCooldowns();
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
      },
      async routeLookup() {
        return null;
      }
    }
  );

  assert.deepEqual(calls, [
    ["adsb.lol", null],
    ["flightradar24", null]
  ]);
  assert.equal(result.snapshot.provider, "flightradar24");
  assert.deepEqual(result.attempts.map((entry) => entry.outcome), ["preflight-no-match", "no-match", "matched"]);

  const sticky = await getLiveFlightSnapshot(
    { provider: "flightradar24", providerFlightId: "fr24-id" },
    {
      async fr24Lookup(lookup) {
        assert.equal(lookup.providerFlightId, "fr24-id");
        return { provider: "flightradar24" };
      },
      async routeLookup() {
        return null;
      }
    }
  );
  assert.equal(sticky.snapshot.provider, "flightradar24");

  const preflightRoute = {
    provider: "flightaware",
    fixes: [
      {
        name: "BDF",
        latitude: 41.1,
        longitude: -89.6
      }
    ]
  };
  const routeOnly = await getLiveFlightSnapshot(
    { provider: null },
    {
      async routeLookup(snapshot) {
        assert.equal(snapshot, null);
        return preflightRoute;
      },
      async adsbLookup() {
        return null;
      },
      async fr24Lookup() {
        return null;
      }
    }
  );
  assert.equal(routeOnly.snapshot, null);
  assert.equal(routeOnly.filedRoute, preflightRoute);
  assert.equal(
    routeOnly.attempts[0].outcome,
    "preflight-matched"
  );

  resetProviderCooldowns();
  const forbidden = new Error("Forbidden");
  forbidden.status = 403;
  let adsbCalls = 0;

  await getLiveFlightSnapshot(
    { provider: null },
    {
      now: () => 1000,
      async routeLookup() {
        return null;
      },
      async adsbLookup() {
        adsbCalls += 1;
        throw forbidden;
      },
      async fr24Lookup() {
        return null;
      }
    }
  );
  assert.equal(adsbCalls, 1);
  assert.equal(adsbLolIsCoolingDown(1001), true);
  assert.equal(
    adsbLolIsCoolingDown(
      1000 +
      ADSB_LOL_FORBIDDEN_COOLDOWN_MS +
      1
    ),
    false
  );

  const cooling = await getLiveFlightSnapshot(
    { provider: null },
    {
      now: () => 2000,
      async routeLookup() {
        return null;
      },
      async adsbLookup() {
        adsbCalls += 1;
        return null;
      },
      async fr24Lookup() {
        return null;
      }
    }
  );
  assert.equal(adsbCalls, 1);
  assert.ok(
    cooling.attempts.some(
      (attempt) =>
        attempt.provider === "adsb.lol" &&
        attempt.outcome === "cooldown"
    )
  );
  resetProviderCooldowns();
  console.log("Live-flight provider fallback tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
