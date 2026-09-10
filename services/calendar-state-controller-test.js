const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const airportCatalog = require(
  "../data/airport-catalog"
);

const projectRoot = path.join(
  __dirname,
  ".."
);

class TestCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function readProjectFile(relativePath) {
  return fs.readFileSync(
    path.join(
      projectRoot,
      relativePath
    ),
    "utf8"
  );
}

function createBrowserContext(
  options = {}
) {
  const dispatchedEvents = [];
  let nextTimerId = 1;

  const context = {
    console,
    dadRadarAirports:
      airportCatalog,
    CustomEvent: TestCustomEvent,
    Date,
    Intl,
    Promise,
    localStorage:
      options.localStorage,
    clearInterval() {},
    setInterval() {
      const timerId = nextTimerId;
      nextTimerId += 1;
      return timerId;
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      return true;
    }
  };

  context.window = context;
  context.globalThis = context;

  vm.createContext(context);

  for (const relativePath of [
    "config/settings.js",
    "models/states.js",
    "models/schedule-state.js",
    "models/live-flight-state.js",
    "App/state-engine.js",
    "services/calendar-state-controller.js"
  ]) {
    vm.runInContext(
      readProjectFile(relativePath),
      context,
      { filename: relativePath }
    );
  }

  return {
    context,
    dispatchedEvents
  };
}

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function activeFlightEvent() {
  return {
    id: "active-flight",
    kind: "flight",
    status: "confirmed",
    carrierCode: "MQ",
    flightNumber: "4140",
    origin: "ORD",
    destination: "AVL",
    liveLookupCandidates: [
      "ENY4140",
      "MQ4140"
    ],
    times: {
      startUtc:
        new Date(
          Date.now() - 30 * 60000
        ).toISOString(),
      endUtc:
        new Date(
          Date.now() + 60 * 60000
        ).toISOString()
    }
  };
}

async function testCalendarPublishesState() {
  const {
    context,
    dispatchedEvents
  } = createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        calendarId: "pilot-schedule",
        retrievedAt:
          new Date().toISOString(),
        events: [
          {
            id: "active-layover",
            kind: "layover",
            status: "confirmed",
            airport: "AVP",
            times: {
              startUtc:
                new Date(
                  Date.now() - 60000
                ).toISOString(),
              endUtc:
                new Date(
                  Date.now() + 60000
                ).toISOString()
            }
          }
        ]
      };
    }
  };

  const result =
    await context
      .refreshCalendarState();

  assert.equal(result.mode, "LAYOVER");

  const stateEvent =
    dispatchedEvents.find(
      (event) =>
        event.type ===
        "dad-radar:state-change"
    );

  assert.ok(stateEvent);
  assert.equal(
    stateEvent.detail.mode,
    "LAYOVER"
  );
  assert.equal(
    stateEvent.detail.state.message,
    "DADDY IS ON LAYOVER IN WILKES-BARRE/SCRANTON, PENNSYLVANIA"
  );
  assert.equal(
    stateEvent.detail.state
      .dailySchedule.context,
    "DADDY IS ON LAYOVER IN WILKES-BARRE/SCRANTON, PENNSYLVANIA"
  );
  assert.equal(
    stateEvent.detail.state
      .dailySchedule.entries.length,
    1
  );
  assert.equal(
    stateEvent.detail.state
      .dailySchedule.entries[0]
      .status,
    "current"
  );

  const syncEvent =
    dispatchedEvents.find(
      (event) =>
        event.type ===
        "dad-radar:calendar-sync"
    );

  assert.ok(syncEvent);
  assert.equal(syncEvent.detail.ok, true);
}

async function testExpiredCalendarShowsAuthorizationState() {
  const {
    context,
    dispatchedEvents
  } = createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      const error = new Error(
        "Google Calendar authorization must be renewed."
      );
      error.code =
        "calendar-authorization-required";
      throw error;
    }
  };

  const result =
    await context.refreshCalendarState();

  assert.equal(result, null);

  const stateEvent =
    dispatchedEvents.find(
      (event) =>
        event.type ===
        "dad-radar:state-change"
    );

  assert.equal(
    stateEvent.detail.mode,
    "CALENDAR_AUTH"
  );
  assert.equal(
    stateEvent.detail.state.status,
    "CAL AUTH"
  );
}

