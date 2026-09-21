const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const airportCatalog = require(
  "../data/airport-catalog"
);

const ROUTE_MAP_SOURCE =
  fs.readFileSync(
    path.join(
      __dirname,
      "route-map.js"
    ),
    "utf8"
  );

const DASHBOARD_SOURCE =
  fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );

class FakePart {
  constructor() {
    this.attributes = {};
  }

  setAttribute(name, value) {
    this.attributes[name] =
      String(value);
  }

}

class FakeElement {
  constructor(
    width = 875,
    height = 610
  ) {
    this.attributes = {};
    this.style = {};
    this.hidden = false;
    this.textContent = "";
    this.parts = {
      ".airport-leader":
        new FakePart(),
      ".airport-placard":
        new FakePart()
    };
    this.rectangle = {
      width,
      height
    };
    this.classList = {
      values: new Set(),
      add: (...names) => {
        names.forEach(
          (name) =>
            this.classList
              .values
              .add(name)
        );
      },
      remove: (...names) => {
        names.forEach(
          (name) =>
            this.classList
              .values
              .delete(name)
        );
      },
      toggle: (name, force) => {
        if (force) {
          this.classList
            .values
            .add(name);
        } else {
          this.classList
            .values
            .delete(name);
        }
      }
    };
  }

  setAttribute(name, value) {
    this.attributes[name] =
      String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  querySelector(selector) {
    return this.parts[selector] ??
      null;
  }

  getBoundingClientRect() {
    return this.rectangle;
  }
}

function createHarness(
  flight,
  state = null,
  surfaceApi = null,
  pathname = ""
) {
  const ids = [
    "route-map-svg",
    "map-route-shadow",
    "map-route-line",
    "map-route-progress",
    "map-origin-marker",
    "map-destination-marker",
    "map-aircraft-marker",
    "map-compass-rose",
    "map-origin",
    "map-origin-city",
    "map-destination",
    "map-destination-city",
    "map-loading-message",
    "map-route-status",
    "route-map-shell"
  ];

  const elements =
    Object.fromEntries(
      ids.map(
        (id) => [
          id,
          new FakeElement()
        ]
      )
    );

  const listeners = {};
  const browserLocation = {
    pathname
  };

  const context = {
    console,
    location: browserLocation,
    dadRadarAirports:
      airportCatalog,
    dadRadarAirportSurface: surfaceApi,
    document: {
      getElementById: (id) =>
        elements[id] ?? null
    },
    window: {
      location: browserLocation,
      addEventListener:
        (name, handler) => {
          listeners[name] = handler;
        },
      clearTimeout,
      setTimeout
    },
    dadRadarState:
      state ?? { flight }
  };

  vm.runInNewContext(
    ROUTE_MAP_SOURCE,
    context
  );

  return {
    elements,
    listeners,
    context
  };
}

function testGroundLocationUsesDomesticOverview() {
  const { elements } =
    createHarness(null, {
      flight: null,
      locationAirport: "GSP",
      message:
        "DADDY IS ON THE GROUND IN GREER, SOUTH CAROLINA"
    });

  const camera = viewBox(
    elements["route-map-svg"]
  );

  assert.ok(
    camera[2] < 1100,
    "A domestic ground state should use the U.S. overview instead of the full international map."
  );
  assert.equal(
    elements["map-loading-message"].hidden,
    true,
    "The ground location should be marked without covering the center of the map."
  );
  assert.equal(
    elements["map-destination"].textContent,
    "GSP"
  );
  assert.equal(
    elements["map-destination-marker"].attributes.visibility,
    "visible"
  );
}

function testReferenceCitiesStayReadableWhileZoomed() {
  assert.match(
    ROUTE_MAP_SOURCE,
    /scaleReferenceCities\(camera\)/,
    "Reference-city labels should counter-scale as the map zooms."
  );

  const fullMobile =
    createHarness(
      flightAtAltitude(12000),
      null,
      null,
      "/mobile/full"
    );

  fullMobile.elements[
    "route-map-svg"
  ].rectangle.width = 600;

  const fullBoost =
    fullMobile.context
      .referenceCityPresentationScale();

  assert(
    fullBoost > 1 &&
    fullBoost < 1.5,
    "Full mobile should compensate modestly for cabinet scaling without turning city names into billboards."
  );

  const renderedFontPixels =
    11 *
    fullBoost *
    600 /
    1200;

  assert(
    renderedFontPixels >= 6 &&
    renderedFontPixels <= 7,
    "Full-mobile city labels should read as restrained map print rather than oversized interface text."
  );

  const compactMobile =
    createHarness(
      flightAtAltitude(12000),
      null,
      null,
      "/mobile"
    );

  compactMobile.elements[
    "route-map-svg"
  ].rectangle.width = 600;

  const compactBoost =
    compactMobile.context
      .referenceCityPresentationScale();

  const compactFontPixels =
    11 *
    compactBoost *
    600 /
    1200;

  assert(
    compactFontPixels >= 5.5 &&
    compactFontPixels <= 6.25,
    "Compact-mobile city labels should remain legible while staying subordinate to flight information."
  );

  const desktop =
    createHarness(
      flightAtAltitude(12000),
      null,
      null,
      "/"
    );

  desktop.elements[
    "route-map-svg"
  ].rectangle.width = 600;

  assert.equal(
    desktop.context
      .referenceCityPresentationScale(),
    1,
    "Desktop keeps the existing city-label presentation scale."
  );
}

function testAshevilleIsPermanentHomeReference() {
  assert.match(
    ROUTE_MAP_SOURCE,
    /\["ASHEVILLE",\s*35\.6,\s*-82\.55,\s*"home"\]/,
    "Asheville should remain visible as Dad Radar's home reference city."
  );
}

function testTelemetryMapRenderingIsThrottled() {
  assert.match(
    ROUTE_MAP_SOURCE,
    /TELEMETRY_MAP_INTERVAL_MS\s*=\s*\n?\s*125/,
    "Heavy map rendering should be throttled during live interpolation."
  );
  assert.match(
    ROUTE_MAP_SOURCE,
    /event\.detail\?\.telemetryOnly/,
    "The route map should distinguish lightweight telemetry frames."
  );
}

function testMobileTelemetryCameraIsStabilized() {
  const flight =
    flightAtAltitude(12000);

  const mobile =
    createHarness(
      flight,
      null,
      null,
      "/mobile"
    );

  const before =
    viewBox(
      mobile.elements[
        "route-map-svg"
      ]
    );

  const lowFlight = {
    ...flight,
    altitude: 3000
  };

  const directTarget =
    viewBox(
      createHarness(
        lowFlight
      ).elements[
        "route-map-svg"
      ]
    );

  mobile.listeners[
    "dad-radar:visual-state-change"
  ]({
    detail: {
      telemetryOnly: true,
      state: {
        flight: lowFlight
      }
    }
  });

  const stabilized =
    viewBox(
      mobile.elements[
        "route-map-svg"
      ]
    );

  assert(
    stabilized[2] <
      before[2],
    "Mobile telemetry should still move toward the tighter descent camera."
  );

  assert(
    stabilized[2] >
      directTarget[2],
    "Mobile telemetry should ease toward a new zoom target instead of snapping the viewBox."
  );
}

function jpegDimensions(buffer) {
  let offset = 2;

  while (
    offset + 9 <
    buffer.length
  ) {
    if (
      buffer[offset] !== 0xff
    ) {
      offset += 1;
      continue;
    }

    offset += 1;

    while (
      buffer[offset] === 0xff
    ) {
      offset += 1;
    }

    const marker =
      buffer[offset];
    offset += 1;

    if (
      marker === 0xd8 ||
      marker === 0xd9
    ) {
      continue;
    }

    if (
      marker === 0xda
    ) {
      break;
    }

    if (
      offset + 1 >=
      buffer.length
    ) {
      break;
    }

    const length =
      buffer.readUInt16BE(
        offset
      );

    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3,
        0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb,
        0xcd, 0xce, 0xcf
      ].includes(marker)
    ) {
      return {
        height:
          buffer.readUInt16BE(
            offset + 3
          ),
        width:
          buffer.readUInt16BE(
            offset + 5
          )
      };
    }

