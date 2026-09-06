"use strict";

const fs = require("fs");
const path = require("path");

const airportCatalog = require(
  "../data/airport-catalog"
);

const {
  DEFAULT_SEQUENCE_GAP_MS,
  eventEnd,
  eventFingerprint,
  eventStart,
  isWorkFlight
} = require(
  "../models/sequence-history"
);

const {
  distanceNauticalMiles
} = require("./flightradar24-service");

const DEFAULT_STATE_PATH = path.join(
  __dirname,
  "..",
  "runtime",
  "sequence-history.json"
);

const MAX_LEGS = 24;
const MAX_TRACK_POINTS_PER_LEG = 1800;

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function finiteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function statePath(options = {}) {
  return options.statePath ??
    process.env.DAD_RADAR_SEQUENCE_HISTORY_FILE ??
    DEFAULT_STATE_PATH;
}

function normalizeTrackPoint(rawPoint) {
  const latitude = finiteNumber(
    rawPoint?.latitude ?? rawPoint?.lat
  );

  const longitude = finiteNumber(
    rawPoint?.longitude ?? rawPoint?.lon
  );

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const recordedAt =
    toDate(
      rawPoint?.recordedAt ??
      rawPoint?.timestamp
    )?.toISOString() ?? null;

  return {
    latitude,
    longitude,
    altitudeFeet:
      finiteNumber(
        rawPoint?.altitudeFeet ??
        rawPoint?.alt
      ),
    recordedAt
  };
}

function pointIdentity(point) {
  return [
    point.recordedAt ?? "",
    point.latitude.toFixed(5),
    point.longitude.toFixed(5)
  ].join("|");
}

function mergeTrackPoints(
  existingPoints,
  incomingPoints
) {
  const merged = [];
  const identities = new Set();

  for (const rawPoint of [
    ...(Array.isArray(existingPoints)
      ? existingPoints
      : []),
    ...(Array.isArray(incomingPoints)
      ? incomingPoints
      : [])
  ]) {
    const point = normalizeTrackPoint(
      rawPoint
    );

    if (!point) {
      continue;
    }

    const identity = pointIdentity(point);

    if (identities.has(identity)) {
      continue;
    }

    identities.add(identity);
    merged.push(point);
  }

  merged.sort((left, right) => {
    const leftTime =
      toDate(left.recordedAt)?.getTime() ??
      Number.POSITIVE_INFINITY;

    const rightTime =
      toDate(right.recordedAt)?.getTime() ??
      Number.POSITIVE_INFINITY;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return pointIdentity(left)
      .localeCompare(pointIdentity(right));
  });

  return merged.slice(
    -MAX_TRACK_POINTS_PER_LEG
  );
}

function safeReadState(options = {}) {
  const filePath = statePath(options);

  try {
    const data = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );

    return data &&
      typeof data === "object" &&
      Array.isArray(data.legs)
      ? data
      : null;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    console.warn(
      "Dad Radar sequence-history state could not be read; starting clean:",
      error.message
    );
    return null;
  }
}

function writeState(state, options = {}) {
  const filePath = statePath(options);
  const directory = path.dirname(filePath);
  const temporaryPath = `${filePath}.tmp`;

  fs.mkdirSync(
    directory,
    { recursive: true }
  );

  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8"
  );

  fs.renameSync(
    temporaryPath,
    filePath
  );
}

