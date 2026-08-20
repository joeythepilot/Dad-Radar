(function initializePosterImageLoader(
  root,
  factory
) {
  const api = factory(root);

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarPosterImages =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createPosterImageLoaderApi(root) {
    "use strict";

    const DEFAULT_RETRY_DELAYS_MS =
      Object.freeze([1200, 4000]);

    const DEFAULT_ATTEMPT_TIMEOUT_MS =
      8000;

    function appendQuery(
      source,
      name,
      value
    ) {
      const separator = String(source)
        .includes("?")
        ? "&"
        : "?";

      return `${source}${separator}${encodeURIComponent(
        name
      )}=${encodeURIComponent(value)}`;
    }

    function posterAssetUrl(
      source,
      options = {}
    ) {
      const version = String(
        options.version ??
          "destination-poster-1"
      );

      let url = appendQuery(
        source,
        "v",
        version
      );

      const attempt = Number(
        options.attempt ?? 0
      );

      if (attempt > 0) {
        url = appendQuery(
          url,
          "retry",
          `${options.nonce ?? Date.now()}-${attempt}`
        );
      }

      return url;
    }

    function createPosterImageLoader(
      providedOptions = {}
    ) {
      const retryDelaysMs =
        Array.isArray(
          providedOptions.retryDelaysMs
        )
          ? providedOptions.retryDelaysMs
              .slice()
          : DEFAULT_RETRY_DELAYS_MS
              .slice();

      const createImage =
        providedOptions.createImage ??
        (() => new root.Image());

      const setTimer =
        providedOptions.setTimer ??
        ((callback, delay) =>
          root.setTimeout(
            callback,
            delay
          ));

      const clearTimer =
        providedOptions.clearTimer ??
        ((timerId) =>
          root.clearTimeout(timerId));

      const nonce =
        providedOptions.nonce ??
        (() => Date.now());

      const version = String(
        providedOptions.version ??
          "destination-poster-1"
      );

      const attemptTimeoutMs = Math.max(
        0,
        Number(
          providedOptions.attemptTimeoutMs ??
            DEFAULT_ATTEMPT_TIMEOUT_MS
        ) || 0
      );

      let generation = 0;
      let retryTimerId = null;
      let attemptTimerId = null;

      function cancel() {
        generation += 1;

        if (retryTimerId !== null) {
          clearTimer(retryTimerId);
          retryTimerId = null;
        }

        if (attemptTimerId !== null) {
          clearTimer(attemptTimerId);
          attemptTimerId = null;
        }
      }

      function load(
        source,
        callbacks = {}
      ) {
        cancel();

        const requestGeneration =
          generation;

        const requestNonce = nonce();

        function attemptLoad(attempt) {
          const image = createImage();
          let settled = false;

          const url = posterAssetUrl(
            source,
            {
              version,
              attempt,
              nonce: requestNonce
            }
          );

          function finishAttempt(
            succeeded,
            reason = null
          ) {
            if (
              requestGeneration !==
                generation ||
              settled
            ) {
              return;
            }

            settled = true;

            if (attemptTimerId !== null) {
              clearTimer(attemptTimerId);
              attemptTimerId = null;
            }

            if (succeeded) {
              retryTimerId = null;

              callbacks.onLoad?.({
                attempt,
                source: url
              });
              return;
            }

            if (
              attempt <
              retryDelaysMs.length
            ) {
              retryTimerId = setTimer(
                () => {
                  retryTimerId = null;
                  attemptLoad(attempt + 1);
                },
                retryDelaysMs[attempt]
              );

              return;
            }

            callbacks.onError?.({
              attempts: attempt + 1,
              reason,
              source: url
            });
          }

          image.onload = () => {
            finishAttempt(true);
          };

          image.onerror = () => {
            finishAttempt(
              false,
              "error"
            );
          };

          image.src = url;

          if (attemptTimeoutMs > 0) {
            attemptTimerId = setTimer(
              () => {
                attemptTimerId = null;
                finishAttempt(
                  false,
                  "timeout"
                );
              },
              attemptTimeoutMs
            );
          }
        }

        attemptLoad(0);

        return cancel;
      }

      return Object.freeze({
        cancel,
        load
      });
    }

    return Object.freeze({
      DEFAULT_ATTEMPT_TIMEOUT_MS,
      createPosterImageLoader,
      posterAssetUrl
    });
  }
);