    offset += length;
  }

  throw new Error(
    "JPEG dimensions unavailable."
  );
}

function testHighResolutionTerrainLayer() {
  const terrainPath =
    path.join(
      __dirname,
      "..",
      "assets",
      "maps",
      "north-america-caribbean-relief-hires.jpg"
    );

  const terrain =
    fs.readFileSync(
      terrainPath
    );

  const dimensions =
    jpegDimensions(terrain);

  assert(
    dimensions.width >= 4000 &&
    dimensions.height >= 3000,
    "Regional terrain must retain enough source detail for close route-camera views."
  );

  const vectorAsset =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "assets",
        "maps",
        "north-america-caribbean-vintage.svg"
      ),
      "utf8"
    );

  assert.doesNotMatch(
    vectorAsset,
    /data:image\/png;base64/,
    "The vector geography must not carry the old 570x560 embedded relief raster."
  );

  assert.doesNotMatch(
    vectorAsset,
    /north-america-caribbean-relief-hires\.jpg/,
    "The child SVG must not load terrain as a nested image."
  );

  assert.match(
    DASHBOARD_SOURCE,
    /class="map-terrain-relief"[\s\S]*?north-america-caribbean-relief-hires\.jpg\?v=terrain-direct-4/,
    "The main display must mount terrain directly in the live map SVG."
  );

  assert.match(
    DASHBOARD_SOURCE,
    /north-america-caribbean-vintage\.svg\?v=antique-chart-3-dark-stock/,
    "The main display must bust the cached nested-terrain map asset."
  );

  const mobileSource =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "Mobile",
        "index.html"
      ),
      "utf8"
    );

  assert.match(
    mobileSource,
    /class="map-terrain-relief"[\s\S]*?north-america-caribbean-relief-hires\.jpg\?v=terrain-direct-4/,
    "Compact mobile must mount terrain directly in the live map SVG."
  );

  assert.match(
    mobileSource,
    /north-america-caribbean-vintage\.svg\?v=antique-chart-3-dark-stock/,
    "Compact mobile must bust the cached nested-terrain map asset."
  );
}

