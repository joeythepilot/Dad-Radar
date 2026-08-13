const assert = require("node:assert/strict");

const {
  inspectFamilyBeta
} = require("./family-beta-check");

const baseOptions = {
  nodeVersion: "20.18.0",
  env: {
    FR24_API_TOKEN: "test-token"
  },
  networkInterfaces: {
    WiFi: [
      {
        family: "IPv4",
        internal: false,
        address: "192.168.1.44"
      }
    ]
  },
  fileExists() {
    return true;
  }
};

const ready = inspectFamilyBeta(
  baseOptions
);

assert.equal(ready.ok, true);
assert.deepEqual(
  ready.addresses,
  ["192.168.1.44"]
);

const missingSecrets =
  inspectFamilyBeta({
    ...baseOptions,
    env: {},
    fileExists(relativePath) {
      return relativePath !==
        "token.json";
    }
  });

assert.equal(
  missingSecrets.ok,
  false
);
assert.equal(
  missingSecrets.results.filter(
    (result) =>
      result.level === "fail"
  ).length,
  2
);

console.log(
  "Family beta readiness tests passed."
);
