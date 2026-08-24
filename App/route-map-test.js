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

function createHarness(flight) {
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

  const context = {
    console,
    dadRadarAirports:
      airportCatalog,
    document: {
      getElementById: (id) =>
        elements[id] ?? null
    },
    window: {
      addEventListener:
        (name, handler) => {
          listeners[name] = handler;
        },
      clearTimeout,
      setTimeout
    },
    dadRadarState: {
      flight
    }
  };

  vm.runInNewContext(
    ROUTE_MAP_SOURCE,
    context
  );

  return {
    elements,
    listeners
  };
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

  const runwaySymbols =
    DASHBOARD_SOURCE.match(
      /class="airport-symbol-runway"/g
    ) ?? [];

  assert.equal(
    airportSymbols.length,
    2,
    "Both route endpoints should have an airport icon."
  );

  assert.equal(
    runwaySymbols.length,
    2,
    "Each airport icon should include a primary runway symbol."
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
  const directPath =
    createHarness({
      origin: "ORD",
      destination: "AVL",
      progress: 48
    }).elements["map-route-line"]
      .attributes.d;

  const filedPath =
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
    }).elements["map-route-line"]
      .attributes.d;

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
    200,
    "The closest surface view should use the configured 6x zoom."
  );

  const expectedAircraftX =
    60 +
    (
      (-103.4 + 135) / 80
    ) * 1080;

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

function runTests() {
  testDetailedMapAsset();
  testRouteAutoFitAndPlacards();
  testAirportEndpointIcons();
  testBillingsRouteIsKnown();
  testCatalogSuppliesUnlistedRoute();
  testFiledRouteFixesShapeTheTrack();
  testUnknownAirportLiveFallback();
  testObservedTrackReplacesEstimatedProgress();
  testVisualStateDrivesAircraftMotion();
  testSurfaceZoomIsContinuous();
  testSurfaceZoomAtBothRouteEnds();

  console.log(
    "Route map tests passed."
  );
}

runTests();
