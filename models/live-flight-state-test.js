const assert = require("node:assert/strict");

const {
  isLiveSnapshotFresh,
  reconcileScheduleWithLive
} = require("./live-flight-state");

const NOW = "2026-08-04T18:00:00.000Z";

function calendarResolved(
  mode = "EN_ROUTE",
  overrides = {}
) {
  const event = {
    id: "flight-1",
    kind: "flight",
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
        "2026-08-04T17:00:00.000Z",
      endUtc:
        "2026-08-04T19:00:00.000Z"
    },
    ...overrides.event
  };

  return {
    mode,
    state: {
      status:
        mode.replace(/_/g, " "),
      source: "calendar",
      eventId: event.id,
      flight: {
        number: "MQ 4140",
        carrierCode: "MQ",
        origin: "ORD",
        destination: "AVL",
        destinationCity: "ASHEVILLE",
        airspeed: null,
        heading: null,
        altitude: null,
        progress: 50,
        eta: "3:00 PM",
        timingSource: "calendar",
        positionSource:
          "schedule-estimate"
      }
    },
    event
  };
}

function liveSnapshot(overrides = {}) {
  return {
    provider: "flightradar24",
    retrievedAt: NOW,
    providerFlightId: "ENY4140-1",
    ident: "ENY4140",
    displayIdent: "MQ4140",
    phase: "EN_ROUTE",
    status: "En Route / On Time",
    cancelled: false,
    diverted: false,
    origin: "ORD",
    destination: "AVL",
    progressPercent: 68,
    actualTrack: [
      {
        latitude: 41.9,
        longitude: -87.9,
        recordedAt:
          "2026-08-04T17:10:00.000Z"
      },
      {
        latitude: 38.2,
        longitude: -84.6,
        recordedAt:
          "2026-08-04T17:59:30.000Z"
      }
    ],
    aircraft: {
      registration: "N123XY",
      type: "E75L"
    },
    departure: {
      delayMinutes: 7,
      terminal: "3",
      gate: "L10"
    },
    arrival: {
      best:
        "2026-08-04T18:42:00.000Z",
      delayMinutes: 4,
      terminal: null,
      gate: "B4"
    },
    position: {
      latitude: 38.2,
      longitude: -84.6,
      altitudeFeet: 27000,
      altitudeTrend: "D",
      groundSpeedKnots: 421,
      headingDegrees: 142,
      recordedAt:
        "2026-08-04T17:59:30.000Z"
    },
    ...overrides
  };
}

function testFreshLiveFlightWins() {
  const resolved =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot(),
      { now: NOW }
    );

  assert.equal(resolved.mode, "EN_ROUTE");
  assert.equal(
    resolved.state.source,
    "flightradar24"
  );
  assert.equal(
    resolved.state.status,
    "EN ROUTE"
  );
  assert.equal(
    resolved.state.flight.progress,
    68
  );
  assert.equal(
    resolved.state.flight.altitude,
    27000
  );
  assert.equal(
    resolved.state.flight.heading,
    142
  );
  assert.equal(
    resolved.state.flight.groundSpeed,
    421
  );
  assert.equal(
    resolved.state.flight.airspeed,
    null,
    "Groundspeed must not be presented as airspeed."
  );
  assert.equal(
    resolved.state.flight.eta,
    "2:42 PM"
  );
  assert.equal(
    resolved.state.flight.latitude,
    38.2
  );
  assert.equal(
    resolved.state.flight.arrivalGate,
    "B4"
  );
  assert.equal(
    resolved.state.flight.actualTrack
      .length,
    2
  );
}

function testLiveGsoDestinationCity() {
  const resolved =
    reconcileScheduleWithLive(
      calendarResolved(
        "EN_ROUTE",
        {
          event: {
            destination: "GSO"
          }
        }
      ),
      liveSnapshot({
        destination: "GSO"
      }),
      { now: NOW }
    );

  assert.equal(
    resolved.state.flight.destinationCity,
    "Greensboro"
  );
  assert.equal(
    resolved.state.flight.destinationLocation,
    "Greensboro, North Carolina"
  );
}

function testStaleLiveFlightFallsBack() {
  const calendar = calendarResolved();

  const resolved =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        retrievedAt:
          "2026-08-04T17:55:00.000Z"
      }),
      {
        now: NOW,
        staleAfterMs: 3 * 60 * 1000
      }
    );

  assert.equal(resolved, calendar);
  assert.equal(
    isLiveSnapshotFresh(
      liveSnapshot(),
      { now: NOW }
    ),
    true
  );
}

function testRouteMismatchFallsBack() {
  const calendar = calendarResolved();

  const resolved =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        destination: "TYS"
      }),
      { now: NOW }
    );

  assert.equal(resolved, calendar);
}