function viewBox(element) {
  return element.attributes
    .viewBox
    .split(" ")
    .map(Number);
}

function flightAtAltitude(
  altitude,
  overrides = {}
) {
  return {
    origin: "DFW",
    destination: "BIL",
    latitude: 39.8,
    longitude: -103.4,
    heading: 325,
    progress: 52,
    altitude,
    ...overrides
  };
}

function testDetailedMapAsset() {
  const assetPath = path.join(
    __dirname,
    "..",
    "assets",
    "maps",
    "contiguous-us-vintage.svg"
  );

  const asset =
    fs.readFileSync(
      assetPath,
      "utf8"
    );

  const jurisdictionCount =
    asset.match(
      /data-fips=/g
    )?.length ?? 0;

  assert.equal(
    jurisdictionCount,
    49,
    "The vector map should include the 48 contiguous states and D.C."
  );

  assert.match(
    asset,
    /nation-outline/
  );
}

function testRouteAutoFitAndPlacards() {
  const { elements } =
    createHarness({
      origin: "ORD",
      destination: "GSO",
      destinationCity:
        "GREENSBORO",
      latitude: 39.2,
      longitude: -83.8,
      heading: 165,
      progress: 60
    });

  const camera =
    viewBox(
      elements["route-map-svg"]
    );

  assert.ok(
    camera[2] < 800,
    "A regional route should zoom beyond the national view."
  );

  assert.ok(
    elements["map-route-line"]
      .attributes.d
  );

  assert.equal(
    elements["map-aircraft-marker"]
      .attributes.visibility,
    "visible"
  );

  assert.equal(
    elements["map-destination"]
      .textContent,
    "GSO"
  );

  const originLeader =
    elements["map-origin-marker"]
      .parts[".airport-leader"]
      .attributes;

  const destinationLeader =
    elements["map-destination-marker"]
      .parts[".airport-leader"]
      .attributes;

  assert.notEqual(
    Number(originLeader.y2),
    0,
    "The origin placard should sit clear of the route tangent."
  );

  assert.notEqual(
    Number(destinationLeader.y2),
    0,
    "The destination placard should sit clear of the route tangent."
  );

  assert.ok(
    Math.hypot(
      Number(originLeader.x1),
      Number(originLeader.y1)
    ) >= 15,
    "The placard leader should begin outside the airport icon."
  );
}

