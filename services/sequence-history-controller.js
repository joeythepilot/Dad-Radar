(function initializeSequenceHistoryController(global) {
  "use strict";

  let currentHistory = null;
  let operationPromise = Promise.resolve();

  function publish(history) {
    currentHistory = history ?? null;
    global.dadRadarSequenceHistoryCurrent =
      currentHistory;

    global.dispatchEvent(
      new CustomEvent(
        "dad-radar:sequence-history-change",
        {
          detail: {
            sequenceHistory:
              currentHistory
          }
        }
      )
    );

    return currentHistory;
  }

  function enqueue(operation) {
    operationPromise = operationPromise
      .catch(() => null)
      .then(operation)
      .catch((error) => {
        console.warn(
          "Dad Radar sequence-history sync failed:",
          error
        );

        return currentHistory;
      });

    return operationPromise;
  }

  async function loadCurrent() {
    if (!global.dadRadarSequenceHistoryApi) {
      return publish(null);
    }

    const history =
      await global
        .dadRadarSequenceHistoryApi
        .getCurrent();

    return publish(history);
  }

  async function registerResolvedEvent(
    resolved
  ) {
    const event = resolved?.event;

    if (
      !global.dadRadarSequenceHistory
        ?.isWorkFlight?.(event)
    ) {
      return loadCurrent();
    }

    const history =
      await global
        .dadRadarSequenceHistoryApi
        .registerWorkFlight(event);

    return publish(history);
  }

  async function recordResolvedLiveFlight(
    detail
  ) {
    const event =
      detail?.resolved?.event;

    const liveFlight =
      detail?.liveFlight;

    if (
      !liveFlight ||
      !global.dadRadarSequenceHistory
        ?.isWorkFlight?.(event)
    ) {
      return currentHistory;
    }

    const history =
      await global
        .dadRadarSequenceHistoryApi
        .recordLiveSnapshot(
          event,
          liveFlight
        );

    return publish(history);
  }

  global.addEventListener(
    "dad-radar:calendar-sync",
    (event) => {
      if (!event.detail?.ok) {
        return;
      }

      enqueue(() =>
        registerResolvedEvent(
          event.detail.resolved
        )
      );
    }
  );

  global.addEventListener(
    "dad-radar:live-flight-sync",
    (event) => {
      if (!event.detail?.ok) {
        return;
      }

      enqueue(() =>
        recordResolvedLiveFlight(
          event.detail
        )
      );
    }
  );

  global.refreshSequenceHistory =
    () => enqueue(loadCurrent);

  enqueue(loadCurrent);
})(window);