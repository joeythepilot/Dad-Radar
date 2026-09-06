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

async function testPollingStopsAfterArrival() {
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

  assert.equal(arrived.mode, "ARRIVED");
  assert.equal(requestCount, 1);

  const nextRefresh =
    await context
      .refreshLiveFlightState();

  assert.equal(nextRefresh, null);
  assert.equal(
    requestCount,
    1,
    "FR24 polling should stop after Arrived is confirmed."
  );
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

  assert.equal(arrived.mode, "ARRIVED");
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

  assert.equal(retained.mode, "ARRIVED");
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

  reloaded.dadRadarCalendarApi = {
    async getUpcomingEvents() {
      return schedule;
    }
  };

  const afterReload =
    await reloaded.refreshCalendarState();

  assert.equal(
    afterReload.mode,
    "ARRIVED"
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

  assert.equal(layover.mode, "LAYOVER");
  assert.equal(
    layover.state.locationAirport,
    "HPN"
  );
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

async function runTests() {
  await testCalendarPublishesState();
  await testExpiredCalendarShowsAuthorizationState();
  await testLiveFlightRefinesCalendarState();
  await testTaxiOutDoesNotRegressToCalendarDelay();
  await testLiveFailureRetainsCalendarState();
  await testApproachPersistsAcrossProviderRegression();
  await testPollingStopsAfterArrival();
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