function clearState(options = {}) {
  const filePath = statePath(options);

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function activityDateForEvent(
  event,
  providedNow
) {
  const now =
    toDate(providedNow) ??
    new Date();

  const start = eventStart(event);
  const end = eventEnd(event);

  if (start && now < start) {
    return start;
  }

  if (end && now > end) {
    return end;
  }

  return now;
}

function isExpired(
  state,
  providedNow,
  gapMs = DEFAULT_SEQUENCE_GAP_MS
) {
  const now =
    toDate(providedNow) ??
    new Date();

  const lastActivityAt =
    toDate(state?.lastActivityAt);

  if (!lastActivityAt) {
    return true;
  }

  return now.getTime() -
    lastActivityAt.getTime() > gapMs;
}

function newSequenceState(
  event,
  activityAt
) {
  return {
    version: 1,
    id:
      `sequence:${eventFingerprint(event)}`,
    startedAt:
      eventStart(event)?.toISOString() ??
      activityAt.toISOString(),
    lastActivityAt:
      activityAt.toISOString(),
    updatedAt:
      new Date().toISOString(),
    legs: []
  };
}

function createLeg(event) {
  return {
    fingerprint:
      eventFingerprint(event),
    eventId:
      event.id ?? null,
    travelRole:
      event.travelRole ??
      (event.isDeadhead
        ? "deadhead"
        : "operating"),
    carrierCode:
      event.carrierCode ?? null,
    flightNumber:
      event.flightNumber ?? null,
    origin: event.origin ?? null,
    destination:
      event.destination ?? null,
    startUtc:
      eventStart(event)?.toISOString() ??
      null,
    endUtc:
      eventEnd(event)?.toISOString() ??
      null,
    providerFlightId: null,
    seedAttemptedProviderId: null,
    track: []
  };
}

function ensureLeg(state, event) {
  const fingerprint =
    eventFingerprint(event);

  let leg = state.legs.find(
    (candidate) =>
      candidate.fingerprint === fingerprint
  );

  if (leg) {
    return leg;
  }

  const staleSameEventIndex =
    state.legs.findIndex(
      (candidate) =>
        event.id &&
        candidate.eventId === event.id &&
        (!Array.isArray(candidate.track) ||
          candidate.track.length === 0)
    );

  if (staleSameEventIndex >= 0) {
    state.legs.splice(
      staleSameEventIndex,
      1
    );
  }

  leg = createLeg(event);
  state.legs.push(leg);

  if (state.legs.length > MAX_LEGS) {
    state.legs = state.legs.slice(
      -MAX_LEGS
    );
  }

  return leg;
}

function prepareStateForEvent(
  event,
  options = {}
) {
  if (!isWorkFlight(event)) {
    return {
      state: safeReadState(options),
      leg: null,
      changed: false
    };
  }

  const now =
    toDate(options.now) ??
    new Date();

  const activityAt =
    activityDateForEvent(
      event,
      now
    );

  let state = safeReadState(options);

  if (
    !state ||
    isExpired(
      state,
      activityAt,
      options.gapMs ??
        DEFAULT_SEQUENCE_GAP_MS
    )
  ) {
    state = newSequenceState(
      event,
      activityAt
    );
  }

  const leg = ensureLeg(
    state,
    event
  );

  const previousActivity =
    toDate(state.lastActivityAt);

  if (
    !previousActivity ||
    activityAt > previousActivity
  ) {
    state.lastActivityAt =
      activityAt.toISOString();
  }

  state.updatedAt =
    now.toISOString();

  return {
    state,
    leg,
    changed: true
  };
}

function airportPosition(code) {
  const airport =
    airportCatalog.lookupAirport(code);

  if (!airport) {
    return null;
  }

  return {
    latitude: airport.latitude,
    longitude: airport.longitude
  };
}

function observedDistanceNm(track) {
  let distance = 0;

  for (
    let index = 1;
    index < track.length;
    index += 1
  ) {
    const segment =
      distanceNauticalMiles(
        track[index - 1],
        track[index]
      );

    if (segment !== null) {
      distance += segment;
    }
  }

  return distance;
}

function distanceSummaryForLeg(
  leg,
  providedNow
) {
  const now =
    toDate(providedNow) ??
    new Date();

  const track = Array.isArray(leg.track)
    ? leg.track
    : [];

  if (track.length >= 2) {
    return {
      miles: observedDistanceNm(track),
      source: "observed"
    };
  }

  const origin =
    airportPosition(leg.origin);

  const destination =
    airportPosition(leg.destination);

  if (!origin || !destination) {
    return {
      miles: 0,
      source: "unavailable"
    };
  }

  if (track.length === 1) {
    return {
      miles:
        distanceNauticalMiles(
          origin,
          track[0]
        ) ?? 0,
      source: "observed-partial"
    };
  }

  const end = toDate(leg.endUtc);

  if (end && end <= now) {
    return {
      miles:
        distanceNauticalMiles(
          origin,
          destination
        ) ?? 0,
      source: "route-fallback"
    };
  }

  return {
    miles: 0,
    source: "pending"
  };
}

function summarizeState(
  state,
  options = {}
) {
  if (!state) {
    return null;
  }

  const now =
    toDate(options.now) ??
    new Date();

  const gapMs =
    options.gapMs ??
    DEFAULT_SEQUENCE_GAP_MS;

  const legs = state.legs.map((leg) => {
    const distance =
      distanceSummaryForLeg(
        leg,
        now
      );

    return {
      ...leg,
      track: Array.isArray(leg.track)
        ? leg.track
        : [],
      distanceNm:
        Math.round(
          distance.miles * 10
        ) / 10,
      distanceSource:
        distance.source
    };
  });

  const totalNm = legs.reduce(
    (sum, leg) =>
      sum + Number(leg.distanceNm || 0),
    0
  );

  const lastActivityAt =
    toDate(state.lastActivityAt);

  return {
    id: state.id,
    startedAt: state.startedAt,
    lastActivityAt:
      state.lastActivityAt,
    expiresAt:
      lastActivityAt
        ? new Date(
            lastActivityAt.getTime() +
            gapMs
          ).toISOString()
        : null,
    totalDistanceNm:
      Math.round(totalNm * 10) / 10,
    hasEstimatedDistance:
      legs.some(
        (leg) =>
          leg.distanceSource ===
            "route-fallback"
      ),
    legs
  };
}

function getCurrentSequenceHistory(
  options = {}
) {
  const state = safeReadState(options);

  if (!state) {
    return null;
  }

  if (
    isExpired(
      state,
      options.now,
      options.gapMs ??
        DEFAULT_SEQUENCE_GAP_MS
    )
  ) {
    clearState(options);
    return null;
  }

  return summarizeState(
    state,
    options
  );
}

function registerWorkFlight(
  event,
  options = {}
) {
  if (!isWorkFlight(event)) {
    return getCurrentSequenceHistory(
      options
    );
  }

  const prepared =
    prepareStateForEvent(
      event,
      options
    );

  writeState(
    prepared.state,
    options
  );

  return summarizeState(
    prepared.state,
    options
  );
}

function needsTrackSeed(
  event,
  providerFlightId,
  options = {}
) {
  const flightId = String(
    providerFlightId ?? ""
  ).trim();

  if (!isWorkFlight(event) || !flightId) {
    return false;
  }

  const prepared =
    prepareStateForEvent(
      event,
      options
    );

  const leg = prepared.leg;

  return Boolean(
    leg &&
    leg.seedAttemptedProviderId !== flightId
  );
}

function recordLiveSnapshot(
  event,
  liveFlight,
  options = {}
) {
  if (!isWorkFlight(event)) {
    return getCurrentSequenceHistory(
      options
    );
  }

  const observedAt =
    toDate(
      liveFlight?.position?.recordedAt ??
      liveFlight?.retrievedAt ??
      options.now
    ) ?? new Date();

  const prepared =
    prepareStateForEvent(
      event,
      {
        ...options,
        now: observedAt
      }
    );

  const state = prepared.state;
  const leg = prepared.leg;

  const providerFlightId = String(
    liveFlight?.providerFlightId ?? ""
  ).trim();

  if (providerFlightId) {
    leg.providerFlightId =
      providerFlightId;
  }

  if (options.seedAttempted) {
    leg.seedAttemptedProviderId =
      providerFlightId ||
      leg.seedAttemptedProviderId;
  }

  const livePoint =
    normalizeTrackPoint({
      ...liveFlight?.position,
      recordedAt:
        liveFlight?.position?.recordedAt ??
        liveFlight?.retrievedAt
    });

  leg.track = mergeTrackPoints(
    leg.track,
    [
      ...(Array.isArray(options.seedTrack)
        ? options.seedTrack
        : []),
      livePoint
    ].filter(Boolean)
  );

  const previousActivity =
    toDate(state.lastActivityAt);

  if (
    !previousActivity ||
    observedAt > previousActivity
  ) {
    state.lastActivityAt =
      observedAt.toISOString();
  }

  state.updatedAt =
    new Date().toISOString();

  writeState(state, options);

  return summarizeState(
    state,
    {
      ...options,
      now: observedAt
    }
  );
}

module.exports = {
  DEFAULT_STATE_PATH,
  MAX_LEGS,
  MAX_TRACK_POINTS_PER_LEG,
  clearState,
  getCurrentSequenceHistory,
  mergeTrackPoints,
  needsTrackSeed,
  normalizeTrackPoint,
  recordLiveSnapshot,
  registerWorkFlight,
  summarizeState
};