function testAirportEndpointIcons() {
  const airportSymbols =
    DASHBOARD_SOURCE.match(
      /class="airport-symbol"/g
    ) ?? [];

  const medallionImages =
    DASHBOARD_SOURCE.match(
      /href="\.\/assets\/hardware\/airport-anchor-medallion\.png"/g
    ) ?? [];

  assert.equal(
    airportSymbols.length,
    2,
    "Both route endpoints should have an airport icon."
  );

  assert.equal(
    medallionImages.length,
    2,
    "Each airport icon should use the approved medallion artwork."
  );
}

function testBillingsRouteIsKnown() {
  const { elements } =
    createHarness({
      origin: "DFW",
      destination: "BIL",
      destinationCity:
        "BILLINGS",
      latitude: 41.2,
      longitude: -103.5,
      heading: 320,
      progress: 55
    });

  assert.ok(
    elements["map-route-line"]
      .attributes.d
  );
  assert.equal(
    elements["map-destination"]
      .textContent,
    "BIL"
  );

  assert.equal(
    elements["map-origin-city"]
      .attributes.textLength,
    "114",
    "Long airport names should fit within their placards."
  );

  assert.equal(
    elements["map-origin-city"]
      .attributes.lengthAdjust,
    "spacingAndGlyphs"
  );

  assert.equal(
    elements["map-destination-city"]
      .attributes.textLength,
    undefined,
    "Short airport names should keep their natural letter spacing."
  );
}

function testCatalogSuppliesUnlistedRoute() {
  const { elements } =
    createHarness({
      origin: "SEA",
      destination: "MCI",
      destinationCity:
        "Kansas City",
      progress: 40
    });

  assert.ok(
    elements["map-route-line"]
      .attributes.d,
    "Any cataloged contiguous-U.S. route should render without a hand-maintained coordinate entry."
  );
  assert.equal(
    elements["map-origin-city"]
      .textContent,
    "SEATTLE"
  );
  assert.equal(
    elements["map-destination-city"]
      .textContent,
    "KANSAS CITY"
  );
}

function testFiledRouteFixesShapeTheTrack() {
  const directHarness =
    createHarness({
      origin: "ORD",
      destination: "AVL",
      progress: 48
    });

  const directPath =
    directHarness.elements[
      "map-route-line"
    ].attributes.d;

  assert.equal(
    directHarness.elements[
      "map-route-status"
    ].textContent,
    "FILED ROUTE PENDING"
  );

  const filedHarness =
    createHarness({
      origin: "ORD",
      destination: "AVL",
      progress: 48,
      filedRoute: {
        routeText:
          "ORD5 EARND HMV AVL",
        routeDistance: 536,
        fixes: [
          {
            name: "EARND",
            latitude: 40.72,
            longitude: -85.2
          },
          {
            name: "HMV",
            latitude: 36.44,
            longitude: -82.13
          }
        ]
      }
    });

  const filedPath =
    filedHarness.elements[
      "map-route-line"
    ].attributes.d;

  assert.equal(
    filedHarness.elements[
      "map-route-status"
    ].textContent,
    "FILED ROUTE • LIVE TRACK"
  );

  assert.notEqual(
    filedPath,
    directPath,
    "Decoded filed-route fixes should replace the decorative direct arc."
  );
  assert.ok(
    (
      filedPath.match(/\bC\b/g) ?? []
    ).length >= 3,
    "The filed route should be drawn as a smooth multi-fix path."
  );

  const fallbackPath =
    createHarness({
      origin: "ORD",
      destination: "AVL",
      progress: 48,
      filedRoute: {
        fixes: [
          {
            name: "UNKNOWN",
            latitude: null,
            longitude: null
          }
        ]
      }
    }).elements["map-route-line"]
      .attributes.d;

  assert.match(
    fallbackPath,
    /\bQ\b/,
    "An undecodable route should retain the existing direct-curve fallback."
  );
}

function testUnknownAirportLiveFallback() {
  const { elements } =
    createHarness({
      origin: "ORD",
      destination: "XYZ",
      destinationCity: "UNKNOWN",
      latitude: 39,
      longitude: -82,
      heading: 90
    });

  assert.equal(
    elements["map-aircraft-marker"]
      .attributes.visibility,
    "visible"
  );

  assert.equal(
    elements["map-route-line"]
      .attributes.d,
    ""
  );

  assert.equal(
    elements["map-destination"]
      .textContent,
    "XYZ"
  );
}

