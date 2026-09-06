(function initializeSequenceHistoryMap(global) {
  "use strict";

  const airportCatalog =
    global.dadRadarAirports;

  const MAP_BOUNDS = {
    west: -126,
    east: -66,
    south: 24,
    north: 51
  };

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

  const MAX_HISTORY_ZOOM = 3.2;
  const SURFACE_FOCUS_ALTITUDE = 10000;

  const svg =
    document.getElementById(
      "route-map-svg"
    );

  const shell =
    document.getElementById(
      "route-map-shell"
    );

  const routeShadow =
    document.getElementById(
      "map-route-shadow"
    );

  const compassRose =
    document.getElementById(
      "map-compass-rose"
    );

  const loadingMessage =
    document.getElementById(
      "map-loading-message"
    );

  let currentHistory =
    global.dadRadarSequenceHistoryCurrent ??
    null;

  let currentState = null;
  let historyLayer = null;

  function clamp(value, minimum, maximum) {
    return Math.max(
      minimum,
      Math.min(maximum, value)
    );
  }

  function ensureHistoryLayer() {
    if (historyLayer?.isConnected) {
      return historyLayer;
    }

    historyLayer =
      document.getElementById(
        "map-sequence-history-layer"
      );

    if (historyLayer) {
      return historyLayer;
    }

    if (!svg) {
      return null;
    }

    historyLayer = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

    historyLayer.setAttribute(
      "id",
      "map-sequence-history-layer"
    );

    historyLayer.setAttribute(
      "class",
      "map-sequence-history-layer"
    );

    if (
      routeShadow?.parentNode === svg ||
      routeShadow?.parentNode
    ) {
      routeShadow.parentNode.insertBefore(
        historyLayer,
        routeShadow
      );
    } else {
      svg.appendChild(historyLayer);
    }

    return historyLayer;
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

  function airportPoint(code) {
    const airport =
      airportCatalog?.lookupAirport?.(code);

    if (
      !airport ||
      !Number.isFinite(
        airport.latitude
      ) ||
      !Number.isFinite(
        airport.longitude
      ) ||
      airport.longitude < MAP_BOUNDS.west ||
      airport.longitude > MAP_BOUNDS.east ||
      airport.latitude < MAP_BOUNDS.south ||
      airport.latitude > MAP_BOUNDS.north
    ) {
      return null;
    }

    return project(
      airport.longitude,
      airport.latitude
    );
  }

  function trackPoint(point) {
    const latitude = Number(
      point?.latitude ?? point?.lat
    );

    const longitude = Number(
      point?.longitude ?? point?.lon
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

  function deduplicate(points) {
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

  function smoothPath(points) {
    if (points.length < 2) {
      return "";
    }

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

  function fallbackCurve(
    originPoint,
    destinationPoint
  ) {
    const dx =
      destinationPoint.x -
      originPoint.x;

    const dy =
      destinationPoint.y -
      originPoint.y;

    const distance =
      Math.hypot(dx, dy) || 1;

    const midpoint = {
      x:
        (originPoint.x +
          destinationPoint.x) / 2,
      y:
        (originPoint.y +
          destinationPoint.y) / 2
    };

    const normal = {
      x: -dy / distance,
      y: dx / distance
    };

    const arcHeight = Math.min(
      115,
      Math.max(
        45,
        distance * 0.22
      )
    );

    const control = {
      x:
        midpoint.x +
        normal.x * arcHeight,
      y:
        midpoint.y +
        normal.y * arcHeight
    };

    return {
      path:
        `M ${originPoint.x.toFixed(1)} ${originPoint.y.toFixed(1)} ` +
        `Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ` +
        `${destinationPoint.x.toFixed(1)} ${destinationPoint.y.toFixed(1)}`,
      points: [
        originPoint,
        control,
        destinationPoint
      ]
    };
  }

  function geometryForLeg(leg) {
    const observedPoints = deduplicate(
      (
        Array.isArray(leg?.track)
          ? leg.track
          : []
      )
        .map(trackPoint)
        .filter(Boolean)
    );

    if (observedPoints.length >= 2) {
      return {
        kind: "observed",
        path: smoothPath(observedPoints),
        points: observedPoints
      };
    }

    const origin = airportPoint(
      leg?.origin
    );

    const destination = airportPoint(
      leg?.destination
    );

    if (!origin || !destination) {
      return null;
    }

    return {
      kind: "fallback",
      ...fallbackCurve(
        origin,
        destination
      )
    };
  }

  function isCurrentLeg(leg) {
    const flight = currentState?.flight;

    if (!flight) {
      return false;
    }

    const sameEvent = Boolean(
      leg?.eventId &&
      currentState?.eventId &&
      leg.eventId === currentState.eventId
    );

    const sameRoute =
      String(leg?.origin ?? "") ===
        String(flight.origin ?? "") &&
      String(leg?.destination ?? "") ===
        String(flight.destination ?? "");

    const sameNumber =
      !leg?.flightNumber ||
      String(flight.number ?? "")
        .replace(/\D/g, "")
        .endsWith(
          String(leg.flightNumber)
        );

    return sameRoute &&
      sameNumber &&
      (sameEvent || !leg?.eventId);
  }

  function viewportAspectRatio() {
    const rectangle =
      svg?.getBoundingClientRect?.();

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

  function fitCamera(points) {
    const usable = points.filter(
      (point) =>
        Number.isFinite(point?.x) &&
        Number.isFinite(point?.y)
    );

    if (!usable.length) {
      return null;
    }

    const xValues = usable.map(
      (point) => point.x
    );

    const yValues = usable.map(
      (point) => point.y
    );

    const minimumX = Math.min(...xValues);
    const maximumX = Math.max(...xValues);
    const minimumY = Math.min(...yValues);
    const maximumY = Math.max(...yValues);

    const routeWidth = Math.max(
      maximumX - minimumX,
      1
    );

    const routeHeight = Math.max(
      maximumY - minimumY,
      1
    );

    const horizontalPadding = Math.max(
      92,
      routeWidth * 0.18
    );

    const verticalPadding = Math.max(
      82,
      routeHeight * 0.24
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
      MAX_HISTORY_ZOOM;

    if (width < minimumWidth) {
      width = minimumWidth;
      height = width / aspectRatio;
    }

    width = Math.min(
      width,
      BASE_VIEW_BOX.width
    );

    height = Math.min(
      height,
      BASE_VIEW_BOX.height
    );

    const centerX =
      (minimumX + maximumX) / 2;

    const centerY =
      (minimumY + maximumY) / 2;

    let x = centerX - width / 2;
    let y = centerY - height / 2;

    x = clamp(
      x,
      BASE_VIEW_BOX.x,
      BASE_VIEW_BOX.x +
        BASE_VIEW_BOX.width - width
    );

    y = clamp(
      y,
      BASE_VIEW_BOX.y,
      BASE_VIEW_BOX.y +
        BASE_VIEW_BOX.height - height
    );

    return {
      x,
      y,
      width,
      height,
      zoom:
        BASE_VIEW_BOX.width / width
    };
  }

  function positionCompass(camera) {
    if (!compassRose || !camera) {
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

    compassRose.setAttribute(
      "transform",
      `translate(${x.toFixed(1)} ${y.toFixed(1)}) ` +
      `scale(${inverseZoom.toFixed(4)})`
    );
  }

  function applyHistoryCamera(points) {
    if (!svg || !points.length) {
      return;
    }

    const altitude = Number(
      currentState?.flight?.altitude
    );

    const hasLivePosition =
      Number.isFinite(
        Number(
          currentState?.flight?.latitude
        )
      ) &&
      Number.isFinite(
        Number(
          currentState?.flight?.longitude
        )
      );

    if (
      hasLivePosition &&
      Number.isFinite(altitude) &&
      altitude < SURFACE_FOCUS_ALTITUDE
    ) {
      return;
    }

    const camera = fitCamera(points);

    if (!camera) {
      return;
    }

    svg.setAttribute(
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

  function render() {
    const layer = ensureHistoryLayer();

    if (!layer) {
      return;
    }

    layer.replaceChildren();

    const history = currentHistory;

    if (
      !history ||
      !Array.isArray(history.legs) ||
      history.legs.length === 0
    ) {
      return;
    }

    const cameraPoints = [];
    let renderedLegCount = 0;

    for (const leg of history.legs) {
      if (isCurrentLeg(leg)) {
        continue;
      }

      const geometry =
        geometryForLeg(leg);

      if (!geometry) {
        continue;
      }

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      path.setAttribute(
        "d",
        geometry.path
      );

      path.setAttribute(
        "class",
        `map-sequence-history-leg is-${geometry.kind}`
      );

      path.dataset.eventId =
        leg.eventId ?? "";

      layer.appendChild(path);
      cameraPoints.push(...geometry.points);
      renderedLegCount += 1;
    }

    const currentOrigin =
      airportPoint(
        currentState?.flight?.origin
      );

    const currentDestination =
      airportPoint(
        currentState?.flight?.destination
      );

    const currentAircraft =
      trackPoint({
        latitude:
          currentState?.flight?.latitude,
        longitude:
          currentState?.flight?.longitude
      });

    cameraPoints.push(
      ...[
        currentOrigin,
        currentDestination,
        currentAircraft
      ].filter(Boolean)
    );

    if (
      renderedLegCount > 0 &&
      cameraPoints.length > 0
    ) {
      applyHistoryCamera(
        cameraPoints
      );
    }

    if (
      !currentState?.flight &&
      renderedLegCount > 0
    ) {
      shell?.classList.add(
        "is-ready"
      );

      if (loadingMessage) {
        loadingMessage.hidden = true;
      }
    }
  }

  global.addEventListener(
    "dad-radar:sequence-history-change",
    (event) => {
      currentHistory =
        event.detail?.sequenceHistory ??
        null;

      global.requestAnimationFrame(render);
    }
  );

  global.addEventListener(
    "dad-radar:visual-state-change",
    (event) => {
      currentState =
        event.detail?.state ?? null;

      global.requestAnimationFrame(render);
    }
  );

  global.addEventListener(
    "resize",
    () => {
      global.requestAnimationFrame(render);
    }
  );

  global.requestAnimationFrame(render);
})(window);