(function initializeVisualStateController(global) {
  "use strict";

  const DEFAULT_INTERPOLATION_MS =
    52 * 1000;

  const MOTION_FIELDS = Object.freeze([
    "airspeed",
    "groundSpeed",
    "heading",
    "altitude",
    "progress",
    "latitude",
    "longitude"
  ]);

  let visualState =
    typeof dadRadarState !== "undefined"
      ? dadRadarState
      : null;

  let animationFrameId = null;
  let activeTargetKey = null;
  let visualMode = null;

  function finiteNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(
      Math.max(value, minimum),
      maximum
    );
  }

  function linearValue(from, to, progress) {
    return from + (to - from) * progress;
  }

  function headingValue(from, to, progress) {
    const change =
      (
        to - from + 540
      ) % 360 - 180;

    return (
      from + change * progress + 360
    ) % 360;
  }

  function interpolateFlight(
    fromFlight,
    toFlight,
    progress
  ) {
    const flight = {
      ...toFlight
    };

    MOTION_FIELDS.forEach((field) => {
      const from = finiteNumber(
        fromFlight?.[field]
      );

      const to = finiteNumber(
        toFlight?.[field]
      );

      if (from === null || to === null) {
        return;
      }

      flight[field] =
        field === "heading"
          ? headingValue(
              from,
              to,
              progress
            )
          : linearValue(
              from,
              to,
              progress
            );
    });

    return flight;
  }

  function interpolateState(
    fromState,
    toState,
    progress
  ) {
    return {
      ...toState,
      visualInterpolation:
        progress < 1,
      flight: interpolateFlight(
        fromState.flight,
        toState.flight,
        progress
      )
    };
  }

  function motionKey(state) {
    const flight = state?.flight;

    if (!state?.liveData || !flight) {
      return null;
    }

    return [
      state.eventId ?? "",
      flight.calendarLegKey ?? JSON.stringify([
        flight.number ?? null, flight.origin ?? null, flight.destination ?? null
      ]),
      flight.lastPositionAt ?? "",
      flight.latitude ?? "",
      flight.longitude ?? "",
      flight.altitude ?? "",
      flight.heading ?? ""
    ].join("|");
  }

  function sameFlight(fromState, toState) {
    if (!fromState?.flight || !toState?.flight) {
      return false;
    }

    if (fromState.eventId && toState.eventId &&
        fromState.eventId !== toState.eventId) return false;

    const fromKey = fromState.flight.calendarLegKey;
    const toKey = toState.flight.calendarLegKey;
    if (fromKey || toKey) return Boolean(fromKey && fromKey === toKey);

    // Older/test states lack a schedule key; an event ID alone is insufficient.
    return fromState.flight.number === toState.flight.number &&
      fromState.flight.origin === toState.flight.origin &&
      fromState.flight.destination === toState.flight.destination;
  }

  function hasInterpolatableMotion(
    fromFlight,
    toFlight
  ) {
    return MOTION_FIELDS.some((field) =>
      finiteNumber(fromFlight?.[field]) !==
        null &&
      finiteNumber(toFlight?.[field]) !==
        null &&
      finiteNumber(fromFlight?.[field]) !==
        finiteNumber(toFlight?.[field])
    );
  }

  function prefersReducedMotion() {
    return Boolean(
      global.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches
    );
  }

  function requestFrame(callback) {
    if (global.requestAnimationFrame) {
      return global.requestAnimationFrame(
        callback
      );
    }

    return global.setTimeout(
      () => callback(Date.now()),
      16
    );
  }

  function cancelFrame() {
    if (animationFrameId === null) {
      return;
    }

    if (global.cancelAnimationFrame) {
      global.cancelAnimationFrame(
        animationFrameId
      );
    } else {
      global.clearTimeout(
        animationFrameId
      );
    }

    animationFrameId = null;
  }

  function publishVisualState(
    state,
    mode,
    telemetryOnly = false
  ) {
    visualState = state;
    visualMode = mode;
    global.dadRadarVisualState = state;

    global.dispatchEvent(
      new CustomEvent(
        "dad-radar:visual-state-change",
        {
          detail: {
            mode,
            state,
            telemetryOnly
          }
        }
      )
    );
  }

  function holdCurrentMotion(
    nextState
  ) {
    const heldFlight = {
      ...nextState.flight
    };

    MOTION_FIELDS.forEach((field) => {
      if (
        visualState?.flight?.[field] !==
          undefined
      ) {
        heldFlight[field] =
          visualState.flight[field];
      }
    });

    return {
      ...nextState,
      visualInterpolation:
        animationFrameId !== null,
      flight: heldFlight
    };
  }

  function preserveLiveMotion(
    nextState
  ) {
    const preserved =
      holdCurrentMotion(nextState);

    return {
      ...preserved,
      liveData: true,
      livePhase:
        visualState.livePhase ??
        preserved.livePhase,
      source:
        visualState.source ??
        preserved.source,
      flight: {
        ...preserved.flight,
        lastPositionAt:
          visualState.flight
            ?.lastPositionAt ??
          preserved.flight
            ?.lastPositionAt,
        actualTrack:
          visualState.flight
            ?.actualTrack ??
          preserved.flight
            ?.actualTrack,
        filedRoute:
          visualState.flight
            ?.filedRoute ??
          preserved.flight
            ?.filedRoute
      }
    };
  }

  function animateToState(
    nextState,
    mode
  ) {
    const fromState = visualState;

    const duration = clamp(
      finiteNumber(
        nextState.visualTransitionMs
      ) ?? DEFAULT_INTERPOLATION_MS,
      0,
      55 * 1000
    );

    cancelFrame();

    if (
      duration === 0 ||
      prefersReducedMotion() ||
      !fromState?.liveData ||
      !nextState.liveData ||
      !sameFlight(fromState, nextState) ||
      !hasInterpolatableMotion(
        fromState.flight,
        nextState.flight
      )
    ) {
      publishVisualState(
        nextState,
        mode
      );
      return;
    }

    publishVisualState(
      interpolateState(
        fromState,
        nextState,
        0
      ),
      mode
    );

    let startedAt = null;

    const renderFrame = (timestamp) => {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const progress = clamp(
        (
          timestamp - startedAt
        ) / duration,
        0,
        1
      );

      const sample = interpolateState(fromState, nextState, progress);
      // Calendar/brand metadata may change while this motion sample is in flight.
      // Retain its numeric target/timeline while rendering the latest metadata.
      const frameState = {
        ...visualState,
        visualInterpolation: sample.visualInterpolation,
        flight: {...visualState.flight}
      };
      MOTION_FIELDS.forEach(field => {frameState.flight[field] = sample.flight[field];});
      publishVisualState(frameState, visualMode ?? mode, true);

      if (progress < 1) {
        animationFrameId =
          requestFrame(renderFrame);
      } else {
        animationFrameId = null;
      }
    };

    animationFrameId =
      requestFrame(renderFrame);
  }

  function handleStateChange(event) {
    const nextState =
      event.detail?.state;

    const mode =
      event.detail?.mode ?? "CUSTOM";

    if (!nextState) {
      return;
    }

    if (
      visualState?.liveData &&
      !nextState.liveData &&
      sameFlight(
        visualState,
        nextState
      )
    ) {
      publishVisualState(
        preserveLiveMotion(nextState),
        mode
      );
      return;
    }

    const nextTargetKey =
      motionKey(nextState);

    if (
      nextTargetKey &&
      nextTargetKey === activeTargetKey
    ) {
      publishVisualState(
        holdCurrentMotion(nextState),
        mode
      );
      return;
    }

    activeTargetKey = nextTargetKey;

    animateToState(
      nextState,
      mode
    );
  }

  global.dadRadarVisualState =
    visualState;

  global.addEventListener(
    "dad-radar:state-change",
    handleStateChange
  );
})(window);
