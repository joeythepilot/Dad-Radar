"use strict";

const FLIGHTAWARE_AEROAPI_BASE_URL =
  "https://aeroapi.flightaware.com/aeroapi";
const CACHE_LIMIT = 128;
const routeCache = new Map();

class FlightAwareRouteError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "FlightAwareRouteError";
    this.status = status;
  }
}

function cacheSet(cache, key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
}

function normalizeFiledRoute(data) {
  const fixes = (Array.isArray(data?.fixes) ? data.fixes : [])
    .map((fix) => ({
      name: String(fix.name ?? fix.ident ?? "").trim() || null,
      latitude: Number(fix.latitude ?? fix.lat),
      longitude: Number(fix.longitude ?? fix.lon)
    }))
    .filter((fix) =>
      Number.isFinite(fix.latitude) && Number.isFinite(fix.longitude)
    );

  if (fixes.length === 0) {
    return null;
  }

  return {
    provider: "flightaware",
    routeText: data.route ?? data.route_text ?? null,
    routeDistance: Number(data.route_distance ?? data.distance) || null,
    fixes
  };
}

async function requestJson(path, options) {
  const baseUrl = String(options.baseUrl ?? FLIGHTAWARE_AEROAPI_BASE_URL).replace(/\/$/, "");
  const response = await options.fetchImpl(`${baseUrl}/${String(path).replace(/^\//, "")}`, {
    headers: {
      Accept: "application/json",
      "x-apikey": options.apiKey
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FlightAwareRouteError(
      data?.title ?? data?.detail ?? `FlightAware returned status ${response.status}.`,
      response.status
    );
  }
  return data;
}

function matchingFlight(flights, lookup) {
  const origin = String(lookup?.origin ?? "").toUpperCase();
  const destination = String(lookup?.destination ?? "").toUpperCase();
  return (Array.isArray(flights) ? flights : []).find((flight) => {
    const flightOrigin = String(flight.origin?.code_iata ?? flight.origin?.code ?? "").toUpperCase();
    const flightDestination = String(flight.destination?.code_iata ?? flight.destination?.code ?? "").toUpperCase();
    return flightOrigin === origin && flightDestination === destination;
  }) ?? null;
}

async function getFiledRoute(snapshot, lookup, providedOptions = {}) {
  const apiKey = providedOptions.apiKey ?? process.env.FLIGHTAWARE_AEROAPI_KEY;
  if (!apiKey) {
    return null;
  }

  const options = {
    apiKey,
    baseUrl: providedOptions.baseUrl,
    fetchImpl: providedOptions.fetchImpl ?? fetch,
    cache: providedOptions.cache ?? routeCache
  };
  const key = [lookup?.startUtc, lookup?.origin, lookup?.destination, snapshot?.ident].join("|");
  if (options.cache.has(key)) {
    return options.cache.get(key);
  }

  const ident = encodeURIComponent(snapshot?.ident ?? snapshot?.displayIdent ?? "");
  if (!ident) {
    return null;
  }
  const flightsPayload = await requestJson(`/flights/${ident}`, options);
  const flight = matchingFlight(flightsPayload?.flights, lookup);
  if (!flight?.fa_flight_id) {
    cacheSet(options.cache, key, null);
    return null;
  }

  const routePayload = await requestJson(
    `/flights/${encodeURIComponent(flight.fa_flight_id)}/route`,
    options
  );
  const route = normalizeFiledRoute(routePayload);
  cacheSet(options.cache, key, route);
  return route;
}

module.exports = {
  FLIGHTAWARE_AEROAPI_BASE_URL,
  FlightAwareRouteError,
  getFiledRoute,
  matchingFlight,
  normalizeFiledRoute
};
