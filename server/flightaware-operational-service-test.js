"use strict";

const assert = require("node:assert/strict");
const {
  OPERATIONAL_TTLS_MS,
  getOperationalStatus,
  normalizeOperationalStatus,
  operationalCacheTtl,
  operationalIdentCandidates
} = require("./flightaware-operational-service");

function flight(overrides = {}) {
  return {
    fa_flight_id: "fa-3917-1",
    ident: "ENY3917",
    ident_iata: "AA3917",
    origin: { code_iata: "ORD" },
    destination: { code_iata: "CMH" },
    scheduled_out: "2026-09-17T22:27:00Z",
    estimated_out: "2026-09-17T23:12:00Z",
    actual_out: null,
    scheduled_off: "2026-09-17T22:42:00Z",
    estimated_off: "2026-09-17T23:27:00Z",
    actual_off: null,
    scheduled_on: "2026-09-18T00:48:00Z",
    estimated_on: "2026-09-18T01:33:00Z",
    actual_on: null,
    scheduled_in: "2026-09-18T01:01:00Z",
    estimated_in: "2026-09-18T01:46:00Z",
    actual_in: null,
    cancelled: false,
    diverted: false,
    status: "Delayed",
    ...overrides
  };
}

const normalized = normalizeOperationalStatus(
  flight(),
  "2026-09-17T21:00:00Z"
);
assert.equal(normalized.provider, "flightaware");
assert.equal(normalized.faFlightId, "fa-3917-1");
assert.equal(normalized.ident, "AA3917");
assert.equal(normalized.estimatedOut, "2026-09-17T23:12:00Z");
assert.equal(normalized.estimatedIn, "2026-09-18T01:46:00Z");
assert.equal(normalized.departureDelayMinutes, 45);
assert.equal(normalized.arrivalDelayMinutes, 45);
assert.equal(normalized.cancelled, false);
assert.equal(normalized.diverted, false);

const arrived = normalizeOperationalStatus(
  flight({
    estimated_out: null,
    actual_out: "2026-09-17T22:40:00Z",
    actual_off: "2026-09-17T22:52:00Z",
    actual_on: "2026-09-18T00:55:00Z",
    actual_in: "2026-09-18T01:07:00Z",
    status: "Arrived"
  }),
  "2026-09-18T01:08:00Z"
);
assert.equal(arrived.actualOut, "2026-09-17T22:40:00Z");
assert.equal(arrived.actualOff, "2026-09-17T22:52:00Z");
assert.equal(arrived.actualOn, "2026-09-18T00:55:00Z");
assert.equal(arrived.actualIn, "2026-09-18T01:07:00Z");
assert.equal(arrived.departureDelayMinutes, 13);
assert.equal(arrived.arrivalDelayMinutes, 6);

assert.deepEqual(
  operationalIdentCandidates({
    carrierCode: "AA",
    flightNumber: "3917",
    liveLookupCandidates: ["AA3917", "ENY3917", "MQ3917"]
  }),
  ["AA3917", "ENY3917", "MQ3917"]
);

assert.equal(
  operationalCacheTtl(
    { times: { startUtc: "2026-09-18T10:00:00Z" } },
    null,
    Date.parse("2026-09-17T20:00:00Z")
  ),
  OPERATIONAL_TTLS_MS.MID_RANGE
);
assert.equal(
  operationalCacheTtl(
    { times: { startUtc: "2026-09-17T22:00:00Z" } },
    null,
    Date.parse("2026-09-17T20:00:00Z")
  ),
  OPERATIONAL_TTLS_MS.NEAR_RANGE
);
assert.equal(
  operationalCacheTtl(
    { times: { startUtc: "2026-09-17T20:30:00Z" } },
    null,
    Date.parse("2026-09-17T20:00:00Z")
  ),
  OPERATIONAL_TTLS_MS.IMMINENT
);
assert.equal(
  operationalCacheTtl(
    { times: { startUtc: "2026-09-17T18:00:00Z" } },
    { actualOut: "2026-09-17T18:10:00Z", actualIn: null },
    Date.parse("2026-09-17T20:00:00Z")
  ),
  OPERATIONAL_TTLS_MS.AIRBORNE
);
assert.equal(
  operationalCacheTtl(
    { times: { startUtc: "2026-09-17T18:00:00Z" } },
    { actualIn: "2026-09-17T19:55:00Z" },
    Date.parse("2026-09-17T20:00:00Z")
  ),
  OPERATIONAL_TTLS_MS.TERMINAL
);