function testLivePhasesDriveModes() {
  const approach =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  assert.equal(
    approach.mode,
    "APPROACH"
  );

  const diverted =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "DIVERTED",
        diverted: true
      }),
      { now: NOW }
    );

  assert.equal(
    diverted.mode,
    "DIVERTED"
  );

  const cancelled =
    reconcileScheduleWithLive(
      calendarResolved("BOARDING"),
      liveSnapshot({
        phase: "CANCELLED",
        cancelled: true
      }),
      { now: NOW }
    );

  assert.equal(
    cancelled.mode,
    "BOARDING"
  );
  assert.equal(
    cancelled.state.status,
    "CANCELLED"
  );
}

function testDelayPersistsUntilAirborne() {
  const delayedCalendar =
    calendarResolved("DELAYED");

  delayedCalendar.state.flight
    .departureDelayMinutes = 15;

  const taxiing =
    reconcileScheduleWithLive(
      delayedCalendar,
      liveSnapshot({
        phase: "TAXI_OUT",
        departure: {
          delayMinutes: null
        },
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 680,
          groundSpeedKnots: 18
        }
      }),
      { now: NOW }
    );

  assert.equal(taxiing.mode, "DELAYED");
  assert.equal(
    taxiing.state.status,
    "DELAYED"
  );
  assert.equal(
    taxiing.state.flight
      .departureDelayMinutes,
    15
  );

  const airborne =
    reconcileScheduleWithLive(
      calendarResolved("DELAYED"),
      liveSnapshot({
        phase: "EN_ROUTE"
      }),
      { now: NOW }
    );

  assert.equal(airborne.mode, "EN_ROUTE");
  assert.equal(
    airborne.state.status,
    "EN ROUTE"
  );
}

function testConfirmedTaxiOutClampsCalendarDelay() {
  const boarding =
    calendarResolved("BOARDING");

  const confirmedTaxiOut =
    reconcileScheduleWithLive(
      boarding,
      liveSnapshot({
        phase: "TAXI_OUT",
        departure: {
          delayMinutes: null
        },
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 680,
          groundSpeedKnots: 18
        }
      }),
      { now: NOW }
    );

  assert.equal(
    confirmedTaxiOut.mode,
    "TAXI_OUT"
  );

  const calendarDelay =
    calendarResolved("DELAYED");

  calendarDelay.state.flight
    .departureDelayMinutes = 6;

  const clamped =
    reconcileScheduleWithLive(
      calendarDelay,
      liveSnapshot({
        phase: "TAXI_OUT",
        departure: {
          delayMinutes: null
        },
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 680,
          groundSpeedKnots: 20
        }
      }),
      {
        now: NOW,
        previousResolved:
          confirmedTaxiOut
      }
    );

  assert.equal(clamped.mode, "TAXI_OUT");
  assert.equal(
    clamped.state.status,
    "TAXI OUT"
  );
  assert.equal(
    clamped.state.flight
      .departureDelayMinutes,
    null
  );
}

function testTaxiOutClampSurvivesProviderRegression() {
  const confirmedTaxiOut =
    reconcileScheduleWithLive(
      calendarResolved("BOARDING"),
      liveSnapshot({
        phase: "TAXI_OUT"
      }),
      { now: NOW }
    );

  const regressed =
    reconcileScheduleWithLive(
      calendarResolved("DELAYED"),
      liveSnapshot({
        phase: "BOARDING"
      }),
      {
        now: NOW,
        previousResolved:
          confirmedTaxiOut
      }
    );

  assert.equal(regressed.mode, "TAXI_OUT");
  assert.equal(
    regressed.state.livePhase,
    "TAXI_OUT"
  );
}

function testTaxiOutClampSurvivesStaleSnapshot() {
  const confirmedTaxiOut =
    reconcileScheduleWithLive(
      calendarResolved("BOARDING"),
      liveSnapshot({
        phase: "TAXI_OUT"
      }),
      { now: NOW }
    );

  const stale =
    reconcileScheduleWithLive(
      calendarResolved("DELAYED"),
      liveSnapshot({
        phase: "TAXI_OUT",
        retrievedAt:
          "2026-08-04T17:55:00.000Z"
      }),
      {
        now: NOW,
        staleAfterMs:
          3 * 60 * 1000,
        previousResolved:
          confirmedTaxiOut
      }
    );

  assert.equal(stale.mode, "TAXI_OUT");
  assert.equal(
    stale.state.status,
    "TAXI OUT"
  );
  assert.equal(
    stale.state.liveData,
    false
  );
}

function testCancellationOverridesCalendarDelay() {
  const cancelled =
    reconcileScheduleWithLive(
      calendarResolved("DELAYED"),
      liveSnapshot({
        phase: "CANCELLED",
        cancelled: true
      }),
      { now: NOW }
    );

  assert.equal(
    cancelled.state.status,
    "CANCELLED"
  );
}