async function testLiveFlightRefinesCalendarState() {
  const {
    context,
    dispatchedEvents
  } = createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [activeFlightEvent()]
      };
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      return {
        provider: "flightradar24",
        providerFlightId:
          "ENY4140-1754290000-airline-0001",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4140",
        phase: "APPROACH",
        status: "En Route",
        origin: "ORD",
        destination: "AVL",
        progressPercent: 82,
        arrival: {
          best:
            new Date(
              Date.now() + 25 * 60000
            ).toISOString()
        },
        position: {
          latitude: 36.4,
          longitude: -83.1,
          altitudeFeet: 9000,
          groundSpeedKnots: 285,
          headingDegrees: 145,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();
  const result =
    await context
      .refreshLiveFlightState();

  assert.equal(result.mode, "APPROACH");
  assert.equal(
    result.state.source,
    "flightradar24"
  );
  assert.equal(
    result.state.flight.progress,
    82
  );
  assert.equal(
    result.state.flight.airspeed,
    null
  );
  assert.equal(
    result.state.flight.groundSpeed,
    285
  );
  assert.equal(
    result.state.flight.actualTrack
      .length,
    1
  );
  assert.equal(
    result.state.flight.actualTrack[0]
      .latitude,
    36.4
  );
  assert.equal(
    result.state.dailySchedule.context,
    "DADDY IS ALMOST IN ASHEVILLE, NORTH CAROLINA"
  );
  assert.equal(
    result.state.visualTransitionMs,
    52 * 1000
  );

  const syncEvent =
    dispatchedEvents.find(
      (event) =>
        event.type ===
        "dad-radar:live-flight-sync"
    );

  assert.ok(syncEvent);
  assert.equal(syncEvent.detail.ok, true);
}

async function testTaxiOutDoesNotRegressToCalendarDelay() {
  const { context } =
    createBrowserContext();

  const flight = activeFlightEvent();

  flight.times = {
    startUtc:
      new Date(
        Date.now() - 4 * 60000
      ).toISOString(),
    endUtc:
      new Date(
        Date.now() + 60 * 60000
      ).toISOString()
  };

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [flight]
      };
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      return {
        provider: "flightradar24",
        providerFlightId:
          "confirmed-taxi-out",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4140",
        phase: "TAXI_OUT",
        status: "Taxiing",
        origin: "ORD",
        destination: "AVL",
        progressPercent: 0,
        departure: {
          delayMinutes: null
        },
        position: {
          latitude: 41.9769,
          longitude: -87.9081,
          altitudeFeet: 680,
          groundSpeedKnots: 18,
          headingDegrees: 95,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  const boarding =
    await context.refreshCalendarState();

  assert.equal(boarding.mode, "BOARDING");

  const taxiOut =
    await context.refreshLiveFlightState();

  assert.equal(taxiOut.mode, "TAXI_OUT");

  // Advance the clock across the delay threshold without editing the flight.
  // Changing its start time is a schedule reassignment, not elapsed time.
  const later = Date.now() + 2 * 60000;
  context.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [later])); }
    static now() { return later; }
  };

  const afterDelayThreshold =
    await context.refreshCalendarState();

  assert.equal(
    afterDelayThreshold.mode,
    "TAXI_OUT"
  );
  assert.equal(
    afterDelayThreshold.state.status,
    "TAXI OUT"
  );
}

async function testLiveFailureRetainsCalendarState() {
  const {
    context,
    dispatchedEvents
  } = createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [activeFlightEvent()]
      };
    }
  };

  context.console = {
    ...console,
    warn() {}
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      throw new Error(
        "Flightradar24 unavailable"
      );
    }
  };

  const calendarResult =
    await context
      .refreshCalendarState();

  const result =
    await context
      .refreshLiveFlightState();

  assert.equal(
    calendarResult.mode,
    "DELAYED"
  );
  assert.equal(result.mode, "DELAYED");
  assert.equal(
    result.state.source,
    "calendar"
  );

  const failedSync =
    dispatchedEvents.find(
      (event) =>
        event.type ===
          "dad-radar:live-flight-sync" &&
        event.detail.ok === false
    );

  assert.ok(failedSync);
}

