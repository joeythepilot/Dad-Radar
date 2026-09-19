"use strict";

const assert = require("node:assert/strict");

const {
  createDeploymentRefreshWatcher
} = require("./deployment-refresh");

function response(instanceId, version = "abc") {
  return {
    ok: true,
    async json() {
      return {
        ok: true,
        service: "Dad Radar",
        instanceId,
        version
      };
    }
  };
}

async function runTests() {
  const responses = [
    response("instance-a", "sha-a"),
    response("instance-a", "sha-a"),
    response("instance-b", "sha-b")
  ];

  let reloads = 0;
  const requests = [];

  const watcher = createDeploymentRefreshWatcher({
    fetch: async (url, options) => {
      requests.push({ url, options });
      return responses.shift();
    },
    reload: () => {
      reloads += 1;
    }
  });

  assert.equal(
    await watcher.check(),
    false,
    "first health response establishes the server-instance baseline"
  );
  assert.equal(
    await watcher.check(),
    false,
    "same server instance must not reload the display"
  );
  assert.equal(
    await watcher.check(),
    true,
    "a new server instance should reload the display"
  );
  assert.equal(reloads, 1);

  assert.equal(
    await watcher.check(),
    false,
    "reload should be requested at most once per page generation"
  );
  assert.equal(reloads, 1);

  assert.equal(
    requests.length,
    3,
    "once reload is requested, the old page should stop polling"
  );
  for (const request of requests) {
    assert.equal(request.url, "/api/health");
    assert.equal(request.options.cache, "no-store");
  }

  let failedReloads = 0;
  const failingWatcher = createDeploymentRefreshWatcher({
    fetch: async () => {
      throw new Error("server temporarily unavailable");
    },
    reload: () => {
      failedReloads += 1;
    }
  });

  assert.equal(await failingWatcher.check(), false);
  assert.equal(failedReloads, 0);

  let staleReloads = 0;
  const staleWatcher = createDeploymentRefreshWatcher({
    loadedInstanceId: "old-page-instance", loadedVersion: "sha-old",
    fetch: async () => response("instance-new", "sha-new"),
    reload: () => staleReloads++
  });
  assert.equal(await staleWatcher.check(), true, "A stale page must reload on its first successful health check");
  assert.equal(staleReloads, 1);
  let version = "sha-a";
  const versionWatcher = createDeploymentRefreshWatcher({
    fetch: async () => response("same-instance", version), reload: () => {}
  });
  assert.equal(await versionWatcher.check(), false);
  version = "sha-b";
  assert.equal(await versionWatcher.check(), true, "Version changes also invalidate a loaded page");
  let calls = 0;
  const recovery = createDeploymentRefreshWatcher({
    loadedInstanceId: "old", timeoutMs: 20,
    fetch: async () => { calls++; return calls === 1 ? new Promise(() => {}) : response("new"); },
    reload: () => {}
  });
  const stalled = recovery.check();
  assert.equal(await recovery.check(), false, "Overlapping checks are suppressed");
  assert.equal(calls, 1);
  assert.equal(await stalled, false, "Hung checks time out without refreshing to an offline page");
  assert.equal(await recovery.check(), true, "Polling recovers after a stalled request");
  let bad = true;
  const unavailable = createDeploymentRefreshWatcher({
    loadedInstanceId: "old", fetch: async () => bad ? {ok:false} : response("new"), reload: () => {}
  });
  assert.equal(await unavailable.check(), false);
  bad = false;
  assert.equal(await unavailable.check(), true, "Deployment downtime does not discard the loaded page baseline");
  console.log("Deployment refresh watcher tests passed.");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
