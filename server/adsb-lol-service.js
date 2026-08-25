"use strict";

const ADSB_LOL_API_BASE_URL =
  "https://api.adsb.lol/v2";
const REQUEST_TIMEOUT_MS = 10000;

const {
  determinePhase,
  normalizeLookup,
  routeMetrics
} = require("./flightradar24-service");

class AdsbLolRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AdsbLolRequestError";
    this.status = status;
  }
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "" || value === "ground") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCallsign(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function titleCasePhase(phase) {
  return String(phase ?? "")
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_match, prefix, letter) =>
      `${prefix ? " " : ""}${letter.toUpperCase()}`
    );
}

function normalizePosition(record, retrievedAt) {
  const seenSeconds = finiteNumber(record.seen_pos ?? record.seen) ?? 0;
  const recordedAt = new Date(
    new Date(retrievedAt).getTime() - Math.max(0, seenSeconds) * 1000
  ).toISOString();

  return {
    recordedAt,
    latitude: finiteNumber(record.lat),
    longitude: finiteNumber(record.lon),
    altitude: finiteNumber(record.alt_baro) ?? finiteNumber(record.alt_geom),
    groundSpeed: finiteNumber(record.gs),
    heading: finiteNumber(record.track) ?? finiteNumber(record.true_heading),
    verticalRate: finiteNumber(record.baro_rate) ?? finiteNumber(record.geom_rate)
  };
}

function normalizeAdsbSnapshot(record, lookup, retrievedAt = new Date().toISOString()) {
  const position = normalizePosition(record, retrievedAt);
  const metrics = routeMetrics(position, lookup.origin, lookup.destination);
  const phase = determinePhase(position, metrics);
  const ident = normalizeCallsign(record.flight) || lookup.callsigns[0] || null;

  return {
    provider: "adsb.lol",
    retrievedAt,
    matchedIdent: ident,
    providerFlightId: String(record.hex ?? "").trim() || null,
    ident,
    displayIdent: ident,
    phase,
    status: titleCasePhase(phase),
    cancelled: false,
    diverted: false,
    origin: lookup.origin,
    destination: lookup.destination,
    progressPercent: metrics.progressPercent,
    aircraft: {
      registration: record.r ?? null,
      type: record.t ?? record.type ?? null
    },
    filedRoute: null,
    departure: {
      scheduled: null,
      estimated: null,
      actualGate: null,
      actualRunway: null,
      best: null,
      delayMinutes: null,
      terminal: null,
      gate: null
    },
    arrival: {
      scheduled: null,
      estimated: null,
      actualRunway: null,
      actualGate: null,
      best: null,
      delayMinutes: null,
      terminal: null,
      gate: null
    },
    position
  };
}

function selectAircraft(records, callsign) {
  const expected = normalizeCallsign(callsign);

  return (Array.isArray(records) ? records : [])
    .filter((record) =>
      normalizeCallsign(record.flight) === expected &&
      Number.isFinite(Number(record.lat)) &&
      Number.isFinite(Number(record.lon))
    )
    .sort((left, right) =>
      (finiteNumber(left.seen_pos) ?? 999) -
      (finiteNumber(right.seen_pos) ?? 999)
    )[0] ?? null;
}

async function requestAdsbLol(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
  );
  const url = `${String(options.baseUrl ?? ADSB_LOL_API_BASE_URL).replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Dad-Radar/1.0 family-flight-display"
      },
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AdsbLolRequestError(
        data?.msg ?? `adsb.lol returned status ${response.status}.`,
        response.status
      );
    }

    return Array.isArray(data?.ac) ? data.ac : [];
  } catch (error) {
    if (error instanceof AdsbLolRequestError) {
      throw error;
    }
    throw new AdsbLolRequestError(
      error.name === "AbortError"
        ? "The adsb.lol request timed out."
        : `Unable to reach adsb.lol: ${error.message}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getLiveFlightSnapshot(requestedLookup, options = {}) {
  const lookup = normalizeLookup(requestedLookup);

  for (const callsign of lookup.callsigns) {
    const records = await requestAdsbLol(
      `/callsign/${encodeURIComponent(callsign)}`,
      options
    );
    const aircraft = selectAircraft(records, callsign);

    if (aircraft) {
      return normalizeAdsbSnapshot(aircraft, lookup);
    }
  }

  return null;
}

module.exports = {
  ADSB_LOL_API_BASE_URL,
  AdsbLolRequestError,
  getLiveFlightSnapshot,
  normalizeAdsbSnapshot,
  normalizeCallsign,
  normalizePosition,
  requestAdsbLol,
  selectAircraft
};