function testCommuteModeIsPreservedInFlight() {
  const commute =
    reconcileScheduleWithLive(
      calendarResolved(
        "COMMUTING_HOME",
        {
          event: { isCommute: true }
        }
      ),
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  assert.equal(
    commute.mode,
    "COMMUTING_HOME"
  );
  assert.equal(
    commute.state.status,
    "APPROACH"
  );
}

function testApproachDoesNotRegressAfterLevelOff() {
  const calendar = calendarResolved();

  const approach =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "APPROACH",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 7000,
          altitudeTrend: ""
        }
      }),
      { now: NOW }
    );

  const levelFlightRegression =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "EN_ROUTE",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 7000,
          altitudeTrend: ""
        }
      }),
      {
        now: NOW,
        previousResolved: approach
      }
    );

  assert.equal(
    levelFlightRegression.mode,
    "APPROACH"
  );
  assert.equal(
    levelFlightRegression.state.status,
    "APPROACH"
  );
  assert.equal(
    levelFlightRegression.state.livePhase,
    "APPROACH"
  );

  const finalDescentRegression =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "EN_ROUTE",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 5000,
          altitudeTrend: "D"
        }
      }),
      {
        now: NOW,
        previousResolved:
          levelFlightRegression
      }
    );

  assert.equal(
    finalDescentRegression.mode,
    "LANDING"
  );
  assert.equal(
    finalDescentRegression.state.status,
    "LANDING"
  );
  assert.equal(
    finalDescentRegression.state.livePhase,
    "LANDING"
  );
  assert.equal(
    finalDescentRegression.state.flight
      .altitudeAgl,
    2836.1
  );
}

function testLandingDoesNotTriggerOnDeparture() {
  const departure =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "EN_ROUTE",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 4000,
          altitudeTrend: "C"
        }
      }),
      { now: NOW }
    );

  assert.equal(
    departure.state.flight.altitudeAgl,
    1836.1
  );
  assert.equal(
    departure.mode,
    "EN_ROUTE",
    "Low altitude alone must not label a climbing departure as Landing."
  );
}

function testLandingReleasesForGoAround() {
  const calendar = calendarResolved();

  const landing =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "APPROACH",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 5000,
          altitudeTrend: "D"
        }
      }),
      { now: NOW }
    );

  assert.equal(landing.mode, "LANDING");

  const goAround =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "APPROACH",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 6000,
          altitudeTrend: "C"
        }
      }),
      {
        now: NOW,
        previousResolved: landing
      }
    );

  assert.equal(goAround.mode, "APPROACH");
  assert.equal(
    goAround.state.status,
    "APPROACH"
  );
}

function testApproachReleasesForSustainedGoAround() {
  const calendar = calendarResolved();

  const approach =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  const goAround =
    reconcileScheduleWithLive(
      calendar,
      liveSnapshot({
        phase: "EN_ROUTE",
        position: {
          ...liveSnapshot().position,
          altitudeFeet: 13000,
          altitudeTrend: "C"
        }
      }),
      {
        now: NOW,
        previousResolved: approach
      }
    );

  assert.equal(
    goAround.mode,
    "EN_ROUTE"
  );
  assert.equal(
    goAround.state.livePhase,
    "EN_ROUTE"
  );
}

function testApproachLatchDoesNotCrossFlights() {
  const approach =
    reconcileScheduleWithLive(
      calendarResolved(),
      liveSnapshot({
        phase: "APPROACH"
      }),
      { now: NOW }
    );

  const nextFlight =
    calendarResolved(
      "EN_ROUTE",
      {
        event: {
          id: "flight-2"
        }
      }
    );

  const resolved =
    reconcileScheduleWithLive(
      nextFlight,
      liveSnapshot({
        phase: "EN_ROUTE"
      }),
      {
        now: NOW,
        previousResolved: approach
      }
    );

  assert.equal(resolved.mode, "EN_ROUTE");
}

function runTests() {
  testFreshLiveFlightWins();
  testLiveGsoDestinationCity();
  testStaleLiveFlightFallsBack();
  testRouteMismatchFallsBack();
  testLivePhasesDriveModes();
  testDelayPersistsUntilAirborne();
  testConfirmedTaxiOutClampsCalendarDelay();
  testTaxiOutClampSurvivesProviderRegression();
  testTaxiOutClampSurvivesStaleSnapshot();
  testCancellationOverridesCalendarDelay();
  testCommuteModeIsPreservedInFlight();
  testApproachDoesNotRegressAfterLevelOff();
  testLandingDoesNotTriggerOnDeparture();
  testLandingReleasesForGoAround();
  testApproachReleasesForSustainedGoAround();
  testApproachLatchDoesNotCrossFlights();

  console.log(
    "Live flight state tests passed."
  );
}

runTests();
