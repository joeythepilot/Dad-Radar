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
    response("instance-b", "sha-b"),
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

  assert.equal(requests.length, 4);
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

  console.log("Deployment refresh watcher tests passed.");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