function testObservedTrackReplacesEstimatedProgress() {
  const { elements } = createHarness({
    origin: "DFW",
    destination: "BIL",
    latitude: 39.8,
    longitude: -103.4,
    heading: 324,
    progress: 52,
    actualTrack: [
      {
        latitude: 33.1,
        longitude: -97.0
      },
      {
        latitude: 36.2,
        longitude: -100.5
      },
      {
        latitude: 39.8,
        longitude: -103.4
      }
    ]
  });

  assert.match(
    elements["map-route-line"]
      .attributes.d,
    /\bQ\b/,
    "The planned route should remain the direct vintage arc."
  );

  assert.match(
    elements["map-route-progress"]
      .attributes.d,
    /\bC\b/,
    "Observed FR24 positions should draw the actual breadcrumb track."
  );

  assert.equal(
    elements["map-route-progress"]
      .style.strokeDasharray,
    "none"
  );

  assert.notEqual(
    elements["map-route-line"]
      .style.strokeDasharray,
    "none",
    "The planned route should remain dashed."
  );

  assert.equal(
    elements["map-route-shadow"]
      .style.strokeDasharray,
    elements["map-route-line"]
      .style.strokeDasharray,
    "The planned-route shadow must use the same dash pattern instead of visually filling the gaps."
  );

  const [dashLength, dashGap] =
    elements["map-route-line"]
      .style.strokeDasharray
      .split(/\s+/)
      .map(Number);

  assert.ok(
    dashGap >= dashLength * 2,
    "The planned route needs clearly separated short dashes rather than an almost-solid line."
  );
}

function testVisualStateDrivesAircraftMotion() {
  const initialFlight = {
    origin: "ORD",
    destination: "GSO",
    latitude: 40,
    longitude: -84,
    heading: 145,
    progress: 55
  };

  const {
    elements,
    listeners
  } = createHarness(initialFlight);

  const originalTransform =
    elements["map-aircraft-marker"]
      .attributes.transform;

  assert.equal(
    typeof listeners[
      "dad-radar:visual-state-change"
    ],
    "function"
  );

  listeners[
    "dad-radar:visual-state-change"
  ]({
    detail: {
      state: {
        flight: {
          ...initialFlight,
          latitude: 38,
          longitude: -82.5,
          heading: 160,
          progress: 70
        }
      }
    }
  });

  assert.notEqual(
    elements["map-aircraft-marker"]
      .attributes.transform,
    originalTransform
  );
}

function testActualTrackPreservesSlowFinalTelemetry() {
  const flight = {
    flightNumber: "3917",
    origin: "ORD",
    destination: "CMH",
    latitude: 40.001358,
    longitude: -82.875122,
    heading: 90,
    progress: 99,
    actualTrack: [
      {latitude: 41.97689, longitude: -87.89888},
      {latitude: 40.80, longitude: -85.20},
      {latitude: 40.20, longitude: -83.55},
      {latitude: 40.0500, longitude: -83.0500},
      {latitude: 40.0400, longitude: -83.0200},
      {latitude: 40.0300, longitude: -82.9900},
      {latitude: 40.0200, longitude: -82.9600},
      {latitude: 40.0100, longitude: -82.9300},
      {latitude: 40.001358, longitude: -82.875122}
    ]
  };

  const {elements, context} = createHarness(flight);
  const finalPoint = context.project(-82.875122, 40.001358);
  const pathData = elements["map-route-progress"].attributes.d;
  const expectedEnding = finalPoint.x.toFixed(1) + " " + finalPoint.y.toFixed(1);

  assert.ok(
    pathData.endsWith(expectedEnding),
    "The active actual track must keep its final telemetry point through slow approach/taxi samples."
  );
}

function testActualTrackSurvivesTransientHistoryGap() {
  const flight = {
    flightNumber: "3941",
    origin: "ORD",
    destination: "XNA",
    latitude: 38.8,
    longitude: -90.2,
    heading: 220,
    progress: 55,
    actualTrack: [
      { latitude: 41.97, longitude: -87.9 },
      { latitude: 40.2, longitude: -89.1 },
      { latitude: 38.8, longitude: -90.2 }
    ]
  };

  const { elements, listeners } =
    createHarness(flight);

  const retainedPath =
    elements["map-route-progress"]
      .attributes.d;

  listeners[
    "dad-radar:visual-state-change"
  ]({
    detail: {
      state: {
        flight: {
          ...flight,
          actualTrack: []
        }
      }
    }
  });

  assert.equal(
    elements["map-route-progress"]
      .attributes.d,
    retainedPath,
    "A temporary snapshot without track history must not erase the accumulated solid track."
  );
}

