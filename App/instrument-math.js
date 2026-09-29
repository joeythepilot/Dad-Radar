/* =========================================================
   DAD RADAR
   Pure instrument-display calculations
   ========================================================= */

(function initializeInstrumentMath(root) {
  "use strict";

  function flightForInstruments(state) {
    return String(state?.status ?? "").toUpperCase() === "ARRIVED"
      ? null
      : state?.flight ?? null;
  }

  function altimeterNeedleAngles(
    rawAltitude
  ) {
    const altitude =
      Math.max(
        Number(rawAltitude) || 0,
        0
      );

    return {
      /* Long pointer: hundreds of feet. */
      hundredsAngle:
        altitude / 1000 * 360,

      /* Short broad pointer: thousands. */
      thousandsAngle:
        altitude / 10000 * 360,

      /* Small triangle: tens of thousands. */
      tenThousandsAngle:
        altitude / 100000 * 360
    };
  }

  const api = {
    altimeterNeedleAngles,
    flightForInstruments
  };

  if (
    typeof module !== "undefined" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarInstrumentMath =
      api;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this
);
