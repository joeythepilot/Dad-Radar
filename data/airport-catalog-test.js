const assert = require("node:assert/strict");
const airportCatalog = require(
  "./airport-catalog"
);

function testGlobalCoverage() {
  assert.ok(
    airportCatalog.count >= 7800,
    "The catalog should include the global IATA airport set."
  );
}

function testBillingsLocation() {
  const billings =
    airportCatalog.lookupAirport("bil");

  assert.equal(billings.code, "BIL");
  assert.equal(billings.icao, "KBIL");
  assert.equal(billings.city, "Billings");
  assert.equal(
    billings.subdivision,
    "Montana"
  );
  assert.equal(
    billings.timeZone,
    "America/Denver"
  );
  assert.equal(
    airportCatalog.formatLocation(
      "BIL"
    ),
    "Billings, Montana"
  );
}

function testPreviouslyUnregisteredAirport() {
  const seattle =
    airportCatalog.lookupAirport("SEA");

  assert.equal(seattle.city, "Seattle");
  assert.equal(
    seattle.subdivision,
    "Washington"
  );
  assert.equal(
    airportCatalog.getAirportTimeZone(
      "SEA"
    ),
    "America/Los_Angeles"
  );
  assert.ok(
    Number.isFinite(
      airportCatalog
        .getAirportCoordinates("SEA")
        .latitude
    )
  );
}

function testUnknownAirportFallback() {
  assert.equal(
    airportCatalog.lookupAirport("XYZ"),
    null
  );
  assert.equal(
    airportCatalog.formatLocation("XYZ"),
    "XYZ"
  );
  assert.equal(
    airportCatalog.getAirportTimeZone(
      "XYZ"
    ),
    null
  );
}

function runTests() {
  testGlobalCoverage();
  testBillingsLocation();
  testPreviouslyUnregisteredAirport();
  testUnknownAirportFallback();

  console.log(
    "Airport catalog tests passed."
  );
}

runTests();
