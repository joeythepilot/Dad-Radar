const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  getPoster,
  posterByAirport
} = require("./posters");

function runTests() {
  assert.equal(
    getPoster("avl").title,
    "ASHEVILLE"
  );
  assert.equal(
    getPoster("KAVL"),
    null
  );
  assert.equal(
    getPoster("BIL"),
    null
  );
  assert.equal(
    getPoster("lse").location,
    "La Crosse, Wisconsin"
  );
  assert.equal(
    getPoster("ABE").title,
    "LEHIGH VALLEY"
  );
  assert.equal(
    getPoster("MSN").location,
    "Madison, Wisconsin"
  );
  assert.equal(
    getPoster("TPA").title,
    "TAMPA"
  );
  assert.equal(
    Object.keys(posterByAirport).length,
    32
  );

  for (const [code, poster] of
    Object.entries(posterByAirport)) {
    assert.match(code, /^[A-Z0-9]{3}$/);

    const relativeSource =
      poster.source.replace(/^\.\//, "");

    assert.equal(
      fs.existsSync(
        path.join(
          __dirname,
          "..",
          relativeSource
        )
      ),
      true,
      `${code} poster is missing at ${poster.source}`
    );
  }

  console.log("Poster catalog tests passed.");
}

runTests();
