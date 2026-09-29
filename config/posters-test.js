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
  assert.equal(getPoster("BIS").title, "BISMARCK");
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
  for (const code of [
    "AMA", "LIT", "ATW", "FAR", "BRO",
    "GRR", "SAT", "ABQ", "GPT", "ICT",
    "ATL", "BOS", "BOI", "EYW", "MCI",
    "AUS", "CHS", "CLE", "ELP", "PIT",
    "IAH", "MSP", "RIC", "SEA", "STL",
    "BHM", "BUF", "COS", "JAX", "SDF",
    "ALB", "CHA", "DSM", "MEM", "PNS",
    "OKC", "MYR", "ORF", "YQB", "BTR",
    "ACA", "BIL", "CRP", "GJT", "ILM",
    "ABI", "ACT", "AEX", "AGU", "AVP",
    "BDL", "BIS", "BPT", "BUR", "CAE",
    "CAK", "CCS", "CID", "CLL", "COU",
    "CUU", "CVG", "CWA", "DOM", "ECP",
    "EIS", "EUG", "FSM", "FWA", "GCK",
    "GGG", "GNV", "GRI", "GRK", "HOU",
    "HPN", "HRL", "JAN", "JFK", "LAN",
    "LAW", "LCH", "LGA", "LRD", "MAF",
    "MAR", "MFE", "MGM", "MHH", "MHK",
    "MHT", "MLI", "MLU", "MQT", "MSO",
    "MTY", "MZT", "RAP", "RDM", "RDU",
    "ROW", "RST", "SBP", "TRI", "YUL",
    "AXA", "AZO", "BGR", "BIM", "ELH",
    "FPO", "FSD", "GGT", "HHH", "LEX",
    "LFT", "LGB", "MDT", "MOB", "MRY",
    "NAS", "SAV", "SBA", "SHV", "SPS"
  ]) {
    assert.ok(
      getPoster(code),
      `${code} approved poster should be installed`
    );
  }
  assert.equal(
    Object.keys(posterByAirport).length,
    162
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
