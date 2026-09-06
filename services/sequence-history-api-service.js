(function initializeSequenceHistoryApi(global) {
  "use strict";

  async function requestJson(
    url,
    options = {}
  ) {
    const response = await fetch(
      url,
      {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body
            ? {
                "Content-Type":
                  "application/json"
              }
            : {}),
          ...(options.headers ?? {})
        }
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      const error = new Error(
        data?.error ??
        `Dad Radar sequence history returned status ${response.status}.`
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function getCurrent() {
    const data = await requestJson(
      "/api/sequence-history/current"
    );

    return data.sequenceHistory ?? null;
  }

  async function registerWorkFlight(event) {
    if (!event) {
      return getCurrent();
    }

    const data = await requestJson(
      "/api/sequence-history/register",
      {
        method: "POST",
        body: JSON.stringify({ event })
      }
    );

    return data.sequenceHistory ?? null;
  }

  async function recordLiveSnapshot(
    event,
    liveFlight
  ) {
    if (!event || !liveFlight) {
      return getCurrent();
    }

    const data = await requestJson(
      "/api/sequence-history/record",
      {
        method: "POST",
        body: JSON.stringify({
          event,
          liveFlight
        })
      }
    );

    return data.sequenceHistory ?? null;
  }

  global.dadRadarSequenceHistoryApi =
    Object.freeze({
      getCurrent,
      recordLiveSnapshot,
      registerWorkFlight
    });
})(window);