async function testApproachPersistsAcrossProviderRegression() {
  const { context } =
    createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [activeFlightEvent()]
      };
    }
  };

  let phase = "APPROACH";
  let altitudeFeet = 7000;
  let altitudeTrend = "";
  const requestOptions = [];

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot(
      event,
      options
    ) {
      requestOptions.push(options);

      return {
        provider: "flightradar24",
        providerFlightId:
          "ENY4140-1754290000-airline-0001",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4140",
        phase,
        status: "En Route",
        origin: "ORD",
        destination: "AVL",
        progressPercent: 91,
        position: {
          latitude: 35.72,
          longitude: -82.62,
          altitudeFeet,
          altitudeTrend,
          groundSpeedKnots: 210,
          headingDegrees: 145,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();

  const approach =
    await context
      .refreshLiveFlightState();

  assert.equal(
    approach.mode,
    "APPROACH"
  );

  phase = "EN_ROUTE";
  altitudeFeet = 6000;
  altitudeTrend = "D";

  const finalDescent =
    await context
      .refreshLiveFlightState();

  assert.equal(
    finalDescent.mode,
    "APPROACH"
  );
  assert.equal(
    finalDescent.state.status,
    "APPROACH"
  );
  assert.equal(
    requestOptions[0]
      .providerFlightId,
    null
  );
  assert.equal(
    requestOptions[1]
      .providerFlightId,
    "ENY4140-1754290000-airline-0001"
  );
}

async function testPollingContinuesAfterTouchdown() {
  const { context } =
    createBrowserContext();

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [activeFlightEvent()]
      };
    }
  };

  let requestCount = 0;

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      requestCount += 1;

      return {
        provider: "flightradar24",
        providerFlightId: "arrived-leg",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4140",
        phase: "ARRIVED",
        status: "Arrived",
        origin: "ORD",
        destination: "AVL",
        progressPercent: 100,
        position: {
          latitude: 35.44,
          longitude: -82.54,
          altitudeFeet: 2200,
          altitudeTrend: "",
          groundSpeedKnots: 24,
          headingDegrees: 160,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();

  const arrived =
    await context
      .refreshLiveFlightState();

  assert.equal(arrived.mode, "TAXI_IN");
  assert.equal(requestCount, 1);

  const nextRefresh =
    await context
      .refreshLiveFlightState();

  assert.equal(nextRefresh.mode, "TAXI_IN");
  assert.equal(
    requestCount,
    2,
    "Ground follow-up continues after provider reports arrival."
  );
}

async function testAdsbGroundArrivalContinuesWithoutPaidFallback(firstProvider = "adsb.lol", startWithLanding = false) {
  const {context} = createBrowserContext();
  let clock = Date.now();
  context.Date = class extends Date {
    constructor(...args) {super(...(args.length ? args : [clock]));}
    static now() {return clock;}
  };
  const flight = activeFlightEvent();
  flight.times.endUtc = new Date(clock + 60000).toISOString();
  context.dadRadarCalendarApi = {getUpcomingEvents: async () => ({retrievedAt: new Date(clock).toISOString(), events: [flight]})};
  const requests = [];
  let available = true;
  let outage = false;
  context.dadRadarLiveFlightApi = {getFlightSnapshot: async (_event, options) => {
    requests.push(options);
    if (outage) throw Object.assign(new Error("tracking-unavailable"), {code: "not-configured"});
    if (!available) return null;
    const provider = requests.length === 1 ? firstProvider : "adsb.lol";
    const landingReport = startWithLanding && requests.length === 1;
    return {provider, phase: landingReport ? "APPROACH" : "ARRIVED", origin: "ORD", destination: "AVL", ident: "ENY4140", progressPercent: 100,
      retrievedAt: new Date(clock).toISOString(), position: {latitude: 35.44, longitude: -82.54, onGround: !landingReport,
        altitudeFeet: landingReport ? 2500 : 2200,
        groundSpeedKnots: 0, headingDegrees: 170, recordedAt: new Date(clock).toISOString(), updateType: provider === "flightradar24" ? "ADSB" : "adsb_icao"}};
  }};
  await context.refreshCalendarState();
  if (startWithLanding) {
    assert.equal((await context.refreshLiveFlightState()).mode, "LANDING");
    clock += 15000;
  }
  const first = await context.refreshLiveFlightState();
  assert.equal(first.mode, "TAXI_IN");
  assert.equal(first.state.status, "TAXI IN");
  assert.equal(require("../App/airport-surface-map").selectAirport(first.state.flight.surfacePosition,
    [airportCatalog.lookupAirport("ORD"), airportCatalog.lookupAirport("AVL")], clock, null).airport.code,
    "AVL", "Taxi-in supplies valid destination ground coordinates to both maps");
  for (let minute = 0; minute < 4; minute++) {
    clock += 60000;
    const next = await context.refreshLiveFlightState();
    assert.equal(next.mode, "TAXI_IN", "The landing flight stays selected throughout taxi-in, past scheduled arrival.");
    assert.equal(next.state.flight.surfacePosition.recordedAt, new Date(clock).toISOString());
  }
  assert.equal(requests.length, startWithLanding ? 6 : 5);
  assert(requests.slice(startWithLanding ? 2 : 1).every(r => r.surfaceOnly === true), "After touchdown, requests explicitly prohibit FR24/filed-route fallback.");
  available = false;
  clock += 181000;
  const held = await context.refreshLiveFlightState();
  assert.equal(held.mode, "TAXI_IN", "A brief taxi-in coverage gap cannot fall back to Delayed.");
  outage = true;
  clock += 360000;
  assert.equal((await context.refreshLiveFlightState()).mode, "TAXI_IN", "An outage cannot confirm parking");
  outage = false;
  assert.equal((await context.refreshLiveFlightState()).mode, "TAXI_IN");
  for (let i = 0; i < 4; i++) {
    clock += 60000;
    assert.equal((await context.refreshLiveFlightState()).mode, "TAXI_IN");
  }
  clock += 60001;
  const parked = await context.refreshLiveFlightState();
  assert.equal(parked.mode, "ARRIVED", "Five minutes of healthy absence completes taxi-in");
  const count = requests.length;
  await context.refreshLiveFlightState();
  assert.equal(requests.length, count, "Polling stops only after parking grace completes");
}

async function testConfirmedArrivalDoesNotRewindToDeparture() {
  const storage = createMemoryStorage();
  const { context } =
    createBrowserContext({
      localStorage: storage
    });

  const flight = activeFlightEvent();

  flight.id = "ord-hpn-arrival";
  flight.origin = "ORD";
  flight.destination = "HPN";
  flight.times = {
    startUtc:
      new Date(
        Date.now() - 80 * 60000
      ).toISOString(),
    endUtc:
      new Date(
        Date.now() + 30 * 60000
      ).toISOString()
  };

  const schedule = {
    retrievedAt:
      new Date().toISOString(),
    events: [flight]
  };

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return schedule;
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      return {
        provider: "flightradar24",
        providerFlightId:
          "confirmed-hpn-arrival",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4140",
        phase: "ARRIVED",
        status: "Arrived",
        origin: "ORD",
        destination: "HPN",
        progressPercent: 100,
        departure: {
          delayMinutes: null
        },
        position: {
          latitude: 41.067,
          longitude: -73.708,
          altitudeFeet: 439,
          groundSpeedKnots: 18,
          headingDegrees: 115,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();

  const arrived =
    await context.refreshLiveFlightState();

  assert.equal(arrived.mode, "TAXI_IN");
  assert.equal(
    arrived.state.flight.destination,
    "HPN"
  );

  const realDate = Date;
  const retainedNow =
    realDate.now() + 4 * 60000;

  context.Date = class extends realDate {
    constructor(value) {
      super(
        value === undefined
          ? retainedNow
          : value
      );
    }

    static now() {
      return retainedNow;
    }
  };

  const retained =
    await context.refreshCalendarState();

  assert.equal(retained.mode, "TAXI_IN");
  assert.equal(
    retained.event.id,
    "ord-hpn-arrival"
  );
  assert.equal(
    retained.state.flight.origin,
    "ORD"
  );
  assert.equal(
    retained.state.flight.destination,
    "HPN"
  );
  assert.equal(
    retained.state.flight.progress,
    100
  );
  assert.equal(
    retained.state.flight.latitude,
    41.067
  );
  assert.equal(
    retained.state.flight
      .departureDelayMinutes,
    null
  );

  const reloaded =
    createBrowserContext({
      localStorage: storage
    }).context;

  reloaded.Date = context.Date;
  reloaded.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return schedule;
    }
  };

  const afterReload =
    await reloaded.refreshCalendarState();

  assert.equal(
    afterReload.mode,
    "TAXI_IN"
  );
  assert.equal(
    afterReload.state.flight.progress,
    100
  );

  const layoverNow =
    realDate.now() + 46 * 60000;

  reloaded.Date = class extends realDate {
    constructor(value) {
      super(
        value === undefined
          ? layoverNow
          : value
      );
    }

    static now() {
      return layoverNow;
    }
  };

  const layover =
    await reloaded.refreshCalendarState();

  assert.equal(layover.mode, "TAXI_IN", "A clock jump without successful tracking checks cannot establish parking");
}

async function testAirborneLegStaysLockedDuringCalendarOverlap() {
  const { context } =
    createBrowserContext();

  const firstFlight =
    activeFlightEvent();

  firstFlight.id = "first-flight";
  firstFlight.origin = "DFW";
  firstFlight.destination = "AVL";
  firstFlight.flightNumber = "1429";
  firstFlight.liveLookupCandidates = [
    "AAL1429",
    "AA1429"
  ];
  firstFlight.times = {
    startUtc:
      new Date(
        Date.now() - 70 * 60000
      ).toISOString(),
    endUtc:
      new Date(
        Date.now() + 50 * 60000
      ).toISOString()
  };

  const nextFlight = {
    ...activeFlightEvent(),
    id: "next-flight",
    flightNumber: "3407",
    origin: "AVL",
    destination: "ORD",
    liveLookupCandidates: [
      "ENY3407",
      "MQ3407"
    ],
    times: {
      startUtc:
        new Date(
          Date.now() - 10 * 60000
        ).toISOString(),
      endUtc:
        new Date(
          Date.now() + 110 * 60000
        ).toISOString()
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot(event) {
      return {
        provider: "flightradar24",
        providerFlightId:
          "locked-airborne-leg",
        retrievedAt:
          new Date().toISOString(),
        displayIdent:
          event.id === "first-flight"
            ? "AA1429"
            : "MQ3407",
        phase: "EN_ROUTE",
        status: "En Route",
        origin: event.origin,
        destination:
          event.destination,
        progressPercent: 60,
        position: {
          latitude: 35.5,
          longitude: -84,
          altitudeFeet: 24000,
          groundSpeedKnots: 420,
          headingDegrees: 95,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  let includeNextFlight = false;
  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: includeNextFlight
          ? [firstFlight, nextFlight]
          : [firstFlight]
      };
    }
  };

  await context.refreshCalendarState();
  const airborne =
    await context.refreshLiveFlightState();

  assert.equal(
    airborne.event.id,
    "first-flight"
  );

  firstFlight.times.endUtc =
    new Date(
      Date.now() - 20 * 60000
    ).toISOString();

  includeNextFlight = true;

  const locked =
    await context.refreshCalendarState();

  assert.equal(
    locked.event.id,
    "first-flight"
  );
  assert.equal(
    locked.state.flight.number,
    "AA 1429"
  );
  assert.equal(locked.mode, "EN_ROUTE");
}

async function testPreflightFiledRoutePublishesWithoutLiveMatch() {
  const { context } =
    createBrowserContext();
  const flight = activeFlightEvent();
  const filedRoute = {
    provider: "flightaware",
    routeText: "ORD BDF AVL",
    fixes: [
      {
        name: "BDF",
        latitude: 41.1,
        longitude: -89.6
      }
    ]
  };

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [flight]
      };
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot() {
      return {
        routeOnly: true,
        provider: "flightaware",
        retrievedAt:
          new Date().toISOString(),
        origin: flight.origin,
        destination:
          flight.destination,
        filedRoute
      };
    }
  };

  await context.refreshCalendarState();
  const resolved =
    await context.refreshLiveFlightState();

  assert.deepEqual(
    resolved.state.flight.filedRoute,
    filedRoute
  );
  assert.notEqual(
    resolved.state.liveData,
    true,
    "A route-only response must not masquerade as live position data."
  );
}

async function testStaleLandingHandsOffToStartedNextLeg() {
  const storage = createMemoryStorage();
  const { context } = createBrowserContext({
    localStorage: storage
  });

  const realDate = Date;
  const initialNow = realDate.now();

  const firstFlight = {
    ...activeFlightEvent(),
    id: "landing-flight",
    origin: "TVC",
    destination: "DCA",
    times: {
      startUtc: new realDate(
        initialNow - 90 * 60000
      ).toISOString(),
      endUtc: new realDate(
        initialNow + 5 * 60000
      ).toISOString()
    }
  };

  const nextFlight = {
    ...activeFlightEvent(),
    id: "next-started-flight",
    origin: "DCA",
    destination: "HSV",
    flightNumber: "4321",
    times: {
      startUtc: new realDate(
        initialNow + 10 * 60000
      ).toISOString(),
      endUtc: new realDate(
        initialNow + 120 * 60000
      ).toISOString()
    }
  };

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new realDate().toISOString(),
        events: [firstFlight, nextFlight]
      };
    }
  };

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot(event) {
      if (event.id !== firstFlight.id) {
        return null;
      }

      return {
        provider: "flightradar24",
        retrievedAt:
          new realDate(initialNow)
            .toISOString(),
        displayIdent: "MQ4140",
        phase: "LANDING",
        origin: "TVC",
        destination: "DCA",
        progressPercent: 98,
        position: {
          latitude: 38.86,
          longitude: -77.04,
          altitudeFeet: 900,
          altitudeTrend: "D",
          groundSpeedKnots: 135,
          headingDegrees: 180,
          recordedAt:
            new realDate(initialNow)
              .toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();
  const landing =
    await context.refreshLiveFlightState();

  assert.equal(landing.mode, "LANDING");

  const laterNow =
    initialNow + 40 * 60000;

  context.Date = class extends realDate {
    constructor(value) {
      super(
        value === undefined
          ? laterNow
          : value
      );
    }

    static now() {
      return laterNow;
    }
  };

  const handedOff =
    await context.refreshCalendarState();

  assert.equal(
    handedOff.event.id,
    "next-started-flight"
  );
  assert.notEqual(handedOff.mode, "LANDING");
}

async function testEditedLockedEventStartsFreshProviderMatch() {
  const { context } =
    createBrowserContext();

  const event = activeFlightEvent();
  event.id = "editable-flight";
  event.origin = "PHX";
  event.destination = "TUL";
  event.flightNumber = "4334";
  event.liveLookupCandidates = [
    "ENY4334",
    "MQ4334"
  ];

  context.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return {
        retrievedAt:
          new Date().toISOString(),
        events: [event]
      };
    }
  };

  const calls = [];

  context.dadRadarLiveFlightApi = {
    async getFlightSnapshot(
      requestedEvent,
      options
    ) {
      calls.push({
        destination:
          requestedEvent.destination,
        providerFlightId:
          options.providerFlightId
      });

      return {
        provider: "flightradar24",
        providerFlightId:
          requestedEvent.destination === "TUL"
            ? "old-provider-flight"
            : "new-provider-flight",
        retrievedAt:
          new Date().toISOString(),
        displayIdent: "MQ4334",
        phase: "EN_ROUTE",
        status: "En Route",
        origin: requestedEvent.origin,
        destination:
          requestedEvent.destination,
        progressPercent: 40,
        position: {
          latitude:
            requestedEvent.destination === "TUL"
              ? 34.9
              : 34.6,
          longitude:
            requestedEvent.destination === "TUL"
              ? -109.5
              : -108.8,
          altitudeFeet: 26000,
          groundSpeedKnots: 410,
          headingDegrees: 85,
          recordedAt:
            new Date().toISOString()
        }
      };
    }
  };

  await context.refreshCalendarState();
  const firstLive =
    await context.refreshLiveFlightState();

  assert.equal(
    firstLive.state.flight.destination,
    "TUL"
  );
  assert.equal(
    firstLive.state.flight.actualTrack.length,
    1
  );

  event.destination = "CLT";
  event.liveLookupCandidates = [
    "ENY4334",
    "MQ4334"
  ];

  const reassignedCalendar =
    await context.refreshCalendarState();

  assert.equal(
    reassignedCalendar.event.id,
    "editable-flight",
    "The Calendar lock should keep the edited Google event selected."
  );
  assert.equal(
    reassignedCalendar.state.flight.destination,
    "CLT"
  );
  assert.equal(
    reassignedCalendar.state.source,
    "calendar",
    "Editing the locked leg must discard the stale live-provider match immediately."
  );

  const reassignedLive =
    await context.refreshLiveFlightState();

  assert.equal(
    calls[0].providerFlightId,
    null
  );
  assert.equal(
    calls[1].destination,
    "CLT"
  );
  assert.equal(
    calls[1].providerFlightId,
    null,
    "A route edit on the same Google event must force a fresh FR24 acquisition."
  );
  assert.equal(
    reassignedLive.state.flight.actualTrack.length,
    1,
    "The old leg breadcrumb must not leak into the reassigned leg."
  );
}

