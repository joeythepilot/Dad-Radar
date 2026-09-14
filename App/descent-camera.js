(function installDadRadarDescentCamera(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;

  const svg = root.document.getElementById("route-map-svg");
  if (!svg) return;

  let flightKey = null;
  let peakAltitude = null;
  let previousAltitude = null;
  let baseCamera = null;
  let descending = false;

  function reset(nextKey) {
    flightKey = nextKey;
    peakAltitude = null;
    previousAltitude = null;
    baseCamera = null;
    descending = false;
  }

  function parseCamera() {
    const values = String(svg.getAttribute("viewBox") || "")
      .trim().split(/\s+/).map(Number);
    if (values.length !== 4 || values.some(value => !Number.isFinite(value))) return null;
    return {x: values[0], y: values[1], width: values[2], height: values[3]};
  }

  function project(longitude, latitude) {
    return api.projectPoint(longitude, latitude);
  }

  root.addEventListener("dad-radar:visual-state-change", event => {
    const state = event.detail?.state;
    const flight = state?.flight;
    if (!flight || svg.style.visibility === "hidden") return;

    const key = [flight.flightNumber ?? "", flight.origin ?? "", flight.destination ?? ""]
      .map(value => String(value).toUpperCase()).join("|");
    if (key !== flightKey) reset(key);

    const altitude = api.finiteNumber(flight.altitude);
    const latitude = api.finiteNumber(flight.latitude);
    const longitude = api.finiteNumber(flight.longitude);
    if (altitude === null || latitude === null || longitude === null) return;

    peakAltitude = peakAltitude === null ? altitude : Math.max(peakAltitude, altitude);
    const currentCamera = parseCamera();

    if (!descending) {
      if (altitude >= 10000 && currentCamera) baseCamera = currentCamera;
      descending = api.isDescent({
        altitude,
        previousAltitude,
        peakAltitude,
        phase: state.livePhase ?? state.status
      });
      if (descending && !baseCamera && currentCamera) baseCamera = currentCamera;
    }

    previousAltitude = altitude;
    if (!descending || !baseCamera) return;

    const aircraft = project(longitude, latitude);
    const camera = api.descentCamera({
      baseCamera,
      aircraft,
      altitude,
      peakAltitude,
      aspectRatio: api.viewportAspectRatio(svg)
    });
    if (!camera) return;

    svg.setAttribute("viewBox", [camera.x, camera.y, camera.width, camera.height]
      .map(value => value.toFixed(1)).join(" "));
  });
})(typeof window !== "undefined" ? window : globalThis, function createDadRadarDescentCamera() {
  "use strict";

  const BASE = {x: 0, y: 0, width: 1200, height: 650};
  const MAP_BOUNDS = {west: -135, east: -55, south: 5, north: 62};
  const MAP_FRAME = {left: 315, right: 885, top: 45, bottom: 605};
  const DESCENT_START_ALTITUDE = 18000;
  const SURFACE_ZOOM = 24;

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function smooth(value) {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function projectPoint(longitude, latitude) {
    return {
      x: MAP_FRAME.left + (longitude - MAP_BOUNDS.west) /
        (MAP_BOUNDS.east - MAP_BOUNDS.west) * (MAP_FRAME.right - MAP_FRAME.left),
      y: MAP_FRAME.top + (MAP_BOUNDS.north - latitude) /
        (MAP_BOUNDS.north - MAP_BOUNDS.south) * (MAP_FRAME.bottom - MAP_FRAME.top)
    };
  }

  function viewportAspectRatio(svg) {
    const rectangle = svg?.getBoundingClientRect?.();
    return rectangle?.width > 0 && rectangle?.height > 0
      ? rectangle.width / rectangle.height
      : BASE.width / BASE.height;
  }

  function isDescent({altitude, previousAltitude, peakAltitude, phase}) {
    const namedPhase = String(phase ?? "").toUpperCase();
    if (["APPROACH", "LANDING", "TAXI_IN"].includes(namedPhase)) return true;
    if (!Number.isFinite(previousAltitude) || !Number.isFinite(peakAltitude)) return false;
    const meaningfulDrop = peakAltitude - altitude >= 600;
    const notClimbing = altitude <= previousAltitude + 100;
    return meaningfulDrop && notClimbing;
  }

  function descentCamera({baseCamera, aircraft, altitude, peakAltitude, aspectRatio}) {
    if (!baseCamera || !aircraft || !Number.isFinite(altitude) || !Number.isFinite(peakAltitude)) return null;
    const startAltitude = Math.max(1, Math.min(DESCENT_START_ALTITUDE, peakAltitude));
    if (altitude >= startAltitude) return baseCamera;

    const progress = smooth((startAltitude - Math.max(altitude, 0)) / startAltitude);
    const targetWidth = Math.min(baseCamera.width, BASE.width / SURFACE_ZOOM);
    const width = baseCamera.width + (targetWidth - baseCamera.width) * progress;
    const height = width / aspectRatio;
    const baseCenter = {
      x: baseCamera.x + baseCamera.width / 2,
      y: baseCamera.y + baseCamera.height / 2
    };
    const center = {
      x: baseCenter.x + (aircraft.x - baseCenter.x) * progress,
      y: baseCenter.y + (aircraft.y - baseCenter.y) * progress
    };
    let x = center.x - width / 2;
    let y = center.y - height / 2;
    if (width <= BASE.width) x = clamp(x, BASE.x, BASE.x + BASE.width - width);
    if (height <= BASE.height) y = clamp(y, BASE.y, BASE.y + BASE.height - height);
    return {x, y, width, height};
  }

  return {
    DESCENT_START_ALTITUDE,
    descentCamera,
    finiteNumber,
    isDescent,
    projectPoint,
    viewportAspectRatio
  };
});
