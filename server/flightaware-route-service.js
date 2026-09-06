"use strict";

const FLIGHTAWARE_AEROAPI_BASE_URL =
  "https://aeroapi.flightaware.com/aeroapi";
const CACHE_LIMIT = 128;
const NO_ROUTE_RETRY_MS = 5 * 60 * 1000;
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
  const scheduledStart = new Date(
    lookup?.startUtc ?? ""
  ).getTime();

  const matches = (Array.isArray(flights) ? flights : []).filter((flight) => {
    const flightOrigin = String(flight.origin?.code_iata ?? flight.origin?.code ?? "").toUpperCase();
    const flightDestination = String(flight.destination?.code_iata ?? flight.destination?.code ?? "").toUpperCase();
    return flightOrigin === origin && flightDestination === destination;
  });

  if (!Number.isFinite(scheduledStart)) {
    return matches[0] ?? null;
  }

  return matches
    .map((flight) => {
      const candidateStart = new Date(
        flight.scheduled_out ??
        flight.scheduled_off ??
        flight.estimated_out ??
        ""
      ).getTime();

      return {
        flight,
        difference: Number.isFinite(candidateStart)
          ? Math.abs(candidateStart - scheduledStart)
          : Number.POSITIVE_INFINITY
      };
    })
    .sort((left, right) =>
      left.difference - right.difference
    )[0]?.flight ?? null;
}

function routeIdentCandidates(snapshot, lookup) {
  const supplied = Array.isArray(
    lookup?.liveLookupCandidates ??
    lookup?.lookupCandidates
  )
    ? lookup.liveLookupCandidates ??
      lookup.lookupCandidates
    : [];

  return [
    snapshot?.ident,
    snapshot?.displayIdent,
    ...supplied
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
    )
    .filter((value) =>
      /^[A-Z]{2,3}\d{1,4}[A-Z]?$/.test(value)
    )
    .filter((value, index, values) =>
      values.indexOf(value) === index
    )
    .slice(0, 4);
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
  const identCandidates = routeIdentCandidates(
    snapshot,
    lookup
  );
  const key = [
    lookup?.startUtc,
    lookup?.origin,
    lookup?.destination,
    identCandidates.join(",")
  ].join("|");

  const now = providedOptions.now ?? Date.now();
  if (options.cache.has(key)) {
    const cached = options.cache.get(key);
    if (cached?.route) return cached.route;
    if (cached && now < cached.retryAfter) return null;
    options.cache.delete(key);
  }

  if (identCandidates.length === 0) {
    return null;
  }

  for (const identCandidate of identCandidates) {
    let flightsPayload = null;

    try {
      flightsPayload = await requestJson(
        `/flights/${encodeURIComponent(identCandidate)}`,
        options
      );
    } catch (error) {
      if (error?.status === 404) {
        continue;
      }

      throw error;
    }
    const flight = matchingFlight(
      flightsPayload?.flights,
      lookup
    );

    if (!flight?.fa_flight_id) {
      continue;
    }

    const routePayload = await requestJson(
      `/flights/${encodeURIComponent(flight.fa_flight_id)}/route`,
      options
    );
    const route = normalizeFiledRoute(routePayload);

    if (route) {
      cacheSet(options.cache, key, { route });
      return route;
    }
  }

  // A flight plan may be filed after our first preflight lookup. Suppress
  // repeated paid lookups briefly, then let normal polling acquire it.
  cacheSet(options.cache, key, { route: null, retryAfter: now + NO_ROUTE_RETRY_MS });
  return null;
}

module.exports = {
  FLIGHTAWARE_AEROAPI_BASE_URL,
  NO_ROUTE_RETRY_MS,
  FlightAwareRouteError,
  getFiledRoute,
  matchingFlight,
  normalizeFiledRoute,
  routeIdentCandidates
};