async function testArrivalWithoutGroundCoverage() {
  const storage = createMemoryStorage();
  let {context} = createBrowserContext({localStorage: storage});
  let clock = Date.now();
  const started = clock;
  const airport = airportCatalog.lookupAirport("MSN");
  const flight = {...activeFlightEvent(), destination: "MSN"};
  flight.times.endUtc = new Date(clock + 120000).toISOString();
  let reply = "final";
  let recordedAt = clock;
  const requests = [];
  function configure() {
    context.Date = class extends Date {
      constructor(...args) {super(...(args.length ? args : [clock]));}
      static now() {return clock;}
    };
    context.dadRadarCalendarApi = {getUpcomingEvents: async () => ({events: [flight], retrievedAt: new Date(clock).toISOString()})};
    context.dadRadarLiveFlightApi = {getFlightSnapshot: async (_event, options) => {
      requests.push(options);
      if (reply === "error") throw new Error("Provider rate limited");
      if (reply === "missing") return null;
      const climb = reply === "climb";
      const ground = reply === "ground";
      return {provider: "adsb.lol", phase: climb ? "EN_ROUTE" : ground ? "ARRIVED" : "APPROACH",
        origin: "ORD", destination: "MSN", progressPercent: 99, retrievedAt: new Date(clock).toISOString(),
        position: {latitude: airport.latitude, longitude: airport.longitude,
          altitudeFeet: airport.elevationFeet + (climb ? 2500 : ground ? 0 : 800), onGround: ground,
          groundSpeedKnots: ground ? 0 : 140, altitudeTrend: climb ? "C" : "D",
          verticalSpeedFeetPerMinute: climb ? 1400 : -600, updateType: "adsb_icao",
          recordedAt: new Date(recordedAt).toISOString()}};
    }};
  }
  configure();
  await context.refreshCalendarState();
  assert.equal((await context.refreshLiveFlightState()).mode, "LANDING");
  reply = "missing";
  clock += 91000;
  await context.refreshLiveFlightState();
  for (let i = 0; i < 9; i++) {
    clock += 60000;
    assert.equal((await context.refreshLiveFlightState()).mode, "LANDING");
  }
  clock += 20 * 60000; // Closed/suspended time must not count as successful tracking checks.
  ({context} = createBrowserContext({localStorage: storage}));
  configure();
  assert.equal((await context.refreshCalendarState()).mode, "LANDING");
  assert.equal((await context.refreshLiveFlightState()).mode, "LANDING");
  reply = "error";
  clock += 60000;
  assert.equal((await context.refreshLiveFlightState()).mode, "LANDING", "Errors cannot finish the arrival estimate");
  reply = "missing";
  await context.refreshLiveFlightState();
  for (let i = 0; i < 9; i++) {
    clock += 60000;
    assert.equal((await context.refreshLiveFlightState()).mode, "LANDING", "Clock-only completion must not bypass outage recovery");
  }
  clock += 60000;
  const estimated = await context.refreshLiveFlightState();
  assert.equal(estimated.mode, "ARRIVED");
  assert.equal(estimated.state.flight.arrivalEstimated, true);
  assert.equal(estimated.state.liveData, false);
  assert.equal(estimated.state.flight.lastPositionAt, new Date(started).toISOString());
  assert.equal(estimated.state.flight.groundSpeed, null);
  assert.match(estimated.state.dailySchedule.context, /IS ESTIMATED/);
  assert(requests.slice(1).every(request => request.surfaceOnly), "Coverage follow-up uses ADS-B only");
  assert.equal(storage.getItem("dad-radar.confirmed-arrivals.v1"), null, "An estimate is not stored as a confirmed arrival");

  // An installed mobile app can reopen without upgrading the estimate to confirmation.
  ({context} = createBrowserContext({localStorage: storage}));
  configure();
  const reopened = await context.refreshCalendarState();
  assert.equal(reopened.mode, "ARRIVED");
  assert.equal(reopened.state.flight.arrivalEstimated, true);
  await context.refreshLiveFlightState(); // Finish the lookup started by calendar refresh.
  const count = requests.length;
  await context.refreshLiveFlightState();
  assert.equal(requests.length, count + 1, "Estimated arrivals continue checking for a later report");

  reply = "climb";
  recordedAt = clock += 60000;
  const recovered = await context.refreshLiveFlightState();
  assert.equal(recovered.mode, "EN_ROUTE", "A later go-around report supersedes estimated arrival");
  assert.notEqual(recovered.state.flight.arrivalEstimated, true);
  assert.equal(JSON.parse(storage.getItem("dad-radar.taxi-in.v1")).landingCandidate, false, "Recovered tracking clears arrival candidacy while preserving flight continuity");
  reply = "missing";
  for (let i = 0; i < 12; i++) {
    clock += 60000;
    assert.notEqual((await context.refreshLiveFlightState())?.state?.flight?.arrivalEstimated, true);
  }
  reply = "ground";
  recordedAt = clock;
  assert.equal((await context.refreshLiveFlightState()).mode, "TAXI_IN");
}

async function runTests() {
  await testArrivalWithoutGroundCoverage();
  await testCalendarPublishesState();
  await testExpiredCalendarShowsAuthorizationState();
  await testLiveFlightRefinesCalendarState();
  await testTaxiOutDoesNotRegressToCalendarDelay();
  await testLiveFailureRetainsCalendarState();
  await testApproachPersistsAcrossProviderRegression();
  await testPollingContinuesAfterTouchdown();
  await testAdsbGroundArrivalContinuesWithoutPaidFallback();
  await testAdsbGroundArrivalContinuesWithoutPaidFallback("flightradar24");
  await testAdsbGroundArrivalContinuesWithoutPaidFallback("adsb.lol", true);
  await testConfirmedArrivalDoesNotRewindToDeparture();
  await testPreflightFiledRoutePublishesWithoutLiveMatch();
  await testAirborneLegStaysLockedDuringCalendarOverlap();
  await testStaleLandingHandsOffToStartedNextLeg();
  await testEditedLockedEventStartsFreshProviderMatch();

  console.log(
    "Calendar state controller tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
