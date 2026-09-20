(function initializeSequenceHistoryMap(global) {
  "use strict";

  const MAP_BOUNDS = {west: -135, east: -55, south: 5, north: 62};
  const MAP_FRAME = {left: 315, right: 885, top: 45, bottom: 605};
  const svg = document.getElementById("route-map-svg");
  const routeShadow = document.getElementById("map-route-shadow");
  let layer = null;
  let airportMarkers = [];

  function fitAirportMarkers() {
    if (!svg) return;
    const width = svg.viewBox?.baseVal?.width || 1200;
    const renderedWidth = svg.getBoundingClientRect?.().width || 1200;
    const radius = 3 * width / renderedWidth;
    airportMarkers.forEach(marker => marker.setAttribute("r", radius.toFixed(4)));
  }

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

  function routePoint(raw) {
    const latitude = Number(raw?.latitude ?? raw?.lat);
    const longitude = Number(raw?.longitude ?? raw?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < MAP_BOUNDS.south || latitude > MAP_BOUNDS.north ||
      longitude < MAP_BOUNDS.west || longitude > MAP_BOUNDS.east) return null;
    return project(longitude, latitude);
  }

  function deduplicate(points) {
    const usable = points.filter(Boolean);
    const kept = [];

    for (const point of usable) {
      const previous = kept[kept.length - 1];
      if (
        !previous ||
        Math.hypot(
          point.x - previous.x,
          point.y - previous.y
        ) >= 1
      ) {
        kept.push(point);
      }
    }

    const finalPoint = usable[usable.length - 1];
    const lastKept = kept[kept.length - 1];

    if (
      finalPoint &&
      (
        !lastKept ||
        finalPoint.x !== lastKept.x ||
        finalPoint.y !== lastKept.y
      )
    ) {
      kept.push(finalPoint);
    }

    return kept;
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
    airportMarkers = [];
    const visited = new Map();
    const legs = Array.isArray(state?.sequenceHistory?.legs) ? state.sequenceHistory.legs : [];

    for (const leg of legs) {
      if (isCurrentLeg(leg, state)) continue;
      const points = deduplicate(
        (Array.isArray(leg.track) ? leg.track : [])
          .map(routePoint)
          .filter(Boolean)
      );

      if (points.length < 2) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", smoothPath(points));
      path.setAttribute("class", "map-sequence-history-leg");
      path.dataset.eventId = leg.eventId ?? "";
      target.appendChild(path);
      // Only reference airports belonging to a recorded historical leg. An
      // interrupted leg must not claim its planned destination was visited.
      for (const code of [leg.origin, ...(leg.completed ? [leg.destination] : [])]) {
        const airport = global.dadRadarAirports?.lookupAirport(code);
        const point = airport && routePoint(airport);
        if (point) visited.set(airport.code, point);
      }
    }
    for (const [code, point] of visited) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "map-sequence-history-airport");
      circle.setAttribute("cx", point.x.toFixed(4));
      circle.setAttribute("cy", point.y.toFixed(4));
      circle.dataset.airport = code;
      target.appendChild(circle);
      airportMarkers.push(circle);
    }
    fitAirportMarkers();
  }

  // The camera may change after the state event during arrival framing or
  // resizing. Keep the reference circles at the same physical print size.
  if (svg && typeof global.MutationObserver === "function") {
    new global.MutationObserver(fitAirportMarkers).observe(svg, {
      attributes: true, attributeFilter: ["viewBox"]
    });
  }
  global.addEventListener("resize", fitAirportMarkers);

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
