"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createServerInstanceId,
  normalizeDeploymentSha,
  readDeploymentVersion
} = require("./deployment-version");

const SHA =
  "2f5e3a85678ab219b52beaed846a7a23f78f00ce";

assert.equal(
  normalizeDeploymentSha(SHA.toUpperCase()),
  SHA
);
assert.equal(
  normalizeDeploymentSha("not-a-sha"),
  null
);

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "dad-radar-version-")
);

try {
  const versionPath = path.join(
    temporaryDirectory,
    "deployed-sha.txt"
  );

  assert.equal(
    readDeploymentVersion({ versionPath }),
    null,
    "missing deployment marker should report an unknown version"
  );

  fs.writeFileSync(
    versionPath,
    `${SHA.toUpperCase()}\n`,
    "utf8"
  );

  assert.equal(
    readDeploymentVersion({ versionPath }),
    SHA,
    "startup should snapshot the exact deployed SHA"
  );

  fs.writeFileSync(
    versionPath,
    "corrupt\n",
    "utf8"
  );

  assert.equal(
    readDeploymentVersion({ versionPath }),
    null,
    "invalid deployment markers must never be reported as versions"
  );
} finally {
  fs.rmSync(temporaryDirectory, {
    recursive: true,
    force: true
  });
}

assert.equal(
  createServerInstanceId({
    now: () => 1234567890,
    pid: 620,
    random: () => 0.5
  }),
  "1234567890-620-i00000",
  "server instance IDs should change with each process generation"
);

console.log("Deployment version and server-instance tests passed.");
