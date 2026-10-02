const assert = require("node:assert/strict");
const {
  altimeterNeedleAngles,
  flightForInstruments,
  homePointerAngle,
  homePointerPosition
} = require("./instrument-math");
const airports = require("../data/airport-catalog");

function normalized(angle) {
  return (
    (angle % 360) + 360
  ) % 360;
}

function assertClose(
  actual,
  expected,
  message
) {
  assert.ok(
    Math.abs(actual - expected) <
      0.000001,
    message
  );
}

function testTwoPointerAltimeter() {
  const atSeventeenThousandOne =
    altimeterNeedleAngles(17100);

  assertClose(
    normalized(
      atSeventeenThousandOne
        .hundredsAngle
    ),
    36,
    "At 17,100 feet, the long pointer should indicate 100 feet."
  );

  assertClose(
    normalized(
      atSeventeenThousandOne
        .thousandsAngle
    ),
    255.6,
    "At 17,100 feet, the thousands pointer should sit at 7.1."
  );

  assertClose(
    normalized(
      atSeventeenThousandOne
        .tenThousandsAngle
    ),
    61.56,
    "At 17,100 feet, the triangular pointer should sit at 1.71, just below 2."
  );

  const atThirtyFourThousand =
    altimeterNeedleAngles(34000);

  assert.equal(
    normalized(
      atThirtyFourThousand
        .hundredsAngle
    ),
    0
  );

  assert.equal(
    normalized(
      atThirtyFourThousand
        .thousandsAngle
    ),
    144,
    "At 34,000 feet, the thousands pointer should indicate 4."
  );

  assertClose(
    normalized(
      atThirtyFourThousand
        .tenThousandsAngle
    ),
    122.4,
    "At 34,000 feet, the triangular pointer should sit at 3.4."
  );
}

function testInvalidAltitudeSafety() {
  assert.deepEqual(
    altimeterNeedleAngles(-500),
    {
      hundredsAngle: 0,
      thousandsAngle: 0,
      tenThousandsAngle: 0
    }
  );

  assert.deepEqual(
    altimeterNeedleAngles("unknown"),
    {
      hundredsAngle: 0,
      thousandsAngle: 0,
      tenThousandsAngle: 0
    }
  );
}

testTwoPointerAltimeter();
testInvalidAltitudeSafety();

function testArrivalClearsLastMotionFromInstruments() {
  const flight = {
    groundSpeed: 11,
    heading: 239,
    altitude: null,
    latitude: 36.1,
    longitude: -79.9
  };

  assert.equal(
    flightForInstruments({status: "ARRIVED", flight}),
    null,
    "The last taxi speed and heading must not remain on the gauges after arrival."
  );
  assert.equal(
    flightForInstruments({status: "TAXI IN", flight}),
    flight,
    "The taxi instruments should remain active until arrival is confirmed."
  );
}

testArrivalClearsLastMotionFromInstruments();

function testHomePointer() {
  const home = airports.getAirportCoordinates("AVL");
  assertClose(
    homePointerAngle({
      home: {latitude: 0, longitude: 0},
      position: {latitude: 0, longitude: 1},
      heading: 90
    }),
    0,
    "An eastbound aircraft east of home appears straight ahead."
  );
  for (const heading of [0, 90, 239]) {
    const screenAngle = homePointerAngle({
      home: {latitude: 0, longitude: 0},
      position: {latitude: 0, longitude: -1},
      heading
    });
    assertClose(
      normalized(screenAngle + heading),
      270,
      "West of home aligns with 270 on the card at every aircraft heading."
    );
  }
  assertClose(
    homePointerAngle({
      home,
      position: {latitude: home.latitude + 1, longitude: home.longitude},
      heading: 90
    }),
    -90,
    "North of home points left when the aircraft faces east."
  );
  assert.equal(
    homePointerAngle({home, position: home, heading: 239}),
    0,
    "At home the needle rests upright regardless of the last heading."
  );
  assert.equal(
    homePointerAngle({home, position: null, heading: 90}),
    null,
    "An unknown position cannot yield a truthful pointer."
  );
  assert.equal(
    homePointerAngle({home, position: {latitude: null, longitude: -80}}),
    null,
    "A partial position cannot masquerade as a zero-degree coordinate."
  );
}

testHomePointer();

function testHomePointerPosition() {
  const lookup = airports.getAirportCoordinates;
  assert.deepEqual(
    homePointerPosition({
      status: "AIRBORNE",
      flight: {latitude: 41, longitude: -87, destination: "AVL"}
    }, lookup),
    {latitude: 41, longitude: -87},
    "The live position wins over a future destination."
  );
  assert.deepEqual(
    homePointerPosition({
      status: "ARRIVED", locationAirport: "AVL",
      flight: {latitude: 41, longitude: -87, heading: 239}
    }, lookup),
    lookup("AVL"),
    "Confirmed home arrival rests at home rather than retaining the last aircraft fix."
  );
  assert.deepEqual(
    homePointerPosition({status: "ARRIVED", flight: {
      destination: "AVL", latitude: 41, longitude: -87
    }}, lookup),
    lookup("AVL"),
    "Confirmed arrival can use the destination when locationAirport is absent."
  );
  assert.equal(
    homePointerPosition({status: "AIRBORNE", flight: {destination: "AVL"}}, lookup),
    null,
    "A planned destination cannot stand in for a missing position."
  );
}
testHomePointerPosition();

console.log(
  "Instrument math tests passed."
);
