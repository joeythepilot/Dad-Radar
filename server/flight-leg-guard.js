"use strict";

const {lookupAirport} = require("../data/airport-catalog");
const {distanceNauticalMiles} = require("./flightradar24-service");

const STORAGE_KEY = "dad-radar.flight-leg-guard.v1";
const number = value => value === null || value === undefined || value === "" ? null :
  Number.isFinite(Number(value)) ? Number(value) : null;
const upper = value => String(value ?? "").trim().toUpperCase();

function legKey(event) {
  return JSON.stringify([event.id ?? null, upper(event.origin), upper(event.destination),
    event.times?.startUtc ?? event.startUtc, event.liveLookupCandidates ?? []]);
}

function bearing(from, to) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitude1 = radians(from.latitude), latitude2 = radians(to.latitude);
  const delta = radians(to.longitude - from.longitude);
  return (Math.atan2(Math.sin(delta) * Math.cos(latitude2),
    Math.cos(latitude1) * Math.sin(latitude2) - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(delta)) * 180 / Math.PI + 360) % 360;
}

// A callsign and an aircraft hex are not flight-instance identifiers. Keep
// continuity for the scheduled leg, independently of the provider's inferred phase.
function createFlightLegGuard(storage) {
  let saved;
  try {saved = JSON.parse(storage[STORAGE_KEY] || "null");} catch (_) { /* First use. */ }
  let state = saved?.version === 1 ? saved : null;
  function save() {storage[STORAGE_KEY] = JSON.stringify(state);}

  return {
    complete(event) {
      if (state?.key === legKey(event)) {state.closed = true; save();}
    },
    inspect(event, snapshot, now = Date.now()) {
      const key = legKey(event);
      if (state?.key !== key) state = {version: 1, key};
      const reject = (reason, uncertain = false) => ({accepted: false, reason, uncertain});
      if (state.closed) return reject("completed-leg");
      if ((snapshot.origin && upper(snapshot.origin) !== upper(event.origin)) ||
          (snapshot.destination && upper(snapshot.destination) !== upper(event.destination))) {
        return reject("different-route");
      }

      const point = snapshot.position;
      const at = Date.parse(point?.recordedAt ?? "");
      const latitude = number(point?.latitude), longitude = number(point?.longitude);
      if (!Number.isFinite(at) || now - at > 90000 || at - now > 5000 ||
          latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        // Stale reports cannot change the association; the state model handles freshness.
        return {accepted: true};
      }
      const origin = lookupAirport(event.origin), destination = lookupAirport(event.destination);
      if (!origin || !destination) return {accepted: true};
      const distanceFromOrigin = distanceNauticalMiles(point, origin);
      const distanceToDestination = distanceNauticalMiles(point, destination);
      const altitude = number(point.altitudeFeet);
      const speed = number(point.groundSpeedKnots);
      const heading = number(point.headingDegrees);
      const elevation = number(destination.elevationFeet);
      const agl = altitude !== null && elevation !== null ? altitude - elevation : null;
      const airborne = point.onGround === false ||
        (point.onGround !== true && agl !== null && agl > 1500 && speed > 100);
      const headingDifference = heading === null ? null :
        Math.abs((heading - bearing(point, destination) + 540) % 360 - 180);
      const away = headingDifference !== null && headingDifference > 110 && speed > 100;
      const registration = upper(snapshot.aircraft?.registration);
      const hex = snapshot.provider === "adsb.lol" ? upper(snapshot.providerFlightId) : "";

      if ((state.airborne || state.groundAt) && ((state.registration && registration && state.registration !== registration) ||
          (state.hex && hex && state.hex !== hex))) {
        return reject("different-aircraft");
      }

      // After destination ground contact, later high/fast reports must not turn
      // the completed inbound leg into the return flight. Allow an immediate
      // touch-and-go/bounce to remain an airborne event rather than closing it.
      if (state.groundAt && airborne && at - state.groundAt >= 120000 &&
          (distanceToDestination > 4 || agl > 1500 || speed > 80)) {
        return reject("departure-after-destination-ground");
      }

      const callsignOnly = snapshot.provider === "adsb.lol" || snapshot.routeSource === "schedule";
      if (callsignOnly && !state.airborne && airborne && away &&
          distanceFromOrigin > 15 && distanceToDestination > 10) {
        // A new session cannot attach an aircraft travelling in the reverse
        // direction merely because the callsign matches. Wait for better evidence.
        return reject("direction-unconfirmed", true);
      }
      if (callsignOnly && state.approachAt && at - state.approachAt >= 600000 &&
          airborne && away && distanceToDestination > 12) {
        // Could be a later leg or a go-around. Neither proves a gate arrival.
        return reject("post-approach-association-unconfirmed", true);
      }

      if (airborne) {
        state.airborne = true;
        if (registration) state.registration = registration;
        if (hex) state.hex = hex;
        if (state.groundAt && at - state.groundAt < 120000) delete state.groundAt;
      }
      if (point.onGround === true && distanceToDestination < 4) {
        state.groundAt ??= at;
        if (registration) state.registration = registration;
        if (hex) state.hex = hex;
      }
      const verticalRate = number(point.verticalSpeedFeetPerMinute);
      if (distanceToDestination <= 6 && agl !== null && agl <= 2500 && speed !== null && speed <= 200 &&
          (verticalRate !== null ? verticalRate < -100 : /^(D|DOWN|DESCENDING)$/.test(upper(point.altitudeTrend)))) {
        state.approachAt = at;
      }
      save();
      return {accepted: true};
    }
  };
}

module.exports = {createFlightLegGuard, legKey};
