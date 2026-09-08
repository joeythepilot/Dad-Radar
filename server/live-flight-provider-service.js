"use strict";

const adsbLol = require("./adsb-lol-service");
const flightradar24 = require("./flightradar24-service");
const flightaware = require("./flightaware-route-service");

const ADSB_LOL_FORBIDDEN_COOLDOWN_MS =
  15 * 60 * 1000;

const ADSB_LOL_RATE_LIMIT_COOLDOWN_MS = 60000;
let adsbLolCooldownUntil = 0;
function noteAdsbFailure(error, now) {
  const delay = error?.status === 403 ? ADSB_LOL_FORBIDDEN_COOLDOWN_MS :
    error?.status === 429 ? ADSB_LOL_RATE_LIMIT_COOLDOWN_MS : 0;
  if (delay) adsbLolCooldownUntil = Math.max(adsbLolCooldownUntil, now + delay);
}

function adsbLolIsCoolingDown(now = Date.now()) {
  return now < adsbLolCooldownUntil;
}

function resetProviderCooldowns() {
  adsbLolCooldownUntil = 0;
}

function providerOrder(hint) {
  return hint === "flightradar24"
    ? ["flightradar24", "adsb.lol"]
    : ["adsb.lol", "flightradar24"];
}

async function getLiveFlightSnapshot(lookup, options = {}) {
  const attempts = [];
  if (lookup?.surfaceOnly === true) {
    // Arrival follow-up must never invoke paid telemetry or filed-route providers.
    if (adsbLolIsCoolingDown(options.now?.() ?? Date.now())) {
      return {snapshot: null, filedRoute: null, attempts: [{provider: "adsb.lol", outcome: "cooldown"}]};
    }
    try {
      const snapshot = await (options.adsbLookup ?? adsbLol.getLiveFlightSnapshot)(lookup, options.adsbOptions);
      return {snapshot, filedRoute: null, attempts: [{provider: "adsb.lol", outcome: snapshot ? "matched" : "no-match"}]};
    } catch (error) {
      noteAdsbFailure(error, options.now?.() ?? Date.now());
      options.onProviderError?.("adsb.lol", error);
      return {snapshot: null, filedRoute: null, attempts: [{provider: "adsb.lol", outcome: "error"}]};
    }
  }
  const routeLookup =
    options.routeLookup ??
    flightaware.getFiledRoute;

  // Route acquisition starts immediately but does not
  // block live position acquisition.
  const preflightRoutePromise =
    (async () => {
      try {
        const route = await routeLookup(
          null,
          lookup,
          options.routeOptions
        );

        return {
          route,
          attempt: {
            provider:
              "flightaware-route",
            outcome: route
              ? "preflight-matched"
              : "preflight-no-match"
          }
        };
      } catch (error) {
        if (options.onProviderError) {
          options.onProviderError(
            "flightaware-route",
            error
          );
        }

        return {
          route: null,
          attempt: {
            provider:
              "flightaware-route",
            outcome: "error",
            error: error.message
          }
        };
      }
    })();

  for (const provider of providerOrder(lookup?.provider)) {
    if (
      provider === "adsb.lol" &&
      adsbLolIsCoolingDown(
        options.now?.() ?? Date.now()
      )
    ) {
      attempts.push({
        provider,
        outcome: "cooldown"
      });
      continue;
    }

    try {
      const providerLookup = {
        ...lookup,
        providerFlightId:
          lookup?.provider === provider
            ? lookup.providerFlightId
            : null
      };
      const snapshot = provider === "adsb.lol"
        ? await (options.adsbLookup ?? adsbLol.getLiveFlightSnapshot)(providerLookup, options.adsbOptions)
        : await (options.fr24Lookup ?? flightradar24.getLiveFlightSnapshot)(providerLookup, options.fr24Options);

      attempts.push({ provider, outcome: snapshot ? "matched" : "no-match" });

      if (snapshot) {
        const preflight =
          await preflightRoutePromise;
        let filedRoute =
          preflight.route;

        attempts.unshift(
          preflight.attempt
        );

        if (!filedRoute) {
          try {
            filedRoute = await routeLookup(
              snapshot,
              lookup,
              options.routeOptions
            );
            if (filedRoute) {
              snapshot.filedRoute = filedRoute;
              attempts.push({ provider: "flightaware-route", outcome: "matched" });
            }
          } catch (error) {
            attempts.push({ provider: "flightaware-route", outcome: "error", error: error.message });
            if (options.onProviderError) {
              options.onProviderError("flightaware-route", error);
            }
          }
        }

        if (filedRoute) {
          snapshot.filedRoute = filedRoute;
        }

        return { snapshot, filedRoute, attempts };
      }
    } catch (error) {
      attempts.push({ provider, outcome: "error", error: error.message });

      if (provider === "adsb.lol") noteAdsbFailure(error, options.now?.() ?? Date.now());

      const isFr24NotConfigured =
        error instanceof flightradar24.Flightradar24ConfigurationError;

      if (!isFr24NotConfigured && options.onProviderError) {
        options.onProviderError(provider, error);
      }
    }
  }

  const preflight =
    await preflightRoutePromise;

  attempts.unshift(preflight.attempt);

  return {
    snapshot: null,
    filedRoute: preflight.route,
    attempts
  };
}

module.exports = {
  ADSB_LOL_FORBIDDEN_COOLDOWN_MS,
  adsbLolIsCoolingDown,
  getLiveFlightSnapshot,
  providerOrder,
  resetProviderCooldowns
};