function testSurfaceZoomIsContinuous() {
  const highCamera =
    viewBox(
      createHarness(
        flightAtAltitude(12000)
      ).elements["route-map-svg"]
    );

  const thresholdCamera =
    viewBox(
      createHarness(
        flightAtAltitude(10000)
      ).elements["route-map-svg"]
    );

  const middleCamera =
    viewBox(
      createHarness(
        flightAtAltitude(5000)
      ).elements["route-map-svg"]
    );

  const surfaceCamera =
    viewBox(
      createHarness(
        flightAtAltitude(0)
      ).elements["route-map-svg"]
    );

  assert.equal(
    highCamera[2],
    thresholdCamera[2],
    "The route camera should remain unchanged at or above 10,000 feet."
  );

  assert.ok(
    middleCamera[2] < highCamera[2] &&
    middleCamera[2] > surfaceCamera[2],
    "The camera should progressively tighten as altitude decreases."
  );

  assert.equal(
    surfaceCamera[2],
    50,
    "Low-altitude regional focus should use the tighter 24x limit."
  );

  const expectedAircraftX =
    315 +
    (
      (-103.4 + 135) / 80
    ) * 570;

  const surfaceCenterX =
    surfaceCamera[0] +
    surfaceCamera[2] / 2;

  assert.ok(
    Math.abs(
      surfaceCenterX -
      expectedAircraftX
    ) < 0.2,
    "The closest view should center on the live aircraft location."
  );
}

function testSurfaceZoomAtBothRouteEnds() {
  const departure = {
    latitude: 32.91,
    longitude: -97.04,
    progress: 4
  };

  const approach = {
    latitude: 45.81,
    longitude: -108.54,
    progress: 96
  };

  [departure, approach]
    .forEach((position) => {
      const highCamera =
        viewBox(
          createHarness(
            flightAtAltitude(
              12000,
              position
            )
          ).elements["route-map-svg"]
        );

      const lowCamera =
        viewBox(
          createHarness(
            flightAtAltitude(
              3000,
              position
            )
          ).elements["route-map-svg"]
        );

      assert.ok(
        lowCamera[2] < highCamera[2],
        "Low-altitude focus should work near both departure and destination."
      );
    });
}

function testAirportCameraIntegration() {
  const realApi = require("./airport-surface-map");
  const surfaceApi = {...realApi, createController: () => ({render: () => false})};
  const den = airportCatalog.lookupAirport("DEN");
  const flight = flightAtAltitude(null, {origin: "DEN", destination: "ORD", latitude: den.latitude, longitude: den.longitude});
  const missing = viewBox(createHarness(flight, null, surfaceApi).elements["route-map-svg"]);
  const high = viewBox(createHarness({...flight, altitude: den.elevationFeet + 11000}, null, surfaceApi).elements["route-map-svg"]);
  const low = viewBox(createHarness({...flight, altitude: den.elevationFeet + 1000}, null, surfaceApi).elements["route-map-svg"]);
  assert.deepEqual(missing, high, "Missing altitude must retain the route camera rather than becoming zero feet.");
  assert(low[2] < high[2], "The integrated low-airport camera uses height above DEN, not sea level.");
}

