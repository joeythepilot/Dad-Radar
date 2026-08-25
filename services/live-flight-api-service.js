(function initializeLiveFlightApi(global) {
  "use strict";

  const REQUEST_TIMEOUT_MS = 10000;

  async function getFlightSnapshot(
    event,
    providedOptions = {}
  ) {
    if (!event) {
      throw new TypeError(
        "A Calendar flight event is required."
      );
    }

    const controller =
      typeof global.AbortController ===
        "function"
        ? new global.AbortController()
        : null;

    const timeoutId = controller
      ? global.setTimeout(
          () => controller.abort(),
          providedOptions
            .requestTimeoutMs ??
            REQUEST_TIMEOUT_MS
        )
      : null;

    const body = {
      liveLookupCandidates:
        event.liveLookupCandidates ?? [],
      origin: event.origin ?? null,
      destination:
        event.destination ?? null,
      startUtc:
        event.times?.startUtc ??
        event.startUtc ?? null,
      providerFlightId:
        providedOptions
          .providerFlightId ?? null,
      provider:
        providedOptions.provider ?? null
    };

    try {
      const response = await global.fetch(
        "/api/flights/lookup",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(body),
          signal: controller?.signal
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }

      if (!response.ok || data?.ok === false) {
        const requestError = new Error(
          data?.error ??
          `Live flight request failed with status ${response.status}.`
        );

        requestError.status =
          response.status;

        if (response.status === 503) {
          requestError.code =
            "not-configured";
        }

        throw requestError;
      }

      if (data?.liveFlight) {
        return data.liveFlight;
      }

      if (data?.filedRoute) {
        return {
          routeOnly: true,
          provider: "flightaware",
          retrievedAt:
            data.retrievedAt ??
            new Date().toISOString(),
          origin: body.origin,
          destination:
            body.destination,
          filedRoute: data.filedRoute
        };
      }

      return null;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(
          "The live flight request timed out."
        );

        timeoutError.code = "timeout";
        throw timeoutError;
      }

      throw error;
    } finally {
      if (timeoutId !== null) {
        global.clearTimeout(timeoutId);
      }
    }
  }

  global.dadRadarLiveFlightApi =
    Object.freeze({
      getFlightSnapshot
    });
})(window);