(async () => {
  const event = {
    id: "calendar-3917",
    kind: "flight",
    carrierCode: "AA",
    flightNumber: "3917",
    origin: "ORD",
    destination: "CMH",
    times: { startUtc: "2026-09-17T22:27:00Z", endUtc: "2026-09-18T01:01:00Z" },
    liveLookupCandidates: ["AA3917", "ENY3917"]
  };

  assert.equal(await getOperationalStatus(event, { apiKey: "" }), null,
    "Missing AeroAPI key must leave DadRadar behavior unchanged.");

  const cache = new Map();
  let fetchCalls = 0;
  let now = Date.parse("2026-09-17T20:30:00Z");
  const result = await getOperationalStatus(event, {
    apiKey: "test-key",
    baseUrl: "https://example.test/aeroapi",
    cache,
    now: () => now,
    async fetchImpl(url) {
      fetchCalls++;
      const candidate = decodeURIComponent(new URL(url).pathname.split("/").pop());
      return {
        ok: true,
        status: 200,
        async json() {
          if (candidate === "AA3917") {
            return {
              flights: [
                flight({
                  fa_flight_id: "wrong-route",
                  destination: { code_iata: "MKE" },
                  scheduled_out: "2026-09-17T22:27:00Z"
                }),
                flight({
                  fa_flight_id: "nearest-correct",
                  scheduled_out: "2026-09-17T22:29:00Z"
                }),
                flight({
                  fa_flight_id: "older-correct",
                  scheduled_out: "2026-09-17T12:00:00Z"
                })
              ]
            };
          }
          return { flights: [] };
        }
      };
    }
  });

  assert.equal(result.faFlightId, "nearest-correct");
  assert.equal(result.estimatedOut, "2026-09-17T23:12:00Z");
  assert.equal(fetchCalls, 1);

  const cached = await getOperationalStatus(event, {
    apiKey: "test-key",
    baseUrl: "https://example.test/aeroapi",
    cache,
    now: () => now + 60_000,
    async fetchImpl() {
      fetchCalls++;
      throw new Error("Cache should have prevented another paid request.");
    }
  });
  assert.deepEqual(cached, result);
  assert.equal(fetchCalls, 1);

  now += OPERATIONAL_TTLS_MS.NEAR_RANGE + 1;
  const refreshed = await getOperationalStatus(event, {
    apiKey: "test-key",
    baseUrl: "https://example.test/aeroapi",
    cache,
    now: () => now,
    async fetchImpl() {
      fetchCalls++;
      return {
        ok: true,
        status: 200,
        async json() {
          return { flights: [flight({ estimated_out: "2026-09-17T23:20:00Z" })] };
        }
      };
    }
  });
  assert.equal(refreshed.estimatedOut, "2026-09-17T23:20:00Z");
  assert.equal(fetchCalls, 2);

  now += OPERATIONAL_TTLS_MS.NEAR_RANGE + 1;
  await assert.rejects(
    () => getOperationalStatus(event, {
      apiKey: "test-key",
      baseUrl: "https://example.test/aeroapi",
      cache,
      now: () => now,
      async fetchImpl() {
        fetchCalls++;
        throw new Error("Fixture AeroAPI outage");
      }
    }),
    /Fixture AeroAPI outage/,
    "The first provider error remains visible to diagnostics/master-state handling."
  );
  assert.equal(fetchCalls, 3);

  const cooled = await getOperationalStatus(event, {
    apiKey: "test-key",
    baseUrl: "https://example.test/aeroapi",
    cache,
    now: () => now + 60_000,
    async fetchImpl() {
      fetchCalls++;
      throw new Error("Provider must not be hammered during its cooldown.");
    }
  });
  assert.deepEqual(cooled, refreshed,
    "After the first error, the cache should serve the last good operational record during cooldown.");
  assert.equal(fetchCalls, 3,
    "A one-minute Calendar refresh must not create another AeroAPI request during cooldown.");

  console.log("FlightAware operational-status service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
