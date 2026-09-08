(function initializeLiveRefreshSchedule(root) {
  "use strict";

  const ACTIVE_PHASES = Object.freeze([
    "TAXI_OUT",
    "TAXI_IN",
    "EN_ROUTE",
    "APPROACH",
    "LANDING"
  ]);

  function normalizedPhase(liveFlight, resolved) {
    return String(
      liveFlight?.phase ??
      resolved?.state?.livePhase ??
      resolved?.mode ??
      ""
    ).trim().toUpperCase();
  }

  function intervalForState(
    liveFlight,
    resolved,
    options = {}
  ) {
    const idleIntervalMs =
      Number(options.idleIntervalMs) ||
      60 * 1000;
    const activeIntervalMs =
      Number(options.activeIntervalMs) ||
      30 * 1000;

    return ACTIVE_PHASES.includes(
      normalizedPhase(
        liveFlight,
        resolved
      )
    )
      ? activeIntervalMs
      : idleIntervalMs;
  }

  const api = Object.freeze({
    ACTIVE_PHASES,
    intervalForState,
    normalizedPhase
  });

  root.dadRadarLiveRefreshSchedule =
    api;

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this
);