function testPersistentSequenceTracksStayInsideRegionalCamera() {
  const flight = {
    origin: "ORD",
    destination: "CMI",
    progress: 0,
    altitude: null
  };
  const state = {
    flight,
    sequenceHistory: {
      currentEventKey: "current-3375",
      legs: [
        {
          eventKey: "ord-cmh",
          origin: "ORD",
          destination: "CMH",
          track: [
            {latitude: 41.9742, longitude: -87.9073},
            {latitude: 40.7, longitude: -84.8},
            {latitude: 39.998, longitude: -82.8919}
          ]
        },
        {
          eventKey: "cmh-ord",
          origin: "CMH",
          destination: "ORD",
          track: [
            {latitude: 39.998, longitude: -82.8919},
            {latitude: 40.8, longitude: -85.2},
            {latitude: 41.9742, longitude: -87.9073}
          ]
        },
        {
          eventKey: "current-3375",
          origin: "ORD",
          destination: "CMI",
          track: []
        }
      ]
    }
  };
  const {elements, context} = createHarness(flight, state);
  const camera = viewBox(elements["route-map-svg"]);
  const columbus = context.project(-82.8919, 39.998);
  const chicago = context.project(-87.9073, 41.9742);
  const cameraCenter = {
    x: camera[0] + camera[2] / 2,
    y: camera[1] + camera[3] / 2
  };
  assert(
    columbus.x >= camera[0] && columbus.x <= camera[0] + camera[2],
    "The regional camera must keep previous persistent sequence tracks in frame instead of clipping Columbus offscreen when the current leg is ORD-CMI."
  );
  assert(
    Math.abs(cameraCenter.x - chicago.x) < 1 &&
    Math.abs(cameraCenter.y - chicago.y) < 1,
    "Persistent history may widen the camera, but a delayed ORD-CMI leg must stay centered on ORD/Chicago rather than on the old tracks."
  );
}

function testShortFlightFraming() {
  const flight = {origin: "ORD", destination: "MSN", latitude: 42.45, longitude: -88.6,
    altitude: 12225, heading: 320, progress: 45};
  const high = viewBox(createHarness(flight).elements["route-map-svg"]);
  assert(high[2] < 90, "ORD–MSN should fill a regional frame, not the old 353-unit national view");
  const low = viewBox(createHarness({...flight, altitude: 3000}).elements["route-map-svg"]);
  assert(low[2] <= high[2], "Descending cannot widen a tightly framed short route");
  const unknown = viewBox(createHarness({...flight, altitude: null}).elements["route-map-svg"]);
  assert.deepEqual(unknown, high, "Missing altitude keeps the route fit");
}

function runTests() {
  testPersistentSequenceTracksStayInsideRegionalCamera();
  testShortFlightFraming();
  testAirportCameraIntegration();
  testDetailedMapAsset();
  testGroundLocationUsesDomesticOverview();
  testReferenceCitiesStayReadableWhileZoomed();
  testAshevilleIsPermanentHomeReference();
  testTelemetryMapRenderingIsThrottled();
  testMobileTelemetryCameraIsStabilized();
  testHighResolutionTerrainLayer();
  testRouteAutoFitAndPlacards();
  testAirportEndpointIcons();
  testBillingsRouteIsKnown();
  testCatalogSuppliesUnlistedRoute();
  testFiledRouteFixesShapeTheTrack();
  testUnknownAirportLiveFallback();
  testObservedTrackReplacesEstimatedProgress();
  testVisualStateDrivesAircraftMotion();
  testActualTrackPreservesSlowFinalTelemetry();
  testActualTrackSurvivesTransientHistoryGap();
  testSurfaceZoomIsContinuous();
  testSurfaceZoomAtBothRouteEnds();

  console.log(
    "Route map tests passed."
  );
}

function testRadarFollowsViewport() {
  const {context} = createHarness(null, {locationAirport: "AVL", flight: null});
  const wide = context.radarFrameForCamera({x: 0, y: 0, width: 1200, height: 650});
  assert.equal(wide.bbox.join(","), "-135,5,-55,62");
  const close = context.radarFrameForCamera({x: 640, y: 200, width: 50, height: 30});
  assert(close.bbox[2] - close.bbox[0] < 12, "Zoomed radar should sample the region, not the continent");
  assert(close.bbox[3] - close.bbox[1] < 6);
  const nw = context.project(close.bbox[0], close.bbox[3]);
  const se = context.project(close.bbox[2], close.bbox[1]);
  assert.equal(close.x, nw.x); assert.equal(close.y, nw.y);
  assert.equal(close.width, se.x - nw.x); assert.equal(close.height, se.y - nw.y);
  const nearby = context.radarFrameForCamera({x: 640.01, y: 200.01, width: 50, height: 30});
  assert.equal(nearby.bbox.join(","), close.bbox.join(","), "Tiny camera moves share radar images");
}
testRadarFollowsViewport();
runTests();
