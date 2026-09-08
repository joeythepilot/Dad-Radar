/* Airport geometry is OSM/ODbL. Raw ADS-B positions are never extrapolated here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.dadRadarAirportSurface = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const METERS_PER_DEGREE = 111195;
  const FRESH_MS = 90000;
  const HOLD_MS = 300000;
  function finite(value) { return typeof value === "number" && Number.isFinite(value); }
  function project(point, airport) {
    return {x: (point.longitude - airport.longitude) * METERS_PER_DEGREE * Math.cos(airport.latitude * Math.PI / 180),
      y: (airport.latitude - point.latitude) * METERS_PER_DEGREE};
  }
  function distance(point, airport) {
    const p = project(point, airport);
    return Math.sqrt(p.x * p.x + p.y * p.y);
  }
  function selectAirport(position, airports, now, holdingCode) {
    if (!position || position.onGround !== true || !finite(position.latitude) || !finite(position.longitude) ||
      !position.recordedAt || !/^(adsb_.+|ADSB)$/i.test(position.source || "") ||
      (finite(position.containment) && position.containment > 200) ||
      (finite(position.accuracy) && position.accuracy < 7)) return null;
    const age = now - Date.parse(position.recordedAt);
    if (!Number.isFinite(age) || age < -5000 || age > HOLD_MS) return null;
    const nearest = airports.filter(Boolean).slice().sort((a, b) => distance(position, a) - distance(position, b))[0];
    if (!nearest || distance(position, nearest) > 7408 || (age > FRESH_MS && holdingCode !== nearest.code)) return null;
    return {airport: nearest, stale: age > FRESH_MS, age: Math.max(0, age)};
  }
  function fieldAltitude(flight, airports) {
    if (!finite(flight.altitude)) return null;
    if (!finite(flight.latitude) || !finite(flight.longitude)) return null;
    const nearest = airports.filter(Boolean).slice().sort((a, b) => distance(flight, a) - distance(flight, b))[0];
    // Only subtract field elevation in the airport vicinity, not over intervening terrain.
    const elevation = nearest && distance(flight, nearest) < 74080 && finite(nearest.elevationFeet) ? nearest.elevationFeet : 0;
    return Math.max(0, flight.altitude - elevation);
  }
  function fitBounds(points, aspect) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);});
    // Fit the actual field tightly, reserving space for labels and the time
    // plates. Preserve north-up and equal ground scale on either screen.
    let width = Math.max(600, maxX - minX) * 1.12;
    let height = Math.max(600, maxY - minY) * 1.18;
    const ratio = finite(aspect) && aspect > 0 ? aspect : 1.4;
    if (width / height < ratio) width = height * ratio; else height = width / ratio;
    return {x: (minX + maxX - width) / 2, y: (minY + maxY - height) / 2, width, height};
  }

  function createController(options) {
    const doc = options.document;
    const shell = options.shell;
    const now = options.now || Date.now;
    const lookup = options.lookup;
    const cache = {};
    let flightKey = null, holdingCode = null, lastPosition = null, layer = null, svg = null, plane = null, caption = null;
    let drawingKey = null, bounds = null, pendingState = null;
    const NS = "http://www.w3.org/2000/svg";
    function node(tag, attrs, text) {
      const element = doc.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(key => {if (attrs[key] !== undefined) element.setAttribute(key, attrs[key]);});
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function request(code) {
      if (!code || !/^[A-Z0-9]{3,4}$/.test(code)) return;
      const item = cache[code] || (cache[code] = {map: null, next: 0, pending: false});
      if (item.pending || now() < item.next) return;
      item.pending = true;
      options.load(code, function (error, data) {
        item.pending = false;
        item.next = now() + (error ? 60000 : Math.max(10000, data.retryAfterMs || 60000));
        if (!error && data.map && data.map.code === code && Array.isArray(data.map.features)) {
          item.map = data.map;
          // A usable old chart may be returned while the server refreshes its
          // airport boundary. Pick up that result promptly, not an hour later.
          item.next = now() + (data.pending ? Math.max(10000, data.retryAfterMs || 10000) : 3600000);
        }
        if (options.onChange) options.onChange();
      });
    }
    function ensureLayer() {
      if (layer) return;
      layer = doc.createElement("div");
      layer.className = "airport-surface-layer";
      svg = node("svg", {class: "airport-surface-svg", role: "img", "aria-label": "Airport ground position", preserveAspectRatio: "xMidYMid meet"});
      layer.appendChild(svg);
      caption = doc.createElement("div"); caption.className = "airport-surface-caption"; layer.appendChild(caption);
      const attribution = doc.createElement("a");
      attribution.className = "airport-surface-credit"; attribution.href = "https://www.openstreetmap.org/copyright";
      attribution.target = "_blank"; attribution.rel = "noopener"; attribution.textContent = "© OpenStreetMap contributors";
      layer.appendChild(attribution); shell.appendChild(layer);
    }
    function draw(map, airport) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const allPoints = [];
      const order = {apron: 0, terminal: 1, taxiway: 2, runway: 3};
      const labels = [], seenLabels = {};
      map.features.slice().sort((a, b) => order[a.kind] - order[b.kind]).forEach(feature => {
        const points = feature.points.map(p => project({longitude: p[0], latitude: p[1]}, airport));
        allPoints.push.apply(allPoints, points);
        const d = points.map((p, index) => `${index ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (feature.closed ? " Z" : "");
        svg.appendChild(node("path", {d, class: `airport-surface-${feature.kind}`, "stroke-width": feature.closed ? 5 : feature.width,
          style: feature.closed ? undefined : "fill:none"}));
        if (feature.label && !seenLabels[feature.label] && (feature.kind === "runway" || feature.kind === "taxiway")) {
          seenLabels[feature.label] = true;
          labels.push({kind: feature.kind, text: feature.label, point: points[Math.floor(points.length / 2)]});
        }
      });
      const rect = shell.getBoundingClientRect();
      bounds = fitBounds(allPoints, rect.width / rect.height);
      svg.setAttribute("viewBox", [bounds.x, bounds.y, bounds.width, bounds.height].join(" "));
      const unitsPerPixel = bounds.width / Math.max(200, rect.width);
      labels.filter(label => label.kind === "runway" || labels.length < 30).forEach(label => {
        svg.appendChild(node("text", {x: label.point.x, y: label.point.y, class: "airport-surface-label", "font-size": unitsPerPixel * 11,
          "stroke-width": unitsPerPixel * 3}, label.text));
      });
      plane = node("g", {class: "airport-surface-plane"});
      plane.appendChild(node("circle", {r: 14, fill: "#efe1bf", stroke: "#482c23", "stroke-width": 1.5}));
      // North-pointing aircraft, rotated only to the reported heading.
      plane.appendChild(node("path", {d: "M0 -12 L2 -4 L10 2 L10 4 L2 1 L2 8 L5 11 L5 12 L0 10 L-5 12 L-5 11 L-2 8 L-2 1 L-10 4 L-10 2 L-2 -4 Z", fill: "#6d302b"}));
      svg.appendChild(plane);
      bounds.unitsPerPixel = unitsPerPixel;
    }
    function render(state) {
      pendingState = state;
      const flight = state && state.flight;
      const key = flight ? [state.eventId, flight.number, flight.origin, flight.destination].join("|") : null;
      if (key !== flightKey) {flightKey = key; holdingCode = null; lastPosition = null; drawingKey = null;}
      const airports = flight ? [lookup(flight.origin), lookup(flight.destination)].filter(Boolean) : [];
      airports.forEach(airport => request(airport.code));
      const raw = flight && flight.surfacePosition;
      // A positive airborne report immediately hands control back to the regional camera.
      if (raw) lastPosition = raw;
      const selected = selectAirport(lastPosition, airports, now(), holdingCode);
      const map = selected && cache[selected.airport.code] && cache[selected.airport.code].map;
      if (!selected || !map || !shell) {
        if (layer) layer.hidden = true;
        holdingCode = null;
        return false;
      }
      ensureLayer(); layer.hidden = false;
      const rect = shell.getBoundingClientRect();
      const nextDrawingKey = [selected.airport.code, map.fetchedAt, rect.width, rect.height].join("|");
      if (nextDrawingKey !== drawingKey) {draw(map, selected.airport); drawingKey = nextDrawingKey;}
      const p = project(lastPosition, selected.airport);
      // An outlying report isn't a reason to zoom the field or invent a taxi path.
      if (p.x < bounds.x || p.x > bounds.x + bounds.width || p.y < bounds.y || p.y > bounds.y + bounds.height) {
        layer.hidden = true; holdingCode = null; return false;
      }
      holdingCode = selected.airport.code;
      plane.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${bounds.unitsPerPixel}) rotate(${finite(lastPosition.heading) ? lastPosition.heading : 0})`);
      plane.lastChild.setAttribute("visibility", finite(lastPosition.heading) ? "visible" : "hidden");
      plane.setAttribute("opacity", selected.stale ? "0.55" : "1");
      const seconds = Math.floor(selected.age / 1000);
      caption.textContent = `${holdingCode} · AIRPORT · N ↑ · ${selected.stale ? "LAST POSITION" : "GROUND POSITION"} ${seconds}s AGO`;
      caption.title = `Map updated ${map.fetchedAt.slice(0, 10)}. Family display; not for navigation.`;
      return true;
    }
    return {render, refresh: () => render(pendingState)};
  }
  return {project, distance, selectAirport, fieldAltitude, fitBounds, createController};
});
