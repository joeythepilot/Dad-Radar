const fs = require("node:fs");
const path = require("node:path");

const {
  localIpv4Addresses
} = require("./beta-address");

const {
  posterByAirport
} = require("../config/posters");

const PROJECT_ROOT = path.join(
  __dirname,
  ".."
);

function createResult(
  level,
  label,
  detail
) {
  return { level, label, detail };
}

function inspectFamilyBeta(options = {}) {
  const projectRoot =
    options.projectRoot ??
    PROJECT_ROOT;

  const env = options.env ??
    process.env;

  const nodeVersion =
    options.nodeVersion ??
    process.versions.node;

  const networkInterfaces =
    options.networkInterfaces;

  const fileExists =
    options.fileExists ??
    ((relativePath) =>
      fs.existsSync(
        path.join(
          projectRoot,
          relativePath
        )
      ));

  const results = [];

  const nodeMajor = Number(
    String(nodeVersion).split(".")[0]
  );

  results.push(
    Number.isFinite(nodeMajor) &&
    nodeMajor >= 18
      ? createResult(
          "pass",
          "Node.js",
          `v${nodeVersion}`
        )
      : createResult(
          "fail",
          "Node.js",
          "Version 18 or newer is required."
        )
  );

  results.push(
    fileExists(
      "node_modules/express/package.json"
    )
      ? createResult(
          "pass",
          "Dependencies",
          "Installed"
        )
      : createResult(
          "fail",
          "Dependencies",
          "Run npm.cmd install."
        )
  );

  results.push(
    fileExists("token.json")
      ? createResult(
          "pass",
          "Google Calendar",
          "Authorized"
        )
      : createResult(
          "fail",
          "Google Calendar",
          "token.json is missing. Run node server/calendar-test.mjs to authorize."
        )
  );

  results.push(
    String(
      env.FR24_API_TOKEN ?? ""
    ).trim()
      ? createResult(
          "pass",
          "Flightradar24",
          "Token loaded"
        )
      : createResult(
          "fail",
          "Flightradar24",
          "Add FR24_API_TOKEN to .env."
        )
  );

  results.push(
    fileExists(
      "assets/audio/split-flap.mp3"
    )
      ? createResult(
          "pass",
          "Split-flap audio",
          "Installed"
        )
      : createResult(
          "fail",
          "Split-flap audio",
          "assets/audio/split-flap.mp3 is missing."
        )
  );

  const missingPosters =
    Object.entries(posterByAirport)
      .filter(([, poster]) =>
        !fileExists(
          poster.source.replace(
            /^\.\//,
            ""
          )
        )
      )
      .map(([code]) => code);

  results.push(
    missingPosters.length === 0
      ? createResult(
          "pass",
          "Destination posters",
          `${Object.keys(posterByAirport).length} approved posters installed`
        )
      : createResult(
          "fail",
          "Destination posters",
          `Missing: ${missingPosters.join(", ")}`
        )
  );

  const addresses =
    localIpv4Addresses(
      networkInterfaces
    );

  results.push(
    addresses.length > 0
      ? createResult(
          "pass",
          "Home network",
          addresses.join(", ")
        )
      : createResult(
          "warn",
          "Home network",
          "No LAN address found. Connect the desktop to the home network before starting the display."
        )
  );

  return {
    ok: !results.some(
      (result) =>
        result.level === "fail"
    ),
    results,
    addresses
  };
}

function printReport(report) {
  const symbols = {
    pass: "PASS",
    warn: "WARN",
    fail: "FAIL"
  };

  console.log(
    "DAD RADAR FAMILY BETA CHECK"
  );

  for (const result of
    report.results) {
    console.log(
      `[${symbols[result.level]}] ${result.label}: ${result.detail}`
    );
  }

  console.log("");

  if (report.ok) {
    console.log(
      "Dad Radar is ready for the family beta."
    );
    console.log(
      "Recommended: npm.cmd run beta:autostart:install"
    );
    console.log(
      "Manual fallback: npm.cmd run beta:start"
    );
    console.log(
      "Display address: npm.cmd run beta:address"
    );
    return;
  }

  console.log(
    "Fix the FAIL items above, then run this check again."
  );
}

function run() {
  require("dotenv").config({
    path: path.join(
      PROJECT_ROOT,
      ".env"
    ),
    quiet: true
  });

  const report = inspectFamilyBeta();
  printReport(report);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  inspectFamilyBeta,
  printReport
};
