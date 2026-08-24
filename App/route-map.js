/* =========================================================
   DAD RADAR
   Self-contained vintage route map controller
   No external libraries. Weather imagery is supplied by the local Dad Radar server.
   ========================================================= */

const airportCatalog =
  globalThis.dadRadarAirports;

const MAP_BOUNDS = {
  west: -135,
  east: -55,
  south: 5,
  north: 62
};

const REFERENCE_CITIES = [
  ["VANCOUVER", 49.28, -123.12], ["CALGARY", 51.05, -114.07],
  ["TORONTO", 43.65, -79.38], ["MONTREAL", 45.5, -73.57],
  ["SEATTLE", 47.61, -122.33], ["SAN FRANCISCO", 37.77, -122.42],
  ["LOS ANGELES", 34.05, -118.24], ["DENVER", 39.74, -104.99],
  ["DALLAS", 32.78, -96.8], ["CHICAGO", 41.88, -87.63],
  ["ATLANTA", 33.75, -84.39], ["MIAMI", 25.76, -80.19],
  ["WASHINGTON", 38.91, -77.04], ["NEW YORK", 40.71, -74.01],
  ["MEXICO CITY", 19.43, -99.13], ["MONTERREY", 25.69, -100.32],
  ["NASSAU", 25.04, -77.35], ["HAVANA", 23.11, -82.37],
  ["SAN JUAN", 18.47, -66.11], ["SANTO DOMINGO", 18.49, -69.93]
];

function airportForMap(value) {
  const airport =
    airportCatalog
      ?.lookupAirport?.(value);

  if (
    !airport ||
    !Number.isFinite(
      airport.latitude
    ) ||
    !Number.isFinite(
      airport.longitude
    ) ||
    airport.longitude <
      MAP_BOUNDS.west ||
    airport.longitude >
      MAP_BOUNDS.east ||
    airport.latitude <
      MAP_BOUNDS.south ||
    airport.latitude >
      MAP_BOUNDS.north
  ) {
    return null;
  }

  return {
    code: airport.code,
    city:
      String(airport.city ?? "")
        .toUpperCase(),
    latitude: airport.latitude,
    longitude: airport.longitude
  };
}

const MAP_FRAME = {
  left: 60,
  right: 1140,
  top: 45,
  bottom: 605
};

const BASE_VIEW_BOX = {
  x: 0,
  y: 0,
  width: 1200,
  height: 650
};

const MAX_CAMERA_ZOOM = 3.4;

const SURFACE_FOCUS_ALTITUDE =
  10000;

const SURFACE_CAMERA_ZOOM = 6;

const AIRPORT_PLACARD_CITY_WIDTH =
  114;

const PLANNED_ROUTE_DASH_LENGTH =
  6;

const PLANNED_ROUTE_DASH_GAP =
  14;

const elements = {
  svg: document.getElementById("route-map-svg"),
  routeShadow: document.getElementById("map-route-shadow"),
  routeLine: document.getElementById("map-route-line"),
  routeProgress: document.getElementById("map-route-progress"),
  originMarker: document.getElementById("map-origin-marker"),
  destinationMarker: document.getElementById("map-destination-marker"),
  aircraftMarker: document.getElementById("map-aircraft-marker"),
  compassRose: document.getElementById("map-compass-rose"),
  originCode: document.getElementById("map-origin"),
  originCity: document.getElementById("map-origin-city"),
  destinationCode: document.getElementById("map-destination"),
  destinationCity: document.getElementById("map-destination-city"),
  loadingMessage: document.getElementById("map-loading-message"),
  shell: document.getElementById("route-map-shell")
  ,cityLayer: document.getElementById("map-city-label-layer")
  ,weatherImage: document.getElementById("map-weather-image")
};

let lastRenderedState = null;
let resizeTimer = null;

function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}

function project(longitude, latitude) {
  const xRatio =
    (longitude - MAP_BOUNDS.west) /
    (MAP_BOUNDS.east - MAP_BOUNDS.west);

  const yRatio =
    (MAP_BOUNDS.north - latitude) /
    (MAP_BOUNDS.north - MAP_BOUNDS.south);

  return {
    x:
      MAP_FRAME.left +
      xRatio *
        (MAP_FRAME.right - MAP_FRAME.left),
    y:
      MAP_FRAME.top +
      yRatio *
        (MAP_FRAME.bottom - MAP_FRAME.top)
  };
}

