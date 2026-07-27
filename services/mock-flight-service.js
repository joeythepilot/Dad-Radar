let mockFlightTimerId = null;

function broadcastMockFlightState() {
  window.dispatchEvent(
    new CustomEvent("dad-radar:state-change", {
      detail: {
        mode: activeMode,
        state: dadRadarState
      }
    })
  );
}

function startMockFlightService() {
  stopMockFlightService();

  setDadRadarMode("EN_ROUTE");

  mockFlightTimerId = window.setInterval(() => {
    if (!dadRadarState.flight) {
      return;
    }

    if (activeMode === "EN_ROUTE") {
      const progress = Math.min(
        dadRadarState.flight.progress + 1,
        100
      );

      const altitude = Math.max(
        dadRadarState.flight.altitude - 1000,
        8500
      );

      dadRadarState = {
        ...dadRadarState,

        flight: {
          ...dadRadarState.flight,
          airspeed: Math.max(
            dadRadarState.flight.airspeed - 3,
            210
          ),
          heading:
            (dadRadarState.flight.heading + 1) % 360,
          altitude,
          progress
        }
      };

      if (progress >= 88 || altitude <= 10000) {
        setDadRadarMode("APPROACH");
        return;
      }

      broadcastMockFlightState();
      return;
    }

    if (activeMode === "APPROACH") {
      const progress = Math.min(
        dadRadarState.flight.progress + 1,
        100
      );

      const altitude = Math.max(
        dadRadarState.flight.altitude - 800,
        2165
      );

      dadRadarState = {
        ...dadRadarState,

        flight: {
          ...dadRadarState.flight,
          airspeed: Math.max(
            dadRadarState.flight.airspeed - 8,
            140
          ),
          altitude,
          progress
        }
      };

      if (progress >= 100) {
        setDadRadarMode("ARRIVED");
        stopMockFlightService();
        return;
      }

      broadcastMockFlightState();
    }
  }, 1000);
}

function stopMockFlightService() {
  if (mockFlightTimerId === null) {
    return;
  }

  window.clearInterval(mockFlightTimerId);
  mockFlightTimerId = null;
}