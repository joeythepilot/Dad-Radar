"use strict";

const assert = require("node:assert/strict");
const {
  getFiledRoute,
  matchingFlight,
  normalizeFiledRoute,
  routeIdentCandidates
} = require("./flightaware-route-service");

assert.deepEqual(
  routeIdentCandidates(
    null,
    {
      liveLookupCandidates: [
        "AA3660",
        "MQ3660",
        "ENY3660"
      ]
    }
  ),
  ["AA3660", "MQ3660", "ENY3660"]
);

assert.equal(matchingFlight([
  { origin: { code_iata: "SYR" }, destination: { code_iata: "ORD" }, fa_flight_id: "id-1" }
], { origin: "SYR", destination: "ORD" }).fa_flight_id, "id-1");

assert.equal(
  matchingFlight(
    [
      {
        origin: { code_iata: "ORD" },
        destination: { code_iata: "XNA" },
        scheduled_out: "2026-08-25T01:00:00Z",
        fa_flight_id: "old-flight"
      },
      {
        origin: { code_iata: "ORD" },
        destination: { code_iata: "XNA" },
        scheduled_out: "2026-08-25T03:20:00Z",
        fa_flight_id: "nearest-flight"
      }
    ],
    {
      origin: "ORD",
      destination: "XNA",
      startUtc: "2026-08-25T03:15:00Z"
    }
  ).fa_flight_id,
  "nearest-flight"
);

assert.deepEqual(normalizeFiledRoute({
  route: "SYR JOSSY Q29 ORD",
  route_distance: 540,
  fixes: [
    { name: "SYR", latitude: 43.11, longitude: -76.11 },
    { name: "JOSSY", latitude: 42.8, longitude: -80.1 }
  ]
}), {
  provider: "flightaware",
  routeText: "SYR JOSSY Q29 ORD",
  routeDistance: 540,
  fixes: [
    { name: "SYR", latitude: 43.11, longitude: -76.11 },
    { name: "JOSSY", latitude: 42.8, longitude: -80.1 }
  ]
});

(async () => {
  const paths = [];
  const route = await getFiledRoute(
    { ident: "ENY3631" },
    { origin: "SYR", destination: "ORD", startUtc: "2026-08-22T22:09:00Z" },
    {
      apiKey: "test-key",
      baseUrl: "https://example.test/aeroapi",
      cache: new Map(),
      async fetchImpl(url) {
        paths.push(new URL(url).pathname);
        const routeRequest = String(url).endsWith("/route");
        return {
          ok: true,
          status: 200,
          async json() {
            return routeRequest
              ? { route: "SYR JOSSY ORD", fixes: [{ name: "JOSSY", latitude: 42.8, longitude: -80.1 }] }
              : { flights: [{ fa_flight_id: "fa-id", origin: { code_iata: "SYR" }, destination: { code_iata: "ORD" } }] };
          }
        };
      }
    }
  );
  assert.deepEqual(paths, ["/aeroapi/flights/ENY3631", "/aeroapi/flights/fa-id/route"]);
  assert.equal(route.fixes[0].name, "JOSSY");

  const preflightPaths = [];
  const preflightRoute = await getFiledRoute(
    null,
    {
      origin: "ORD",
      destination: "XNA",
      startUtc: "2026-08-25T03:15:00Z",
      liveLookupCandidates: [
        "AA3660"
      ]
    },
    {
      apiKey: "test-key",
      baseUrl: "https://example.test/aeroapi",
      cache: new Map(),
      async fetchImpl(url) {
        preflightPaths.push(
          new URL(url).pathname
        );
        const routeRequest =
          String(url).endsWith("/route");

        return {
          ok: true,
          status: 200,
          async json() {
            return routeRequest
              ? {
                  route: "ORD BDF XNA",
                  fixes: [
                    {
                      name: "BDF",
                      latitude: 41.1,
                      longitude: -89.6
                    }
                  ]
                }
              : {
                  flights: [
                    {
                      fa_flight_id:
                        "preflight-id",
                      scheduled_out:
                        "2026-08-25T03:15:00Z",
                      origin: {
                        code_iata: "ORD"
                      },
                      destination: {
                        code_iata: "XNA"
                      }
                    }
                  ]
                };
          }
        };
      }
    }
  );

  assert.deepEqual(
    preflightPaths,
    [
      "/aeroapi/flights/AA3660",
      "/aeroapi/flights/preflight-id/route"
    ]
  );
  assert.equal(
    preflightRoute.fixes[0].name,
    "BDF"
  );
  console.log("FlightAware filed-route service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