function renderReferenceCities() {
  if (!elements.cityLayer) {
    return;
  }

  elements.cityLayer.innerHTML = REFERENCE_CITIES.map((city) => {
    const point = project(city[2], city[1]);
    return `<g class="map-city-reference" transform="translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})"><circle r="2.2"></circle><text x="5" y="-4">${city[0]}</text></g>`;
  }).join("");
}

function refreshWeatherRadar() {
  if (!elements.weatherImage) {
    return;
  }

  const bucket = Math.floor(Date.now() / 300000);
  elements.weatherImage.setAttribute(
    "href",
    `/api/weather/radar?bbox=${MAP_BOUNDS.west},${MAP_BOUNDS.south},${MAP_BOUNDS.east},${MAP_BOUNDS.north}&width=1080&height=560&v=${bucket}`
  );
}

function buildCurve(origin, destination) {
  const start =
    project(
      origin.longitude,
      origin.latitude
    );

  const end =
    project(
      destination.longitude,
      destination.latitude
    );

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };

  const normal = {
    x: -dy / distance,
    y: dx / distance
  };

  const arcHeight =
    Math.min(
      115,
      Math.max(
        45,
        distance * 0.22
      )
    );

  const control = {
    x: midpoint.x + normal.x * arcHeight,
    y: midpoint.y + normal.y * arcHeight
  };

  return {
    kind: "direct",
    start,
    control,
    end,
    path:
      `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ` +
      `Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ` +
      `${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  };
}

function routeFixPoint(fix) {
  const latitude = Number(
    fix?.latitude
  );

  const longitude = Number(
    fix?.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < MAP_BOUNDS.south ||
    latitude > MAP_BOUNDS.north ||
    longitude < MAP_BOUNDS.west ||
    longitude > MAP_BOUNDS.east
  ) {
    return null;
  }

  return project(longitude, latitude);
}

function buildActualTrack(flight) {
  const points = deduplicateRoutePoints(
    (
      Array.isArray(flight?.actualTrack)
        ? flight.actualTrack
        : []
    )
      .slice(-180)
      .map(routeFixPoint)
      .filter(Boolean)
  );

  if (points.length < 2) {
    return null;
  }

  return {
    points,
    path: smoothRoutePath(points)
  };
}

function deduplicateRoutePoints(points) {
  return points.filter(
    (point, index, allPoints) =>
      point &&
      (
        index === 0 ||
        Math.hypot(
          point.x -
            allPoints[index - 1].x,
          point.y -
            allPoints[index - 1].y
        ) >= 1
      )
  );
}

function smoothRoutePath(points) {
  const segments = [
    `M ${points[0].x.toFixed(1)} ` +
      `${points[0].y.toFixed(1)}`
  ];

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const previous =
      points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following =
      points[
        Math.min(
          points.length - 1,
          index + 2
        )
      ];

    const controlOne = {
      x:
        current.x +
        (next.x - previous.x) / 6,
      y:
        current.y +
        (next.y - previous.y) / 6
    };

    const controlTwo = {
      x:
        next.x -
        (following.x - current.x) / 6,
      y:
        next.y -
        (following.y - current.y) / 6
    };

    segments.push(
      `C ${controlOne.x.toFixed(1)} ` +
      `${controlOne.y.toFixed(1)} ` +
      `${controlTwo.x.toFixed(1)} ` +
      `${controlTwo.y.toFixed(1)} ` +
      `${next.x.toFixed(1)} ` +
      `${next.y.toFixed(1)}`
    );
  }

  return segments.join(" ");
}

function buildRoute(
  origin,
  destination,
  filedRoute
) {
  const start = project(
    origin.longitude,
    origin.latitude
  );

  const end = project(
    destination.longitude,
    destination.latitude
  );

  const fixPoints = (
    Array.isArray(filedRoute?.fixes)
      ? filedRoute.fixes
      : []
  )
    .slice(0, 160)
    .map(routeFixPoint)
    .filter(Boolean);

  const points =
    deduplicateRoutePoints([
      start,
      ...fixPoints,
      end
    ]);

  if (points.length < 3) {
    return buildCurve(
      origin,
      destination
    );
  }

  const route = {
    kind: "filed",
    start: points[0],
    end: points[points.length - 1],
    points,
    path: smoothRoutePath(points)
  };

  route.control =
    curvePoint(route, 0.5);

  return route;
}

function pointAlongSegments(
  points,
  progress
) {
  const t = clamp(progress, 0, 1);
  const lengths = [];
  let totalLength = 0;

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const length = Math.hypot(
      points[index + 1].x -
        points[index].x,
      points[index + 1].y -
        points[index].y
    );

    lengths.push(length);
    totalLength += length;
  }

  const target = totalLength * t;
  let traversed = 0;

  for (
    let index = 0;
    index < lengths.length;
    index += 1
  ) {
    const length = lengths[index];

    if (
      target <= traversed + length ||
      index === lengths.length - 1
    ) {
      const localProgress = length > 0
        ? (target - traversed) / length
        : 0;

      return {
        point: {
          x:
            points[index].x +
            (
              points[index + 1].x -
              points[index].x
            ) * localProgress,
          y:
            points[index].y +
            (
              points[index + 1].y -
              points[index].y
            ) * localProgress
        },
        angle:
          Math.atan2(
            points[index + 1].y -
              points[index].y,
            points[index + 1].x -
              points[index].x
          ) * 180 / Math.PI
      };
    }

    traversed += length;
  }

  return {
    point: points[points.length - 1],
    angle: 0
  };
}

function curvePoint(
  route,
  progress
) {
  if (route.kind === "filed") {
    return pointAlongSegments(
      route.points,
      progress
    ).point;
  }

  const {
    start,
    control,
    end
  } = route;
  const t = clamp(progress, 0, 1);
  const u = 1 - t;

  return {
    x:
      u * u * start.x +
      2 * u * t * control.x +
      t * t * end.x,
    y:
      u * u * start.y +
      2 * u * t * control.y +
      t * t * end.y
  };
}

function curveAngle(
  route,
  progress
) {
  if (route.kind === "filed") {
    return pointAlongSegments(
      route.points,
      progress
    ).angle;
  }

  const {
    start,
    control,
    end
  } = route;
  const t = clamp(progress, 0, 1);
  const dx =
    2 * (1 - t) *
      (control.x - start.x) +
    2 * t *
      (end.x - control.x);

  const dy =
    2 * (1 - t) *
      (control.y - start.y) +
    2 * t *
      (end.y - control.y);

  return Math.atan2(dy, dx) * 180 / Math.PI;
}

function liveAircraftPosition(flight) {
  const latitude = Number(
    flight?.latitude
  );

  const longitude = Number(
    flight?.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < MAP_BOUNDS.south ||
    latitude > MAP_BOUNDS.north ||
    longitude < MAP_BOUNDS.west ||
    longitude > MAP_BOUNDS.east
  ) {
    return null;
  }

  return project(longitude, latitude);
}

function viewportAspectRatio() {
  const rectangle =
    elements.svg
      ?.getBoundingClientRect
      ?.();

  if (
    rectangle?.width > 0 &&
    rectangle?.height > 0
  ) {
    return rectangle.width /
      rectangle.height;
  }

  return BASE_VIEW_BOX.width /
    BASE_VIEW_BOX.height;
}

function sampleCurve(curve) {
  return Array.from(
    {
      length:
        curve.kind === "filed"
          ? 49
          : 25
    },
    (_, index) =>
      curvePoint(
        curve,
        index /
          (
            curve.kind === "filed"
              ? 48
              : 24
          )
      )
  );
}

function nearestRouteProgress(
  route,
  point
) {
  const points = sampleCurve(route);
  const lengths = [];
  let totalLength = 0;

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const length = Math.hypot(
      points[index + 1].x -
        points[index].x,
      points[index + 1].y -
        points[index].y
    );

    lengths.push(length);
    totalLength += length;
  }

  let traversed = 0;
  let bestDistance =
    Number.POSITIVE_INFINITY;
  let bestProgress = 0;

  lengths.forEach((length, index) => {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const denominator =
      dx * dx + dy * dy;

    const localProgress =
      denominator > 0
        ? clamp(
            (
              (point.x - start.x) * dx +
              (point.y - start.y) * dy
            ) / denominator,
            0,
            1
          )
        : 0;

    const nearest = {
      x: start.x + dx * localProgress,
      y: start.y + dy * localProgress
    };

    const distance = Math.hypot(
      point.x - nearest.x,
      point.y - nearest.y
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestProgress = totalLength > 0
        ? (
            traversed +
            length * localProgress
          ) / totalLength
        : 0;
    }

    traversed += length;
  });

  return clamp(bestProgress, 0, 1);
}

function fitCameraToPoints(points) {
  const usablePoints =
    points.filter(
      (point) =>
        Number.isFinite(point?.x) &&
        Number.isFinite(point?.y)
    );

  if (!usablePoints.length) {
    return {
      ...BASE_VIEW_BOX,
      zoom: 1
    };
  }

  const xValues =
    usablePoints.map(
      (point) => point.x
    );

  const yValues =
    usablePoints.map(
      (point) => point.y
    );

  const minimumX = Math.min(...xValues);
  const maximumX = Math.max(...xValues);
  const minimumY = Math.min(...yValues);
  const maximumY = Math.max(...yValues);

  const routeWidth =
    Math.max(
      maximumX - minimumX,
      1
    );

  const routeHeight =
    Math.max(
      maximumY - minimumY,
      1
    );

  const horizontalPadding =
    Math.max(
      92,
      routeWidth * 0.24
    );

  const verticalPadding =
    Math.max(
      82,
      routeHeight * 0.3
    );

  let width =
    routeWidth +
    horizontalPadding * 2;

  let height =
    routeHeight +
    verticalPadding * 2;

  const aspectRatio =
    viewportAspectRatio();

  if (width / height < aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  const minimumWidth =
    BASE_VIEW_BOX.width /
    MAX_CAMERA_ZOOM;

  if (width < minimumWidth) {
    width = minimumWidth;
    height = width / aspectRatio;
  }

  const centerX =
    (minimumX + maximumX) / 2;

  const centerY =
    (minimumY + maximumY) / 2;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    zoom:
      BASE_VIEW_BOX.width /
      width
  };
}

function smoothCameraProgress(value) {
  const progress =
    clamp(value, 0, 1);

  return progress * progress *
    (3 - 2 * progress);
}

function cameraForSurfaceProximity(
  routeCamera,
  aircraftPoint,
  rawAltitude
) {
  const altitude =
    Number(rawAltitude);

  if (
    !aircraftPoint ||
    !Number.isFinite(altitude) ||
    altitude >=
      SURFACE_FOCUS_ALTITUDE
  ) {
    return routeCamera;
  }

  const proximity =
    smoothCameraProgress(
      (
        SURFACE_FOCUS_ALTITUDE -
        Math.max(altitude, 0)
      ) /
      SURFACE_FOCUS_ALTITUDE
    );

  const aspectRatio =
    viewportAspectRatio();

  const surfaceWidth =
    BASE_VIEW_BOX.width /
    SURFACE_CAMERA_ZOOM;

  const width =
    routeCamera.width +
    (
      surfaceWidth -
      routeCamera.width
    ) * proximity;

  const height =
    width / aspectRatio;

  const routeCenter = {
    x:
      routeCamera.x +
      routeCamera.width / 2,
    y:
      routeCamera.y +
      routeCamera.height / 2
  };

  const center = {
    x:
      routeCenter.x +
      (
        aircraftPoint.x -
        routeCenter.x
      ) * proximity,
    y:
      routeCenter.y +
      (
        aircraftPoint.y -
        routeCenter.y
      ) * proximity
  };

  let x = center.x - width / 2;
  let y = center.y - height / 2;

  if (width <= BASE_VIEW_BOX.width) {
    x = clamp(
      x,
      BASE_VIEW_BOX.x,
      BASE_VIEW_BOX.x +
        BASE_VIEW_BOX.width -
        width
    );
  }

  if (height <= BASE_VIEW_BOX.height) {
    y = clamp(
      y,
      BASE_VIEW_BOX.y,
      BASE_VIEW_BOX.y +
        BASE_VIEW_BOX.height -
        height
    );
  }

  return {
    x,
    y,
    width,
    height,
    zoom:
      BASE_VIEW_BOX.width /
      width
  };
}

function applyCamera(camera) {
  if (!elements.svg) {
    return;
  }

  elements.svg.setAttribute(
    "viewBox",
    [
      camera.x.toFixed(1),
      camera.y.toFixed(1),
      camera.width.toFixed(1),
      camera.height.toFixed(1)
    ].join(" ")
  );

  positionCompass(camera);
}

function resetCamera() {
  applyCamera({
    ...BASE_VIEW_BOX,
    zoom: 1
  });
}

function positionCompass(camera) {
  if (!elements.compassRose) {
    return;
  }

  const inverseZoom =
    1 / camera.zoom;

  const x =
    camera.x +
    camera.width -
    78 * inverseZoom;

  const y =
    camera.y +
    78 * inverseZoom;

  elements.compassRose.setAttribute(
    "transform",
    `translate(${x.toFixed(1)} ${y.toFixed(1)}) ` +
    `scale(${inverseZoom.toFixed(4)})`
  );
}

function routeLabelPlacements(curve) {
  const chord = {
    x: curve.end.x - curve.start.x,
    y: curve.end.y - curve.start.y
  };

  const chordLength =
    Math.hypot(chord.x, chord.y) || 1;

  const alongRoute = {
    x: chord.x / chordLength,
    y: chord.y / chordLength
  };

  const midpoint = {
    x: (curve.start.x + curve.end.x) / 2,
    y: (curve.start.y + curve.end.y) / 2
  };

  const bow = {
    x: curve.control.x - midpoint.x,
    y: curve.control.y - midpoint.y
  };

  const bowLength =
    Math.hypot(bow.x, bow.y);

  const awayFromArc =
    bowLength > 1
      ? {
          x: -bow.x / bowLength,
          y: -bow.y / bowLength
        }
      : {
          x: alongRoute.y,
          y: -alongRoute.x
        };

  const sideDistance = 86;
  const endSpread = 18;

  return {
    origin: {
      x:
        awayFromArc.x * sideDistance -
        alongRoute.x * endSpread,
      y:
        awayFromArc.y * sideDistance -
        alongRoute.y * endSpread
    },
    destination: {
      x:
        awayFromArc.x * sideDistance +
        alongRoute.x * endSpread,
      y:
        awayFromArc.y * sideDistance +
        alongRoute.y * endSpread
    }
  };
}

function positionAirportMarker(
  marker,
  point,
  placement,
  inverseZoom
) {
  if (!marker) {
    return;
  }

  marker.setAttribute(
    "transform",
    `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) ` +
    `scale(${inverseZoom.toFixed(4)})`
  );

  const leader =
    marker.querySelector(
      ".airport-leader"
    );

  const placard =
    marker.querySelector(
      ".airport-placard"
    );

  const placementLength =
    Math.hypot(
      placement.x,
      placement.y
    ) || 1;

  if (leader) {
    const leaderStart = 16;

    const leaderLength =
      Math.max(
        34,
        placementLength - 35
      );

    leader.setAttribute(
      "x1",
      (
        placement.x /
        placementLength *
        leaderStart
      ).toFixed(1)
    );

    leader.setAttribute(
      "y1",
      (
        placement.y /
        placementLength *
        leaderStart
      ).toFixed(1)
    );

    leader.setAttribute(
      "x2",
      (
        placement.x /
        placementLength *
        leaderLength
      ).toFixed(1)
    );

    leader.setAttribute(
      "y2",
      (
        placement.y /
        placementLength *
        leaderLength
      ).toFixed(1)
    );
  }

  if (placard) {
    placard.setAttribute(
      "transform",
      `translate(${(placement.x - 66).toFixed(1)} ` +
      `${(placement.y - 31).toFixed(1)})`
    );
  }
}

function positionAircraftMarker(
  point,
  angle,
  inverseZoom
) {
  if (!elements.aircraftMarker) {
    return;
  }

  elements.aircraftMarker.setAttribute(
    "transform",
    `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) ` +
    `rotate(${angle.toFixed(1)}) ` +
    `scale(${inverseZoom.toFixed(4)})`
  );

  elements.aircraftMarker.setAttribute(
    "visibility",
    "visible"
  );
}

function setMessage(message, visible) {
  if (!elements.loadingMessage) {
    return;
  }

  elements.loadingMessage.textContent =
    message;

  elements.loadingMessage.hidden =
    !visible;
}

function clearRoute() {
  elements.shell
    ?.classList
    .remove("is-ready");

  [
    elements.routeShadow,
    elements.routeLine,
    elements.routeProgress
  ].forEach((path) => {
    if (path) {
      path.setAttribute("d", "");
    }
  });

  [
    elements.originMarker,
    elements.destinationMarker,
    elements.aircraftMarker
  ].forEach((marker) => {
    if (marker) {
      marker.setAttribute(
        "visibility",
        "hidden"
      );
    }
  });

  resetCamera();
}

function fitAirportCityLabel(label) {
  if (!label) {
    return;
  }

  label.removeAttribute("textLength");
  label.removeAttribute("lengthAdjust");

  const cityName =
    String(label.textContent ?? "")
      .trim();

  if (!cityName) {
    return;
  }

  let measuredWidth = Number.NaN;

  if (
    typeof label
      .getComputedTextLength ===
      "function"
  ) {
    try {
      measuredWidth =
        label.getComputedTextLength();
    } catch {
      measuredWidth = Number.NaN;
    }
  }

  if (
    !Number.isFinite(measuredWidth) ||
    measuredWidth <= 0
  ) {
    measuredWidth =
      cityName.length * 7.9;
  }

  if (
    measuredWidth <=
      AIRPORT_PLACARD_CITY_WIDTH
  ) {
    return;
  }

  label.setAttribute(
    "textLength",
    String(
      AIRPORT_PLACARD_CITY_WIDTH
    )
  );

  label.setAttribute(
    "lengthAdjust",
    "spacingAndGlyphs"
  );
}

function updateRouteLabels(
  flight,
  origin = null,
  destination = null
) {
  if (elements.originCode) {
    elements.originCode.textContent =
      origin?.code ??
      String(
        flight.origin || "---"
      ).toUpperCase();
  }

  if (elements.originCity) {
    elements.originCity.textContent =
      origin?.city ??
      flight.originCity ??
      "";

    fitAirportCityLabel(
      elements.originCity
    );
  }

  if (elements.destinationCode) {
    elements.destinationCode.textContent =
      destination?.code ??
      String(
        flight.destination || "---"
      ).toUpperCase();
  }

  if (elements.destinationCity) {
    elements.destinationCity.textContent =
      destination?.city ??
      flight.destinationCity ??
      "";

    fitAirportCityLabel(
      elements.destinationCity
    );
  }
}

function renderLivePositionOnly(flight) {
  const livePosition =
    liveAircraftPosition(flight);

  if (!livePosition) {
    return false;
  }

  const liveHeading =
    Number(flight.heading);

  const hasLiveHeading =
    flight.heading !== null &&
    flight.heading !== undefined &&
    flight.heading !== "" &&
    Number.isFinite(liveHeading);

  clearRoute();

  const routeCamera =
    fitCameraToPoints([
      {
        x: livePosition.x - 90,
        y: livePosition.y - 55
      },
      {
        x: livePosition.x + 90,
        y: livePosition.y + 55
      }
    ]);

  const camera =
    cameraForSurfaceProximity(
      routeCamera,
      livePosition,
      flight.altitude
    );

  applyCamera(camera);

  positionAircraftMarker(
    livePosition,
    hasLiveHeading
      ? liveHeading - 90
      : 0,
    1 / camera.zoom
  );

  updateRouteLabels(flight);

  elements.shell
    ?.classList
    .add("is-ready");

  setMessage("", false);

  return true;
}

function renderRouteMap(state) {
  lastRenderedState = state ?? null;

  const flight = state?.flight;

  if (!flight) {
    clearRoute();
    setMessage(
      state?.message ??
        "AWAITING FLIGHT DATA",
      true
    );
    return;
  }

  const origin =
    airportForMap(flight.origin);

  const destination =
    airportForMap(
      flight.destination
    );

  if (!origin || !destination) {
    if (!renderLivePositionOnly(flight)) {
      clearRoute();
      setMessage(
        "ROUTE DATA UNAVAILABLE",
        true
      );
    }
    return;
  }

  const curve =
    buildRoute(
      origin,
      destination,
      flight.filedRoute
    );

  const progress =
    clamp(
      Number(flight.progress) || 0,
      0,
      100
    ) / 100;

  const livePosition =
    liveAircraftPosition(flight);

  const actualTrack =
    buildActualTrack(flight);

  const displayProgress =
    livePosition
      ? nearestRouteProgress(
          curve,
          livePosition
        )
      : progress;

  const liveHeading =
    Number(flight.heading);

  const hasLiveHeading =
    flight.heading !== null &&
    flight.heading !== undefined &&
    flight.heading !== "" &&
    Number.isFinite(liveHeading);

  const routeCamera =
    fitCameraToPoints([
      ...sampleCurve(curve),
      ...(actualTrack?.points ?? []),
      livePosition
    ]);

  const aircraftPoint =
    livePosition ??
    curvePoint(
      curve,
      displayProgress
    );

  const camera =
    cameraForSurfaceProximity(
      routeCamera,
      aircraftPoint,
      flight.altitude
    );

  applyCamera(camera);

  const inverseZoom =
    1 / camera.zoom;

  const plannedRouteDash =
    `${(
      PLANNED_ROUTE_DASH_LENGTH *
      inverseZoom
    ).toFixed(1)} ` +
    `${(
      PLANNED_ROUTE_DASH_GAP *
      inverseZoom
    ).toFixed(1)}`;

  const aircraftAngle =
    livePosition &&
    hasLiveHeading
      ? liveHeading - 90
      : curveAngle(
          curve,
          displayProgress
        );

  [
    elements.routeShadow,
    elements.routeLine
  ].forEach((path) => {
    if (path) {
      path.setAttribute(
        "d",
        curve.path
      );

      path.style.strokeDasharray =
        plannedRouteDash;
    }
  });

  if (elements.routeProgress) {
    if (actualTrack) {
      elements.routeProgress.setAttribute(
        "d",
        actualTrack.path
      );
      elements.routeProgress.removeAttribute(
        "pathLength"
      );
      elements.routeProgress.style.strokeDasharray =
        "none";
    } else {
      elements.routeProgress.setAttribute(
        "d",
        curve.path
      );
      elements.routeProgress.setAttribute(
        "pathLength",
        "100"
      );
      elements.routeProgress.style.strokeDasharray =
        `${displayProgress * 100} ` +
        `${100 - displayProgress * 100}`;
    }
  }

  const labelPlacements =
    routeLabelPlacements(curve);

  positionAirportMarker(
    elements.originMarker,
    curve.start,
    labelPlacements.origin,
    inverseZoom
  );

  positionAirportMarker(
    elements.destinationMarker,
    curve.end,
    labelPlacements.destination,
    inverseZoom
  );

  if (elements.originMarker) {
    elements.originMarker.setAttribute(
      "visibility",
      "visible"
    );
  }

  if (elements.destinationMarker) {
    elements.destinationMarker.setAttribute(
      "visibility",
      "visible"
    );
  }

  positionAircraftMarker(
    aircraftPoint,
    aircraftAngle,
    inverseZoom
  );

  updateRouteLabels(
    flight,
    origin,
    destination
  );

  elements.shell
    ?.classList
    .add("is-ready");

  setMessage("", false);
}

function syncRouteMapReadyState(state) {
  elements.shell
    ?.classList
    .toggle(
      "is-ready",
      Boolean(state?.flight)
    );
}

window.addEventListener(
  "dad-radar:visual-state-change",
  (event) => {
    renderRouteMap(
      event.detail?.state
    );
    syncRouteMapReadyState(
      event.detail?.state
    );
  }
);

window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(
      resizeTimer
    );

    resizeTimer =
      window.setTimeout(
        () => {
          if (lastRenderedState) {
            renderRouteMap(
              lastRenderedState
            );
          }
        },
        120
      );
  }
);

resetCamera();
renderReferenceCities();
refreshWeatherRadar();
if (typeof window.setInterval === "function") {
  window.setInterval(
    refreshWeatherRadar,
    300000
  );
}

try {
  const initialRouteState =
    typeof dadRadarVisualState !==
      "undefined"
      ? dadRadarVisualState
      : typeof dadRadarState !==
          "undefined"
        ? dadRadarState
        : null;

  if (initialRouteState) {
    renderRouteMap(
      initialRouteState
    );
    syncRouteMapReadyState(
      initialRouteState
    );
  } else {
    setMessage(
      "AWAITING FLIGHT DATA",
      true
    );
  }
} catch (error) {
  console.error(
    "Dad Radar route map failed to initialize:",
    error
  );
  setMessage(
    "MAP INITIALIZATION FAILED",
    true
  );
}
