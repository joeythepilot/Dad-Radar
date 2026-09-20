"use strict";

const airportCatalog = require("../data/airport-catalog");

const STORAGE_KEY = "dadRadar.sequenceHistory.v1";
const SEQUENCE_GAP_MS = 48 * 60 * 60 * 1000;
const MAX_LEGS = 16;
const MAX_TRACK_POINTS_PER_LEG = 2400;
const EARTH_RADIUS_NM = 3440.065;

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function eventTime(event, edge) {
  return event?.times?.[edge] ?? event?.[edge] ?? null;
}

function isWorkFlight(event) {
  if (!event || event.kind !== "flight" || event.isCommute === true) return false;
  return String(event.status ?? "").toLowerCase() !== "cancelled";
}

function eventKey(event) {
  if (!event) return null;
  return [
    event.id ?? "",
    event.travelRole ?? (event.isDeadhead ? "deadhead" : "operating"),
    event.carrierCode ?? "",
    event.flightNumber ?? "",
    event.origin ?? "",
    event.destination ?? "",
    eventTime(event, "startUtc") ?? "",
    eventTime(event, "endUtc") ?? ""
  ].map(value => String(value).trim().toUpperCase()).join("|");
}

function normalizePoint(point) {
  const latitude = finiteNumber(point?.latitude ?? point?.lat);
  const longitude = finiteNumber(point?.longitude ?? point?.lon);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {latitude, longitude, recordedAt: point?.recordedAt ?? point?.timestamp ?? null};
}

function pointKey(point) {
  return `${point.latitude.toFixed(5)}|${point.longitude.toFixed(5)}|${point.recordedAt ?? ""}`;
}

function mergeTrack(existing, incoming) {
  const result = [];
  const seen = new Set();
  for (const raw of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const point = normalizePoint(raw);
    if (!point) continue;
    const key = pointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(point);
  }
  result.sort((a, b) => {
    const at = Date.parse(a.recordedAt ?? "");
    const bt = Date.parse(b.recordedAt ?? "");
    if (Number.isFinite(at) && Number.isFinite(bt)) return at - bt;
    return 0;
  });
  return result.slice(-MAX_TRACK_POINTS_PER_LEG);
}

function radians(degrees) { return degrees * Math.PI / 180; }

