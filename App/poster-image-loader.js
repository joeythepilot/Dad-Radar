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

      let generation = 0;
      let retryTimerId = null;

      function cancel() {
        generation += 1;

        if (retryTimerId !== null) {
          clearTimer(retryTimerId);
          retryTimerId = null;
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

          const url = posterAssetUrl(
            source,
            {
              version,
              attempt,
              nonce: requestNonce
            }
          );

          image.onload = () => {
            if (
              requestGeneration !==
              generation
            ) {
              return;
            }

            retryTimerId = null;

            callbacks.onLoad?.({
              attempt,
              source: url
            });
          };

          image.onerror = () => {
            if (
              requestGeneration !==
              generation
            ) {
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
              source: url
            });
          };

          image.src = url;
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
      createPosterImageLoader,
      posterAssetUrl
    });
  }
);
