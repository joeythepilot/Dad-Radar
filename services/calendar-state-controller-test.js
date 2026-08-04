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

async function runTests() {
  await testCalendarPublishesState();

  console.log(
    "Calendar state controller tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
