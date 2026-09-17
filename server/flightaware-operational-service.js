"use strict";

const {
  FLIGHTAWARE_AEROAPI_BASE_URL,
  matchingFlight,
  routeIdentCandidates
} = require("./flightaware-route-service");

const OPERATIONAL_TTLS_MS = Object.freeze({
  MID_RANGE: 30 * 60 * 1000,
  NEAR_RANGE: 10 * 60 * 1000,
  IMMINENT: 2 * 60 * 1000,
  AIRBORNE: 5 * 60 * 1000,
  TERMINAL: 6 * 60 * 60 * 1000
});
const MAX_CACHE_ENTRIES = 128;
const MAX_MATCH_DIFFERENCE_MS = 18 * 60 * 60 * 1000;
const operationalCache = new Map();

class FlightAwareOperationalError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "FlightAwareOperationalError";
    this.status = status;
  }
}

function validIso(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function minuteDifference(later, earlier) {
  const laterTime = Date.parse(later ?? "");
  const earlierTime = Date.parse(earlier ?? "");
  if (!Number.isFinite(laterTime) || !Number.isFinite(earlierTime)) return null;
  return Math.max(0, Math.round((laterTime - earlierTime) / 60000));
}

function normalizeOperationalStatus(flight, retrievedAt = new Date().toISOString()) {
  if (!flight) return null;
  const scheduledOut = validIso(flight.scheduled_out);
  const estimatedOut = validIso(flight.estimated_out);
  const actualOut = validIso(flight.actual_out);
  const scheduledOff = validIso(flight.scheduled_off);
  const estimatedOff = validIso(flight.estimated_off);
  const actualOff = validIso(flight.actual_off);
  const scheduledOn = validIso(flight.scheduled_on);
  const estimatedOn = validIso(flight.estimated_on);
  const actualOn = validIso(flight.actual_on);
  const scheduledIn = validIso(flight.scheduled_in);
  const estimatedIn = validIso(flight.estimated_in);
  const actualIn = validIso(flight.actual_in);
  const departureReference = actualOut ?? estimatedOut;
  const arrivalReference = actualIn ?? estimatedIn;

  return {
    provider: "flightaware",
    faFlightId: String(flight.fa_flight_id ?? "").trim() || null,
    ident: String(flight.ident_iata ?? flight.ident ?? flight.ident_icao ?? "").trim().toUpperCase() || null,
    retrievedAt: validIso(retrievedAt) ?? new Date().toISOString(),
    scheduledOut,
    estimatedOut,
    actualOut,
    scheduledOff,
    estimatedOff,
    actualOff,
    scheduledOn,
    estimatedOn,
    actualOn,
    scheduledIn,
    estimatedIn,
    actualIn,
    cancelled: Boolean(flight.cancelled),
    diverted: Boolean(flight.diverted),
    status: String(flight.status ?? "").trim() || null,
    departureDelayMinutes: minuteDifference(departureReference, scheduledOut),
    arrivalDelayMinutes: minuteDifference(arrivalReference, scheduledIn),
    originGate: String(flight.gate_origin ?? flight.origin_gate ?? "").trim() || null,
    originTerminal: String(flight.terminal_origin ?? flight.origin_terminal ?? "").trim() || null,
    destinationGate: String(flight.gate_destination ?? flight.destination_gate ?? "").trim() || null,
    destinationTerminal: String(flight.terminal_destination ?? flight.destination_terminal ?? "").trim() || null
  };
}

function operationalIdentCandidates(event) {
  const carrier = String(event?.carrierCode ?? "").trim().toUpperCase();
  const number = String(event?.flightNumber ?? "").trim().toUpperCase();
  const synthesized = carrier && number ? `${carrier}${number}` : null;
  const supplied = Array.isArray(event?.liveLookupCandidates) ? event.liveLookupCandidates : [];
  return routeIdentCandidates(null, {
    ...event,
    liveLookupCandidates: [synthesized, ...supplied].filter(Boolean)
  });
}

function eventStartMs(event) {
  return Date.parse(event?.times?.startUtc ?? event?.startUtc ?? "");
}

function operationalCacheTtl(event, record, now = Date.now()) {
  if (record?.actualIn || record?.cancelled) return OPERATIONAL_TTLS_MS.TERMINAL;
  if (record?.actualOut && !record?.actualIn) return OPERATIONAL_TTLS_MS.AIRBORNE;

  const start = eventStartMs(event);
  if (!Number.isFinite(start)) return OPERATIONAL_TTLS_MS.NEAR_RANGE;
  const minutesUntilStart = (start - Number(now)) / 60000;
  if (minutesUntilStart <= 60) return OPERATIONAL_TTLS_MS.IMMINENT;
  if (minutesUntilStart <= 180) return OPERATIONAL_TTLS_MS.NEAR_RANGE;
  return OPERATIONAL_TTLS_MS.MID_RANGE;
}

function cacheKey(event, candidates) {
  return [
    event?.id ?? "",
    event?.origin ?? "",
    event?.destination ?? "",
    event?.times?.startUtc ?? event?.startUtc ?? "",
    candidates.join(",")
  ].map(value => String(value).trim().toUpperCase()).join("|");
}

function cacheSet(cache, key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}

async function requestFlights(candidate, options) {
  const baseUrl = String(options.baseUrl ?? FLIGHTAWARE_AEROAPI_BASE_URL).replace(/\/$/, "");
  const response = await options.fetchImpl(
    `${baseUrl}/flights/${encodeURIComponent(candidate)}`,
    { headers: { Accept: "application/json", "x-apikey": options.apiKey } }
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FlightAwareOperationalError(
      data?.title ?? data?.detail ?? `FlightAware returned status ${response.status}.`,
      response.status
    );
  }
  return Array.isArray(data?.flights) ? data.flights : [];
}

function plausibleMatch(flights, event) {
  const matched = matchingFlight(flights, {
    origin: event?.origin,
    destination: event?.destination,
    startUtc: event?.times?.startUtc ?? event?.startUtc
  });
  if (!matched) return null;
  const expected = eventStartMs(event);
  const candidate = Date.parse(
    matched.scheduled_out ?? matched.scheduled_off ?? matched.estimated_out ?? ""
  );
  if (Number.isFinite(expected) && Number.isFinite(candidate) &&
      Math.abs(candidate - expected) > MAX_MATCH_DIFFERENCE_MS) return null;
  return matched;
}

async function getOperationalStatus(event, providedOptions = {}) {
  const apiKey = providedOptions.apiKey ?? process.env.FLIGHTAWARE_AEROAPI_KEY;
  if (!apiKey || event?.kind !== "flight") return null;

  const nowFn = typeof providedOptions.now === "function" ? providedOptions.now : Date.now;
  const now = Number(nowFn());
  const start = eventStartMs(event);
  const candidates = operationalIdentCandidates(event);
  if (!candidates.length) return null;

  const cache = providedOptions.cache ?? operationalCache;
  const key = cacheKey(event, candidates);
  const cached = cache.get(key);
  if (cached && now < cached.retryAfter) return cached.record ?? null;

  // Cost control: do not begin operational polling more than twelve hours early.
  if (!cached && Number.isFinite(start) && start - now > 12 * 60 * 60 * 1000) return null;

  const options = {
    apiKey,
    baseUrl: providedOptions.baseUrl,
    fetchImpl: providedOptions.fetchImpl ?? fetch
  };

  let record = null;
  for (const candidate of candidates) {
    try {
      const flights = await requestFlights(candidate, options);
      const matched = plausibleMatch(flights, event);
      if (!matched) continue;
      record = normalizeOperationalStatus(matched, new Date(now).toISOString());
      break;
    } catch (error) {
      if (error?.status === 404) continue;
      throw error;
    }
  }

  const ttl = operationalCacheTtl(event, record, now);
  cacheSet(cache, key, { record, retryAfter: now + ttl });
  return record;
}

module.exports = {
  FlightAwareOperationalError,
  OPERATIONAL_TTLS_MS,
  getOperationalStatus,
  normalizeOperationalStatus,
  operationalCacheTtl,
  operationalIdentCandidates
};
