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

  // The pivot is home; the arrow aims from home toward the aircraft.
  // Subtract the aircraft heading because the heading card turns beneath
  // the fixed airplane symbol. A position at home has no geographic bearing.
  function homePointerAngle({home, position, heading = 0}) {
    const latitude = Number(position?.latitude);
    const longitude = Number(position?.longitude);
    const homeLatitude = Number(home?.latitude);
    const homeLongitude = Number(home?.longitude);
    if (!position || !home || [
      position.latitude, position.longitude, home.latitude, home.longitude
    ].some(value => value === null || value === undefined || value === "") || ![
      latitude, longitude, homeLatitude, homeLongitude
    ].every(Number.isFinite) ||
      Math.abs(latitude) > 90 || Math.abs(homeLatitude) > 90 ||
      Math.abs(longitude) > 180 || Math.abs(homeLongitude) > 180) {
      return null;
    }

    const radians = Math.PI / 180;
    const deltaLatitude = (latitude - homeLatitude) * radians;
    const deltaLongitude = (longitude - homeLongitude) * radians;
    const distance = 2 * Math.asin(Math.min(1, Math.sqrt(
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(homeLatitude * radians) * Math.cos(latitude * radians) *
      Math.sin(deltaLongitude / 2) ** 2
    )));
    // Within roughly a mile of home airport, settle upright rather than
    // chasing position noise or the last reported taxi heading.
    if (distance < 1.6 / 6371) {
      return 0;
    }
    const y = Math.sin(deltaLongitude) * Math.cos(latitude * radians);
    const x = Math.cos(homeLatitude * radians) * Math.sin(latitude * radians) -
      Math.sin(homeLatitude * radians) * Math.cos(latitude * radians) *
      Math.cos(deltaLongitude);
    const bearing = Math.atan2(y, x) / radians;
    const relative = bearing - (Number.isFinite(Number(heading)) ? Number(heading) : 0);
    return ((relative + 540) % 360) - 180;
  }

  function homePointerPosition(state, lookupAirportCoordinates) {
    const flight = state?.flight;
    const arrived = String(state?.status ?? "").toUpperCase() === "ARRIVED";
    const groundAirport = state?.locationAirport ?? (arrived ? flight?.destination : null);
    const ground = !flight || arrived;
    if (ground && groundAirport) {
      return lookupAirportCoordinates(groundAirport) ?? null;
    }
    if (flight && Number.isFinite(flight.latitude) &&
      Number.isFinite(flight.longitude)) {
      return {latitude: flight.latitude, longitude: flight.longitude};
    }
    return null;
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
    flightForInstruments,
    homePointerAngle,
    homePointerPosition
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
