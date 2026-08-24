"use strict";

const assert = require("node:assert/strict");
const {
  getFiledRoute,
  matchingFlight,
  normalizeFiledRoute
} = require("./flightaware-route-service");

assert.equal(matchingFlight([
  { origin: { code_iata: "SYR" }, destination: { code_iata: "ORD" }, fa_flight_id: "id-1" }
], { origin: "SYR", destination: "ORD" }).fa_flight_id, "id-1");

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
  console.log("FlightAware filed-route service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
