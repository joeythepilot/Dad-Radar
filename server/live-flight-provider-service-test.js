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
  for (const outcome of ["match", "missing", "error"]) {
    let calls = 0, paidCalls = 0;
    const only = await getLiveFlightSnapshot({surfaceOnly: true, provider: "flightradar24"}, {
      adsbLookup: async () => {calls++; if (outcome === "error") throw new Error("offline"); return outcome === "match" ? {provider: "adsb.lol"} : null;},
      fr24Lookup: async () => {paidCalls++; throw new Error("Paid lookup forbidden");},
      routeLookup: async () => {paidCalls++; throw new Error("Paid lookup forbidden");}
    });
    assert.equal(calls, 1);
    assert.equal(paidCalls, 0, "Ground follow-up never consults paid providers, even on failure or a FR24 provider hint.");
    assert.equal(only.filedRoute, null);
  }
  for (const surfaceOnly of [false, true]) {
    resetProviderCooldowns();
    let calls = 0;
    const options = {now: () => 1000, routeLookup: async () => null, fr24Lookup: async () => null,
      adsbLookup: async () => {calls++; const error = new Error("rate limited"); error.status = 429; throw error;}};
    await getLiveFlightSnapshot({surfaceOnly}, options);
    await getLiveFlightSnapshot({surfaceOnly}, {...options, now: () => 2000});
    assert.equal(calls, 1, "429 pauses subsequent ADS-B requests across displays");
    await getLiveFlightSnapshot({surfaceOnly}, {...options, now: () => 61001});
    assert.equal(calls, 2, "Rate-limit cooldown eventually permits a retry");
  }
  resetProviderCooldowns();
  console.log("Live-flight provider fallback tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
