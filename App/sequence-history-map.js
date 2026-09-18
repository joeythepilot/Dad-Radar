(function initializeSequenceHistoryMap(global) {
  "use strict";

  const MAP_BOUNDS = {west: -135, east: -55, south: 5, north: 62};
  const MAP_FRAME = {left: 315, right: 885, top: 45, bottom: 605};
  const svg = document.getElementById("route-map-svg");
  const routeShadow = document.getElementById("map-route-shadow");
  let layer = null;

  function ensureLayer() {
    if (layer?.isConnected) return layer;
    if (!svg) return null;
    layer = document.getElementById("map-sequence-history-layer");
    if (layer) return layer;
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.setAttribute("id", "map-sequence-history-layer");
    layer.setAttribute("class", "map-sequence-history-layer");
    if (routeShadow?.parentNode) {
      routeShadow.parentNode.insertBefore(layer, routeShadow);
    } else {
      svg.appendChild(layer);
    }
    return layer;
  }

  function project(longitude, latitude) {
    return {
      x: MAP_FRAME.left +
        (longitude - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west) *
        (MAP_FRAME.right - MAP_FRAME.left),
      y: MAP_FRAME.top +
        (MAP_BOUNDS.north - latitude) / (MAP_BOUNDS.north - MAP_BOUNDS.south) *
        (MAP_FRAME.bottom - MAP_FRAME.top)
    };
  }

  function airportPoint(code) {
    const airport =
      global.dadRadarAirports
        ?.lookupAirport?.(code);

    if (!airport) {
      return null;
    }

    return routePoint({
      latitude: airport.latitude,
      longitude: airport.longitude
    });
  }

  function routePoint(raw) {
    const latitude = Number(raw?.latitude ?? raw?.lat);
    const longitude = Number(raw?.longitude ?? raw?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < MAP_BOUNDS.south || latitude > MAP_BOUNDS.north ||
      longitude < MAP_BOUNDS.west || longitude > MAP_BOUNDS.east) return null;
    return project(longitude, latitude);
  }

  function deduplicate(points) {
    return points.filter((point, index, all) => point &&
      (index === 0 || Math.hypot(point.x - all[index - 1].x, point.y - all[index - 1].y) >= 1));
  }

  function smoothPath(points) {
    if (points.length < 2) return "";
    const segments = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[Math.max(0, index - 1)];
      const current = points[index];
      const next = points[index + 1];
      const following = points[Math.min(points.length - 1, index + 2)];
      const controlOne = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6
      };
      const controlTwo = {
        x: next.x - (following.x - current.x) / 6,
        y: next.y - (following.y - current.y) / 6
      };
      segments.push(`C ${controlOne.x.toFixed(1)} ${controlOne.y.toFixed(1)} ` +
        `${controlTwo.x.toFixed(1)} ${controlTwo.y.toFixed(1)} ` +
        `${next.x.toFixed(1)} ${next.y.toFixed(1)}`);
    }
    return segments.join(" ");
  }

  function isCurrentLeg(leg, state) {
    const currentEventKey = state?.sequenceHistory?.currentEventKey;
    return Boolean(currentEventKey && leg?.eventKey === currentEventKey);
  }

  function render(state) {
    const target = ensureLayer();
    if (!target) return;
    target.replaceChildren();
    const legs = Array.isArray(state?.sequenceHistory?.legs) ? state.sequenceHistory.legs : [];

    for (const leg of legs) {
      if (isCurrentLeg(leg, state)) continue;
      const recordedPoints =
        deduplicate(
          (Array.isArray(leg.track) ? leg.track : [])
            .map(routePoint)
            .filter(Boolean)
        );

      if (recordedPoints.length < 2) continue;

      const points = deduplicate([
        airportPoint(leg.origin),
        ...recordedPoints,
        airportPoint(leg.destination)
      ].filter(Boolean));
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", smoothPath(points));
      path.setAttribute("class", "map-sequence-history-leg");
      path.dataset.eventId = leg.eventId ?? "";
      target.appendChild(path);
    }
  }

  global.addEventListener("dad-radar:visual-state-change", event => {
    render(event.detail?.state ?? null);
  });

  try {
    const initial = typeof dadRadarVisualState !== "undefined"
      ? dadRadarVisualState
      : typeof dadRadarState !== "undefined"
        ? dadRadarState
        : null;
    render(initial);
  } catch (_) {
    render(null);
  }
})(window);
