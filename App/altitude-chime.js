(function initializeAltitudeChime(root, factory) {
  const api = factory(root);

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarAltitudeChime =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createAltitudeChimeApi(root) {
    "use strict";

    const DEFAULT_THRESHOLD_FEET =
      10000;

    const DEFAULT_VOLUME = 0.7;

    const DEFAULT_HYSTERESIS_FEET =
      500;

    function finiteNumber(value, fallback) {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return fallback;
      }

      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : fallback;
    }

    function createAltitudeChimeController(
      providedOptions = {}
    ) {
      const thresholdFeet = Math.max(
        1,
        finiteNumber(
          providedOptions.thresholdFeet,
          DEFAULT_THRESHOLD_FEET
        )
      );

      const volume = Math.min(
        1,
        Math.max(
          0,
          finiteNumber(
            providedOptions.volume,
            DEFAULT_VOLUME
          )
        )
      );

      const hysteresisFeet = Math.max(
        0,
        finiteNumber(
          providedOptions.hysteresisFeet,
          DEFAULT_HYSTERESIS_FEET
        )
      );

      const audioFactory =
        providedOptions.audioFactory ??
        (
          typeof root?.Audio === "function"
            ? (source) => new root.Audio(source)
            : null
        );

      let audio = null;
      let flightKey = null;
      let previousAltitude = null;
      let hasReachedBelowBand = false;
      let hasReachedAboveBand = false;
      const chimeDirections = new Set();
      const attempts = new Map();
      const now = providedOptions.now ?? Date.now;
      let flightGeneration = 0;

      function ensureAudio() {
        if (!audio && audioFactory) {
          audio = audioFactory(
            providedOptions.source
          );

          if (audio) {
            audio.preload = "auto";
            audio.volume = volume;
          }
        }

        return audio;
      }

      function resetFlight(nextFlightKey) {
        if (nextFlightKey === flightKey) {
          return;
        }

        flightKey = nextFlightKey;
        flightGeneration += 1;
        previousAltitude = null;
        hasReachedBelowBand = false;
        hasReachedAboveBand = false;
        chimeDirections.clear();
        attempts.clear();
      }

      async function play() {
        const instance = ensureAudio();

        if (!instance) {
          return false;
        }

        try {
          instance.pause();
          instance.currentTime = 0;
          instance.volume = volume;

          const result = instance.play();

          if (
            result &&
            typeof result.then === "function"
          ) {
            await result;
          }

          return true;
        } catch {
          return false;
        }
      }

      async function unlock() {
        const instance = ensureAudio();

        if (!instance) {
          return false;
        }

        try {
          instance.volume = 0;
          instance.currentTime = 0;

          const result = instance.play();

          if (
            result &&
            typeof result.then === "function"
          ) {
            await result;
          }

          instance.pause();
          instance.currentTime = 0;
          instance.volume = volume;
          return true;
        } catch {
          instance.volume = volume;
          return false;
        }
      }

      function observe(nextFlightKey, rawAltitude) {
        resetFlight(nextFlightKey);

        const altitude = finiteNumber(
          rawAltitude,
          null
        );

        if (altitude === null) {
          return null;
        }

        const previous = previousAltitude;
        previousAltitude = altitude;

        const belowBand =
          altitude <=
          thresholdFeet - hysteresisFeet;

        const aboveBand =
          altitude >=
          thresholdFeet + hysteresisFeet;

        const direction =
          aboveBand &&
          hasReachedBelowBand
            ? "climb"
            : belowBand &&
                hasReachedAboveBand
              ? "descent"
              : null;

        if (belowBand) {
          hasReachedBelowBand = true;
        }

        if (aboveBand) {
          hasReachedAboveBand = true;
        }

        if (previous === null) {
          return null;
        }

        if (
          !direction ||
          chimeDirections.has(direction)
        ) {
          return null;
        }

        const time = now();
        const attempt = attempts.get(direction) ?? {count: 0, firstAt: time, nextAt: time};
        // Retry transient audio failures promptly, never minutes later or on
        // every interpolated frame. Successful and pending plays remain latched.
        if (attempt.count >= 3 || time - attempt.firstAt > 30000 || time < attempt.nextAt) {
          return null;
        }
        attempt.count += 1;
        attempt.nextAt = time + 5000;
        attempts.set(direction, attempt);
        const generation = flightGeneration;
        chimeDirections.add(direction);
        void play().then((played) => {
          if (!played && generation === flightGeneration) {
            chimeDirections.delete(direction);
          }
        });
        return direction;
      }

      return Object.freeze({
        observe,
        unlock,
        play
      });
    }

    return Object.freeze({
      DEFAULT_THRESHOLD_FEET,
      DEFAULT_VOLUME,
      DEFAULT_HYSTERESIS_FEET,
      createAltitudeChimeController
    });
  }
);
