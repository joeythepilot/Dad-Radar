/* =========================================================
   DAD RADAR
   Self-contained route map controller
   No external libraries or network requests required.
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

const AIRPORTS = {
  ORD: { code: "ORD", city: "CHICAGO", latitude: 41.9742, longitude: -87.9073 },
  AVL: { code: "AVL", city: "ASHEVILLE", latitude: 35.4362, longitude: -82.5418 },
  AVP: { code: "AVP", city: "SCRANTON", latitude: 41.3385, longitude: -75.7234 },
  TYS: { code: "TYS", city: "KNOXVILLE", latitude: 35.8110, longitude: -83.9940 }
};

const MAP_BOUNDS = { west: -126, east: -66, south: 24, north: 51 };
const MAP_FRAME = { left: 60, right: 1140, top: 45, bottom: 605 };

const elements = {
  landLayer: document.getElementById("map-land-layer"),
  countryBorders: document.getElementById("map-country-borders"),
  stateBorders: document.getElementById("map-state-borders"),
  routeShadow: document.getElementById("map-route-shadow"),
  routeLine: document.getElementById("map-route-line"),
  routeProgress: document.getElementById("map-route-progress"),
  originMarker: document.getElementById("map-origin-marker"),
  destinationMarker: document.getElementById("map-destination-marker"),
  aircraftMarker: document.getElementById("map-aircraft-marker"),
  originCode: document.getElementById("map-origin"),
  originCity: document.getElementById("map-origin-city"),
  destinationCode: document.getElementById("map-destination"),
  destinationCity: document.getElementById("map-destination-city"),
  loadingMessage: document.getElementById("map-loading-message"),
  shell: document.getElementById("route-map-shell")
};

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function project(longitude, latitude) {
  const xRatio =
    (longitude - MAP_BOUNDS.west) /
    (MAP_BOUNDS.east - MAP_BOUNDS.west);

  const yRatio =
    (MAP_BOUNDS.north - latitude) /
    (MAP_BOUNDS.north - MAP_BOUNDS.south);

  return {
    x: MAP_FRAME.left + xRatio * (MAP_FRAME.right - MAP_FRAME.left),
    y: MAP_FRAME.top + yRatio * (MAP_FRAME.bottom - MAP_FRAME.top)
  };
}

function pathFromPoints(points, closePath = false) {
  const path = points.map(([longitude, latitude], index) => {
    const point = project(longitude, latitude);
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");

  return closePath ? `${path} Z` : path;
}

function drawBaseMap() {
  if (!elements.landLayer || elements.landLayer.dataset.drawn === "true") {
    return;
  }

  const landMasses = [
    {
      className: "map-land-mass map-land-canada",
      points: [
        [-125, 49], [-123, 50.5], [-118, 50.8], [-112, 50.5],
        [-106, 50.2], [-100, 49.8], [-95, 49.5], [-90, 48.8],
        [-85, 47.6], [-80, 46.7], [-75, 46], [-70, 47.2],
        [-67, 45], [-70, 43.8], [-75, 44.2], [-80, 43.8],
        [-84.5, 46], [-90, 48], [-98, 49], [-108, 49], [-118, 49]
      ]
    },
    {
      className: "map-land-mass map-land-usa",
      points: [
        [-124.7, 48.5], [-123.2, 45.5], [-124, 42], [-122.5, 39],
        [-121, 36.5], [-118, 34], [-114.5, 32.5], [-111, 31.5],
        [-106.5, 31.8], [-103, 29.5], [-99, 26.5], [-96, 28.2],
        [-93, 29], [-90, 29], [-88, 30.2], [-85, 29.8],
        [-82.5, 27], [-80.5, 25.2], [-80, 28], [-81, 31],
        [-79, 33], [-77, 35], [-75, 37.5], [-74, 40.5],
        [-71, 42], [-69, 44.5], [-71.5, 45], [-75, 44.5],
        [-79, 43.5], [-83, 42], [-87, 44.5], [-91, 47],
        [-96, 49], [-104, 49], [-111, 49], [-117, 49]
      ]
    },
    {
      className: "map-land-mass map-land-mexico",
      points: [
        [-117, 32.5], [-112, 31], [-107, 31], [-103, 29],
        [-100, 26], [-97, 25], [-96, 22], [-93, 18],
        [-89, 18], [-87, 20.5], [-90, 21.5], [-94, 22],
        [-97, 25.5], [-101, 28], [-106, 29], [-111, 28], [-114, 30]
      ]
    }
  ];

  landMasses.forEach(({ className, points }) => {
    elements.landLayer.appendChild(
      svgElement("path", {
        class: className,
        d: pathFromPoints(points, true)
      })
    );
  });

  if (elements.countryBorders) {
    elements.countryBorders.setAttribute(
      "d",
      [
        pathFromPoints([[-124.7, 49], [-96, 49], [-83, 42], [-71.5, 45]]),
        pathFromPoints([[-117, 32.5], [-106.5, 31.8], [-103, 29.5], [-99, 26.5]])
      ].join(" ")
    );
  }

  if (elements.stateBorders) {
    elements.stateBorders.setAttribute(
      "d",
      [
        [-120, 42, -120, 49], [-114, 32.5, -114, 49],
        [-109, 31.5, -109, 49], [-104, 29.5, -104, 49],
        [-100, 27, -100, 49], [-95, 29, -95, 49],
        [-90, 29, -90, 48], [-85, 30, -85, 46],
        [-80, 31, -80, 43.5], [-75, 37, -75, 44.5],
        [-124, 42, -70, 42], [-122, 37, -75, 37],
        [-118, 32.5, -80, 32.5]
      ].map(([lon1, lat1, lon2, lat2]) =>
        pathFromPoints([[lon1, lat1], [lon2, lat2]])
      ).join(" ")
    );
  }

  elements.landLayer.dataset.drawn = "true";
}

function buildCurve(origin, destination) {
  const start = project(origin.longitude, origin.latitude);
  const end = project(destination.longitude, destination.latitude);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const normal = { x: -dy / distance, y: dx / distance };
  const arcHeight = Math.min(115, Math.max(45, distance * 0.22));
  const control = {
    x: midpoint.x + normal.x * arcHeight,
    y: midpoint.y + normal.y * arcHeight
  };

  return {
    start,
    control,
    end,
    path:
      `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ` +
      `Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ` +
      `${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  };
}

function curvePoint({ start, control, end }, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const u = 1 - t;

  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
  };
}

function curveAngle({ start, control, end }, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const dx = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

function positionAirportMarker(marker, point, placeLeft) {
  if (!marker) return;

  marker.setAttribute(
    "transform",
    `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`
  );

  const leader = marker.querySelector(".airport-leader");
  const placard = marker.querySelector(".airport-placard");

  if (leader) leader.setAttribute("x2", placeLeft ? "-18" : "18");

  if (placard) {
    placard.setAttribute(
      "transform",
      placeLeft ? "translate(-150 -31)" : "translate(18 -31)"
    );
  }
}

function setMessage(message, visible) {
  if (!elements.loadingMessage) return;
  elements.loadingMessage.textContent = message;
  elements.loadingMessage.hidden = !visible;
}

function clearRoute() {
  elements.shell?.classList.remove("is-ready");
  [elements.routeShadow, elements.routeLine, elements.routeProgress].forEach((path) => {
    if (path) path.setAttribute("d", "");
  });

  [elements.originMarker, elements.destinationMarker, elements.aircraftMarker].forEach((marker) => {
    if (marker) marker.setAttribute("visibility", "hidden");
  });
}

function renderRouteMap(state) {
  drawBaseMap();

  const flight = state?.flight;

  if (!flight) {
    clearRoute();
    setMessage(state?.message || "AWAITING FLIGHT DATA", true);
    return;
  }

  const origin = AIRPORTS[String(flight.origin || "").toUpperCase()];
  const destination = AIRPORTS[String(flight.destination || "").toUpperCase()];

  if (!origin || !destination) {
    clearRoute();
    setMessage("ROUTE DATA UNAVAILABLE", true);
    return;
  }

  const curve = buildCurve(origin, destination);
  const progress = Math.max(0, Math.min(100, Number(flight.progress) || 0)) / 100;
  const aircraftPoint = curvePoint(curve, progress);
  const aircraftAngle = curveAngle(curve, progress);

  [elements.routeShadow, elements.routeLine].forEach((path) => {
    if (path) path.setAttribute("d", curve.path);
  });

  if (elements.routeProgress) {
    elements.routeProgress.setAttribute("d", curve.path);
    elements.routeProgress.setAttribute("pathLength", "100");
    elements.routeProgress.style.strokeDasharray =
      `${progress * 100} ${100 - progress * 100}`;
  }

  positionAirportMarker(elements.originMarker, curve.start, curve.start.x > 850);
  positionAirportMarker(elements.destinationMarker, curve.end, curve.end.x > 850);

  if (elements.originMarker) elements.originMarker.setAttribute("visibility", "visible");
  if (elements.destinationMarker) elements.destinationMarker.setAttribute("visibility", "visible");

  if (elements.aircraftMarker) {
    elements.aircraftMarker.setAttribute(
      "transform",
      `translate(${aircraftPoint.x.toFixed(1)} ${aircraftPoint.y.toFixed(1)}) ` +
      `rotate(${aircraftAngle.toFixed(1)})`
    );
    elements.aircraftMarker.setAttribute("visibility", "visible");
  }

  if (elements.originCode) elements.originCode.textContent = origin.code;
  if (elements.originCity) elements.originCity.textContent = origin.city;
  if (elements.destinationCode) elements.destinationCode.textContent = destination.code;
  if (elements.destinationCity) elements.destinationCity.textContent = destination.city;

  setMessage("", false);
}

window.addEventListener("dad-radar:state-change", (event) => {
  renderRouteMap(event.detail?.state);
});

drawBaseMap();

try {
  if (typeof dadRadarState !== "undefined") {
    renderRouteMap(dadRadarState);
  } else {
    setMessage("AWAITING FLIGHT DATA", true);
  }
} catch (error) {
  console.error("Dad Radar route map failed to initialize:", error);
  setMessage("MAP INITIALIZATION FAILED", true);
}


/* Ensure route layers become visible whenever flight data exists. */
function syncRouteMapReadyState(state) {
  const shell = document.getElementById("route-map-shell");
  shell?.classList.toggle("is-ready", Boolean(state?.flight));
}

window.addEventListener("dad-radar:state-change", (event) => {
  syncRouteMapReadyState(event.detail?.state);
});

if (typeof dadRadarState !== "undefined") {
  syncRouteMapReadyState(dadRadarState);
}
