(function initializeDeploymentRefresh(
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
    root.dadRadarDeploymentRefresh =
      Object.freeze(api);

    if (
      root.document &&
      typeof root.fetch === "function" &&
      typeof root.setInterval === "function" &&
      root.location &&
      typeof root.location.reload === "function"
    ) {
      api.startDeploymentRefreshWatcher();
    }
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createDeploymentRefreshApi(root) {
    "use strict";

    const DEFAULT_INTERVAL_MS = 10000;

    function createDeploymentRefreshWatcher(
      providedOptions = {}
    ) {
      const fetchImpl =
        providedOptions.fetch ??
        ((...argumentsList) =>
          root.fetch(...argumentsList));

      const reload =
        providedOptions.reload ??
        (() => root.location.reload());

      let baselineInstanceId = null;
      let reloadRequested = false;

      async function check() {
        if (reloadRequested) {
          return false;
        }

        try {
          const response = await fetchImpl(
            "/api/health",
            { cache: "no-store" }
          );

          if (!response?.ok) {
            return false;
          }

          const payload = await response.json();
          const instanceId = String(
            payload?.instanceId ?? ""
          ).trim();

          if (!instanceId) {
            return false;
          }

          if (baselineInstanceId === null) {
            baselineInstanceId = instanceId;
            return false;
          }

          if (instanceId === baselineInstanceId) {
            return false;
          }

          reloadRequested = true;
          reload();
          return true;
        } catch (_error) {
          return false;
        }
      }

      return Object.freeze({
        check
      });
    }

    function startDeploymentRefreshWatcher(
      providedOptions = {}
    ) {
      const watcher =
        createDeploymentRefreshWatcher(
          providedOptions
        );

      const setTimer =
        providedOptions.setInterval ??
        ((callback, intervalMs) =>
          root.setInterval(
            callback,
            intervalMs
          ));

      const intervalMs = Math.max(
        1000,
        Number(
          providedOptions.intervalMs ??
            DEFAULT_INTERVAL_MS
        ) || DEFAULT_INTERVAL_MS
      );

      void watcher.check();
      const timerId = setTimer(
        () => {
          void watcher.check();
        },
        intervalMs
      );

      return Object.freeze({
        timerId,
        watcher
      });
    }

    return {
      DEFAULT_INTERVAL_MS,
      createDeploymentRefreshWatcher,
      startDeploymentRefreshWatcher
    };
  }
);
