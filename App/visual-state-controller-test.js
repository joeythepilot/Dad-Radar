const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(
    __dirname,
    "visual-state-controller.js"
  ),
  "utf8"
);

class TestCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function liveState(overrides = {}) {
  return {
    status: "EN ROUTE",
    source: "flightradar24",
    liveData: true,
    eventId: "flight-1",
    visualTransitionMs: 1000,
    flight: {
      number: "MQ 4140",
      origin: "ORD",
      destination: "AVL",
      groundSpeed: 420,
      heading: 350,
      altitude: 30000,
      progress: 50,
      latitude: 40,
      longitude: -84,
      lastPositionAt:
        "2026-08-04T18:00:00.000Z"
    },
    ...overrides
  };
}

function createHarness(
  initialState,
  reducedMotion = false
) {
  const listeners = {};
  const visualEvents = [];
  const frames = new Map();
  let nextFrameId = 1;

  const context = {
    console,
    CustomEvent: TestCustomEvent,
    Date,
    dadRadarState: initialState,
    matchMedia: () => ({
      matches: reducedMotion
    }),
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    addEventListener(type, handler) {
      listeners[type] ??= [];
      listeners[type].push(handler);
    },
    dispatchEvent(event) {
      if (
        event.type ===
        "dad-radar:visual-state-change"
      ) {
        visualEvents.push(event);
      }

      (listeners[event.type] ?? [])
        .forEach((handler) => {
          handler(event);
        });

      return true;
    }
  };

  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(
    SOURCE,
    context,
    {
      filename:
        "App/visual-state-controller.js"
    }
  );

  function dispatchState(state) {
    context.dispatchEvent(
      new TestCustomEvent(
        "dad-radar:state-change",
        {
          detail: {
            mode: state.status,
            state
          }
        }
      )
    );
  }

  function runNextFrame(timestamp) {
    const entry =
      frames.entries().next().value;

    assert.ok(
      entry,
      "Expected an animation frame."
    );

    const [id, callback] = entry;
    frames.delete(id);
    callback(timestamp);
  }

  return {
    context,
    dispatchState,
    frames,
    runNextFrame,
    visualEvents
  };
}

function targetState() {
  return liveState({
    status: "APPROACH",
    flight: {
      ...liveState().flight,
      groundSpeed: 260,
      heading: 10,
      altitude: 10000,
      progress: 70,
      latitude: 36,
      longitude: -82,
      lastPositionAt:
        "2026-08-04T18:01:00.000Z"
    }
  });
}

function testLiveMotionIsInterpolated() {
  const harness = createHarness(
    liveState()
  );

  harness.dispatchState(
    targetState()
  );

  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.status,
    "APPROACH",
    "The operational status should update immediately."
  );
  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.flight.altitude,
    30000
  );

  harness.runNextFrame(0);
  harness.runNextFrame(500);

  const midpoint =
    harness.visualEvents.at(-1)
      .detail;

  assert.equal(
    midpoint.telemetryOnly,
    true
  );
  assert.equal(
    midpoint.state.flight.altitude,
    20000
  );
  assert.equal(
    midpoint.state.flight.groundSpeed,
    340
  );
  assert.equal(
    midpoint.state.flight.heading,
    0
  );
  assert.equal(
    midpoint.state.flight.latitude,
    38
  );

  harness.runNextFrame(1000);

  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.flight.altitude,
    10000
  );
  assert.equal(
    harness.frames.size,
    0
  );
}

function testSameSnapshotDoesNotRestartMotion() {
  const harness = createHarness(
    liveState()
  );

  const target = targetState();

  harness.dispatchState(target);
  harness.runNextFrame(0);
  harness.runNextFrame(500);

  const frameCount =
    harness.frames.size;

  harness.dispatchState(target);

  assert.equal(
    harness.frames.size,
    frameCount
  );
  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.flight.altitude,
    20000
  );
}

function testReducedMotionUpdatesImmediately() {
  const harness = createHarness(
    liveState(),
    true
  );

  harness.dispatchState(
    targetState()
  );

  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.flight.altitude,
    10000
  );
  assert.equal(
    harness.frames.size,
    0
  );
}

function testCalendarRefreshPreservesLiveMotion() {
  const harness = createHarness(
    liveState()
  );

  harness.dispatchState({
    ...liveState(),
    source: "calendar",
    liveData: false,
    status: "EN ROUTE",
    flight: {
      ...liveState().flight,
      groundSpeed: null,
      heading: null,
      altitude: null,
      latitude: null,
      longitude: null,
      lastPositionAt: null
    }
  });

  const preserved =
    harness.visualEvents.at(-1)
      .detail.state;

  assert.equal(preserved.liveData, true);
  assert.equal(
    preserved.flight.altitude,
    30000,
    "A calendar refresh must not erase the live altitude."
  );
  assert.equal(
    preserved.flight.latitude,
    40,
    "A calendar refresh must not erase the live position."
  );

  harness.dispatchState(
    targetState()
  );

  assert.ok(
    harness.frames.size > 0,
    "The next live sample should still interpolate after a calendar refresh."
  );
  assert.equal(
    harness.visualEvents.at(-1)
      .detail.state.flight.altitude,
    30000
  );
}

function testFrameRateIsSafeForLegacyIpad() {
  assert.match(
    SOURCE,
    /VISUAL_FRAME_INTERVAL_MS\s*=\s*\n?\s*1000\s*\/\s*20/,
    "Live telemetry should use a smooth but legacy-iPad-safe frame rate."
  );
}

function runTests() {
  testLiveMotionIsInterpolated();
  testSameSnapshotDoesNotRestartMotion();
  testReducedMotionUpdatesImmediately();
  testCalendarRefreshPreservesLiveMotion();
  testFrameRateIsSafeForLegacyIpad();

  console.log(
    "Visual state controller tests passed."
  );
}

runTests();
