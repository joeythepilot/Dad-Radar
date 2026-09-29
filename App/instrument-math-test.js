const assert = require("node:assert/strict");
const {
  altimeterNeedleAngles,
  flightForInstruments
} = require("./instrument-math");

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

console.log(
  "Instrument math tests passed."
);
