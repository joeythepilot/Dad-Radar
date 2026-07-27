let mockFlightTimerId = null;

function startMockFlightService() {
  stopMockFlightService();

  setDadRadarMode("EN_ROUTE");

  mockFlightTimerId = window.setInterval(() => {
    if (activeMode !== "EN_ROUTE" || !dadRadarState.flight) {
      return;
    }

    dadRadarState = {
      ...dadRadarState,

      flight: {
        ...dadRadarState.flight,

        airspeed: Math.max(
          dadRadarState.flight.airspeed - 1,
          180
        ),

        heading:
          (dadRadarState.flight.heading + 1) % 360,

        altitude: Math.max(
          dadRadarState.flight.altitude - 150,
          0
        ),

        progress: Math.min(
          dadRadarState.flight.progress + 1,
          100
        )
      }
    };

    window.dispatchEvent(
      new CustomEvent("dad-radar:state-change", {
        detail: {
          mode: activeMode,
          state: dadRadarState
        }
      })
    );
  }, 1000);
}

function stopMockFlightService() {
  if (mockFlightTimerId === null) {
    return;
  }

  window.clearInterval(mockFlightTimerId);
  mockFlightTimerId = null;
}