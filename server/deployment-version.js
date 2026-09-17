"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_VERSION_PATH = path.join(
  __dirname,
  "..",
  "runtime",
  "deployed-sha.txt"
);

const SHA_PATTERN = /^[0-9a-f]{40}$/;

function normalizeDeploymentSha(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return SHA_PATTERN.test(normalized)
    ? normalized
    : null;
}

function readDeploymentVersion(options = {}) {
  const versionPath =
    options.versionPath ?? DEFAULT_VERSION_PATH;
  const readFileSync =
    options.readFileSync ?? fs.readFileSync;

  try {
    return normalizeDeploymentSha(
      readFileSync(versionPath, "utf8")
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function createServerInstanceId(options = {}) {
  const now = options.now ?? Date.now;
  const pid = options.pid ?? process.pid;
  const random = options.random ?? Math.random;
  const randomSpace = 36 ** 6;
  const randomValue = Math.max(
    0,
    Math.min(
      0.999999999999,
      Number(random()) || 0
    )
  );
  const suffix = Math.floor(
    randomValue * randomSpace
  )
    .toString(36)
    .padStart(6, "0");

  return `${now()}-${pid}-${suffix}`;
}

module.exports = {
  DEFAULT_VERSION_PATH,
  createServerInstanceId,
  normalizeDeploymentSha,
  readDeploymentVersion
};
