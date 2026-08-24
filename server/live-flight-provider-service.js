"use strict";

const adsbLol = require("./adsb-lol-service");
const flightradar24 = require("./flightradar24-service");
const flightaware = require("./flightaware-route-service");

function providerOrder(hint) {
  return hint === "flightradar24"
    ? ["flightradar24", "adsb.lol"]
    : ["adsb.lol", "flightradar24"];
}

async function getLiveFlightSnapshot(lookup, options = {}) {
  const attempts = [];

  for (const provider of providerOrder(lookup?.provider)) {
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
        try {
          const filedRoute = await (
            options.routeLookup ?? flightaware.getFiledRoute
          )(snapshot, lookup, options.routeOptions);
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
        return { snapshot, attempts };
      }
    } catch (error) {
      attempts.push({ provider, outcome: "error", error: error.message });

      const isFr24NotConfigured =
        error instanceof flightradar24.Flightradar24ConfigurationError;

      if (!isFr24NotConfigured && options.onProviderError) {
        options.onProviderError(provider, error);
      }
    }
  }

  return { snapshot: null, attempts };
}

module.exports = {
  getLiveFlightSnapshot,
  providerOrder
};
