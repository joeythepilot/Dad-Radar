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
      typeof root.location.replace === "function"
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
        ((deployment) => {
          const url = new URL(root.location.href);
          url.searchParams.set("_dadRadarDeployment", deployment);
          root.location.replace(url.href);
        });

      function pageMarker(name) {
        return root.document?.querySelector(`meta[name="dad-radar-${name}"]`)?.content || null;
      }

      let baselineInstanceId = providedOptions.loadedInstanceId ?? pageMarker("instance");
      let baselineVersion = providedOptions.loadedVersion ?? pageMarker("version");
      let checking = false;
      let reloadRequested = false;

      async function check() {
        if (reloadRequested || checking) {
          return false;
        }

        checking = true;
        const controller = typeof root.AbortController === "function" ? new root.AbortController() : null;
        let timeout;
        try {
          const request = async () => {
            const response = await fetchImpl(
              "/api/health",
              { cache: "no-store", ...(controller ? {signal: controller.signal} : {}) }
            );
            if (!response?.ok) return null;
            return response.json();
          };
          const payload = await Promise.race([
            request(),
            new Promise((_, reject) => {
              timeout = root.setTimeout(() => {
                if (controller) controller.abort();
                reject(new Error("Health check timed out"));
              }, providedOptions.timeoutMs ?? 5000);
            })
          ]);
          const instanceId = String(
            payload?.instanceId ?? ""
          ).trim();

          const version = String(payload?.version ?? "").trim();
          if (!instanceId && !version) return false;
          const changed = (baselineInstanceId && instanceId && baselineInstanceId !== instanceId) ||
            (baselineVersion && version && baselineVersion !== version);
          if (!changed) {
            if (instanceId) baselineInstanceId = instanceId;
            if (version) baselineVersion = version;
            return false;
          }

          reloadRequested = true;
          reload(version || instanceId);
          return true;
        } catch (_error) {
          return false;
        } finally {
          root.clearTimeout(timeout);
          checking = false;
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

      const wake = () => { void watcher.check(); };
      const visible = () => { if (!root.document.hidden) wake(); };
      if (root.addEventListener) {
        root.addEventListener("online", wake);
        root.addEventListener("pageshow", wake);
        root.addEventListener("focus", wake);
      }
      if (root.document?.addEventListener) root.document.addEventListener("visibilitychange", visible);
      return Object.freeze({ timerId, watcher });
    }

    return {
      DEFAULT_INTERVAL_MS,
      createDeploymentRefreshWatcher,
      startDeploymentRefreshWatcher
    };
  }
);
