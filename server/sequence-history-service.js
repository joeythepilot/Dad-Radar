"use strict";

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
  return {
    latitude,
    longitude,
    recordedAt: point?.recordedAt ?? point?.timestamp ?? null
  };
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

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceNm(a, b) {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
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

function emptyState(now) {
  return {
    version: 1,
    startedAt: null,
    lastActivityAt: null,
    currentEventKey: null,
    updatedAt: new Date(now).toISOString(),
    legs: []
  };
}

function parseState(storage, now) {
  try {
    const parsed = JSON.parse(storage[STORAGE_KEY] ?? "null");
    if (parsed?.version === 1 && Array.isArray(parsed.legs)) {
      return {
        ...parsed,
        currentEventKey: parsed.currentEventKey ?? null,
        legs: parsed.legs.slice(-MAX_LEGS).map(leg => ({
          ...leg,
          track: Array.isArray(leg.track)
            ? leg.track.slice(-MAX_TRACK_POINTS_PER_LEG)
            : []
        }))
      };
    }
  } catch (_) {
    // A damaged optional history record should not affect live flight tracking.
  }
  return emptyState(now);
}

function publicSummary(state) {
  const legs = state.legs.map(leg => ({
    eventKey: leg.eventKey,
    eventId: leg.eventId,
    travelRole: leg.travelRole,
    isDeadhead: leg.isDeadhead,
    flightNumber: leg.flightNumber,
    origin: leg.origin,
    destination: leg.destination,
    startUtc: leg.startUtc,
    endUtc: leg.endUtc,
    completed: Boolean(leg.completed),
    track: leg.track,
    distanceNm: Math.round((leg.distanceNm ?? 0) * 10) / 10
  }));

  return {
    startedAt: state.startedAt,
    lastActivityAt: state.lastActivityAt,
    currentEventKey: state.currentEventKey ?? null,
    totalDistanceNm:
      Math.round(legs.reduce((sum, leg) => sum + leg.distanceNm, 0) * 10) / 10,
    legCount: legs.length,
    completedLegCount: legs.filter(leg => leg.completed).length,
    legs
  };
}

function createSequenceHistoryService(storage, options = {}) {
  const clock = options.now || Date.now;
  let state = parseState(storage, clock());

  function save() {
    storage[STORAGE_KEY] = JSON.stringify(state);
  }

  function expireIfNeeded(now) {
    const last = Date.parse(state.lastActivityAt ?? "");
    if (Number.isFinite(last) && now - last > SEQUENCE_GAP_MS) {
      state = emptyState(now);
      save();
      return true;
    }
    return false;
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
      leg = {
        eventKey: key,
        eventId: event.id ?? null,
        travelRole: event.travelRole ?? (event.isDeadhead ? "deadhead" : "operating"),
        isDeadhead: Boolean(event.isDeadhead || event.travelRole === "deadhead"),
        flightNumber: event.flightNumber ?? resolved?.state?.flight?.number ?? null,
        origin: event.origin ?? resolved?.state?.flight?.origin ?? null,
        destination: event.destination ?? resolved?.state?.flight?.destination ?? null,
        startUtc: eventTime(event, "startUtc"),
        endUtc: eventTime(event, "endUtc"),
        completed: false,
        track: [],
        distanceNm: 0
      };
      state.legs.push(leg);
      state.legs = state.legs.slice(-MAX_LEGS);
      if (!state.startedAt) {
        state.startedAt = leg.startUtc ?? new Date(now).toISOString();
      }
    }

    const liveTrack = resolved?.state?.flight?.actualTrack;
    if (Array.isArray(liveTrack) && liveTrack.length) {
      leg.track = mergeTrack(leg.track, liveTrack);
      leg.distanceNm = trackDistanceNm(leg.track);
      state.lastActivityAt = new Date(now).toISOString();
    } else if ([
      "BOARDING", "DELAYED", "TAXI_OUT", "EN_ROUTE", "APPROACH",
      "LANDING", "TAXI_IN", "ARRIVED"
    ].includes(String(resolved?.mode ?? "").toUpperCase())) {
      state.lastActivityAt = new Date(now).toISOString();
    }

    const phase = String(
      resolved?.state?.livePhase ?? resolved?.mode ?? ""
    ).toUpperCase();
    if (["ARRIVED", "LANDED"].includes(phase)) leg.completed = true;

    leg.endUtc = eventTime(event, "endUtc") ?? leg.endUtc;
    state.updatedAt = new Date(now).toISOString();
    save();
    return publicSummary(state);
  }

  function read() {
    expireIfNeeded(clock());
    return publicSummary(state);
  }

  return {update, read, eventKey};
}

module.exports = {
  STORAGE_KEY,
  SEQUENCE_GAP_MS,
  MAX_LEGS,
  MAX_TRACK_POINTS_PER_LEG,
  createSequenceHistoryService,
  distanceNm,
  eventKey,
  isWorkFlight,
  trackDistanceNm
};
