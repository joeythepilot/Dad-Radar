const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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

function createBrowserContext() {
  const dispatchedEvents = [];
  let nextTimerId = 1;

  const context = {
    console,
    CustomEvent: TestCustomEvent,
    Date,
    Intl,
    Promise,
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
    "DAD IS ON LAYOVER IN AVP"
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
        provider: "flightaware",
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
    "flightaware"
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

  const syncEvent =
    dispatchedEvents.find(
      (event) =>
        event.type ===
        "dad-radar:live-flight-sync"
    );

  assert.ok(syncEvent);
  assert.equal(syncEvent.detail.ok, true);
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
        "FlightAware unavailable"
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
    "EN_ROUTE"
  );
  assert.equal(result.mode, "EN_ROUTE");
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

async function runTests() {
  await testCalendarPublishesState();
  await testLiveFlightRefinesCalendarState();
  await testLiveFailureRetainsCalendarState();

  console.log(
    "Calendar state controller tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