function distanceNm(a, b) {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function trackDistanceNm(track) {
  let total = 0;
  for (let index = 1; index < track.length; index += 1) {
    const segment = distanceNm(track[index - 1], track[index]);
    if (Number.isFinite(segment) && segment <= 180) total += segment;
  }
  return total;
}

function airportPoint(code) {
  const airport = airportCatalog.lookupAirport?.(code) ?? airportCatalog.getAirport?.(code) ?? null;
  if (!airport) return null;
  const latitude = finiteNumber(airport.latitude ?? airport.lat);
  const longitude = finiteNumber(airport.longitude ?? airport.lon);
  return latitude === null || longitude === null ? null : {latitude, longitude};
}

function greatCircleForEvent(event) {
  const origin = airportPoint(event?.origin);
  const destination = airportPoint(event?.destination);
  return origin && destination ? distanceNm(origin, destination) : 0;
}

function emptyState(now) {
  return {version: 1, startedAt: null, lastActivityAt: null, currentEventKey: null,
    updatedAt: new Date(now).toISOString(), legs: []};
}

function parseState(storage, now) {
  try {
    const parsed = JSON.parse(storage[STORAGE_KEY] ?? "null");
    if (parsed?.version === 1 && Array.isArray(parsed.legs)) {
      return {...parsed, currentEventKey: parsed.currentEventKey ?? null,
        legs: parsed.legs.slice(-MAX_LEGS).map(leg => ({...leg,
          estimated: Boolean(leg.estimated),
          track: Array.isArray(leg.track) ? leg.track.slice(-MAX_TRACK_POINTS_PER_LEG) : []}))};
    }
  } catch (_) {}
  return emptyState(now);
}

// This is presentation metadata only. Planned legs never enter the recorded
// track/mileage collection. Keep the existing 48-hour work-sequence boundary.
function scheduledTripLegCount(events, state, queryWindow) {
  if (!state.legs.length) { state.scheduledLegs = []; return 0; }
  const unique = new Map();
  const windowStart = Date.parse(queryWindow?.startUtc ?? "");
  // Calendar omits events ending at/before timeMin. Retain only that portion
  // of the known trip; events inside the query remain governed by fresh data.
  for (const flight of state.scheduledLegs || []) {
    if (Number.isFinite(windowStart) && flight.end <= windowStart) {
      unique.set(flight.id || flight.key, flight);
    }
  }
  for (const event of events) {
    if (!isWorkFlight(event)) continue;
    const start = Date.parse(eventTime(event, "startUtc") ?? "");
    const end = Date.parse(eventTime(event, "endUtc") ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    const id = event.id === null || event.id === undefined ? null : String(event.id);
    unique.set(id || eventKey(event), {id, key: eventKey(event), start, end});
  }
  const flights = [...unique.values()].sort((a, b) => a.start - b.start);
  const trips = [];
  for (const flight of flights) {
    let trip = trips[trips.length - 1];
    if (!trip || flight.start - trip.end > SEQUENCE_GAP_MS) {
      trip = {end: flight.end, flights: []}; trips.push(trip);
    }
    trip.flights.push(flight); trip.end = Math.max(trip.end, flight.end);
  }
  const current = state.legs.find(leg => leg.eventKey === state.currentEventKey);
  const anchors = current ? [current, ...state.legs.slice().reverse()] : state.legs.slice().reverse();
  for (const leg of anchors) {
    const trip = trips.find(group => group.flights.some(flight =>
      flight.key === leg.eventKey || (flight.id !== null && leg.eventId !== null &&
        leg.eventId !== undefined && flight.id === String(leg.eventId))));
    if (trip) { state.scheduledLegs = trip.flights; return trip.flights.length; }
  }
  // Never substitute a different upcoming trip when this sequence is absent
  // from the available Calendar window. Clients can identify recorded-only data.
  return null;
}

function publicSummary(state) {
  const legs = state.legs.map(leg => ({
    eventKey: leg.eventKey, eventId: leg.eventId, travelRole: leg.travelRole,
    isDeadhead: leg.isDeadhead, flightNumber: leg.flightNumber, origin: leg.origin,
    destination: leg.destination, startUtc: leg.startUtc, endUtc: leg.endUtc,
    completed: Boolean(leg.completed), estimated: Boolean(leg.estimated),
    track: leg.track, distanceNm: Math.round((leg.distanceNm ?? 0) * 10) / 10
  }));
  return {
    startedAt: state.startedAt,
    lastActivityAt: state.lastActivityAt,
    currentEventKey: state.currentEventKey ?? null,
    totalDistanceNm: Math.round(legs.reduce((sum, leg) => sum + leg.distanceNm, 0) * 10) / 10,
    legCount: legs.length,
    scheduledLegCount: Number.isSafeInteger(state.scheduledLegCount) && state.scheduledLegCount >= 0 ? state.scheduledLegCount : null,
    completedLegCount: legs.filter(leg => leg.completed).length,
    estimatedLegCount: legs.filter(leg => leg.estimated).length,
    legs
  };
}

function createSequenceHistoryService(storage, options = {}) {
  const clock = options.now || Date.now;
  let state = parseState(storage, clock());
  let calendarEvents = null;
  let calendarWindow = null;

  function save() {
    if (calendarEvents) state.scheduledLegCount = scheduledTripLegCount(calendarEvents, state, calendarWindow);
    storage[STORAGE_KEY] = JSON.stringify(state);
  }

  function expireIfNeeded(now) {
    const last = Date.parse(state.lastActivityAt ?? "");
    if (Number.isFinite(last) && now - last > SEQUENCE_GAP_MS) {
      state = emptyState(now); save(); return true;
    }
    return false;
  }

  function backfill(events, queryWindow) {
    if (Array.isArray(events)) { calendarEvents = events; calendarWindow = queryWindow; }
    const now = clock();
    expireIfNeeded(now);
    const candidates = (Array.isArray(events) ? events : [])
      .filter(isWorkFlight)
      .filter(event => {
        const end = Date.parse(eventTime(event, "endUtc") ?? "");
        return Number.isFinite(end) && end <= now && now - end <= SEQUENCE_GAP_MS;
      })
      .sort((a, b) => Date.parse(eventTime(a, "startUtc") ?? "") - Date.parse(eventTime(b, "startUtc") ?? ""));

    if (!candidates.length) { save(); return publicSummary(state); }
    for (const event of candidates) {
      const key = eventKey(event);
      if (!key) continue;

      // A leg can already exist because DadRadar tracked it in flight but never
      // observed the brief ARRIVED/LANDED state before advancing. Once the
      // scheduled leg is in the past, reconcile that stored leg as complete
      // instead of leaving the family-facing counter permanently behind.
      const existingLeg = state.legs.find(leg => leg.eventKey === key);
      if (existingLeg) {
        existingLeg.completed = true;
        existingLeg.endUtc = eventTime(event, "endUtc") ?? existingLeg.endUtc;
        continue;
      }

      const miles = greatCircleForEvent(event);
      state.legs.push({
        eventKey: key,
        eventId: event.id ?? null,
        travelRole: event.travelRole ?? (event.isDeadhead ? "deadhead" : "operating"),
        isDeadhead: Boolean(event.isDeadhead || event.travelRole === "deadhead"),
        flightNumber: event.flightNumber ?? null,
        origin: event.origin ?? null,
        destination: event.destination ?? null,
        startUtc: eventTime(event, "startUtc"),
        endUtc: eventTime(event, "endUtc"),
        completed: true,
        estimated: true,
        track: [],
        distanceNm: miles
      });
    }
    state.legs = state.legs.slice(-MAX_LEGS);
    if (state.legs.length) {
      state.startedAt = state.startedAt ?? state.legs[0].startUtc ?? new Date(now).toISOString();
      state.lastActivityAt = state.legs[state.legs.length - 1].endUtc ?? new Date(now).toISOString();
      state.updatedAt = new Date(now).toISOString();
      save();
    }
    return publicSummary(state);
  }

  function update(resolved) {
    const now = clock();
    expireIfNeeded(now);
    const event = resolved?.event;
    if (!isWorkFlight(event)) {
      state.currentEventKey = null;
      state.updatedAt = new Date(now).toISOString();
      save();
      return publicSummary(state);
    }
    const key = eventKey(event);
    state.currentEventKey = key;
    let leg = state.legs.find(candidate => candidate.eventKey === key);
    if (!leg) {
      leg = {eventKey: key, eventId: event.id ?? null,
        travelRole: event.travelRole ?? (event.isDeadhead ? "deadhead" : "operating"),
        isDeadhead: Boolean(event.isDeadhead || event.travelRole === "deadhead"),
        flightNumber: event.flightNumber ?? resolved?.state?.flight?.number ?? null,
        origin: event.origin ?? resolved?.state?.flight?.origin ?? null,
        destination: event.destination ?? resolved?.state?.flight?.destination ?? null,
        startUtc: eventTime(event, "startUtc"), endUtc: eventTime(event, "endUtc"),
        completed: false, estimated: false, track: [], distanceNm: 0};
      state.legs.push(leg);
      state.legs = state.legs.slice(-MAX_LEGS);
      if (!state.startedAt) state.startedAt = leg.startUtc ?? new Date(now).toISOString();
    }
    const liveTrack = resolved?.state?.flight?.actualTrack;
    if (Array.isArray(liveTrack) && liveTrack.length) {
      leg.track = mergeTrack(leg.track, liveTrack);
      leg.distanceNm = trackDistanceNm(leg.track);
      leg.estimated = false;
      state.lastActivityAt = new Date(now).toISOString();
    } else if (["BOARDING","DELAYED","TAXI_OUT","EN_ROUTE","APPROACH","LANDING","TAXI_IN","ARRIVED"]
      .includes(String(resolved?.mode ?? "").toUpperCase())) {
      state.lastActivityAt = new Date(now).toISOString();
    }
    const phase = String(resolved?.state?.livePhase ?? resolved?.mode ?? "").toUpperCase();
    if (["ARRIVED", "LANDED"].includes(phase)) leg.completed = true;
    leg.endUtc = eventTime(event, "endUtc") ?? leg.endUtc;
    state.updatedAt = new Date(now).toISOString();
    save();
    return publicSummary(state);
  }

  function read() { expireIfNeeded(clock()); return publicSummary(state); }
  return {update, read, backfill, eventKey};
}

module.exports = {STORAGE_KEY, SEQUENCE_GAP_MS, MAX_LEGS, MAX_TRACK_POINTS_PER_LEG,
  createSequenceHistoryService, distanceNm, eventKey, isWorkFlight, trackDistanceNm};
