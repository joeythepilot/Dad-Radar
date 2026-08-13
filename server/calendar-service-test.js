const assert = require("node:assert/strict");

const {
  calendarQueryWindow,
  startOfDisplayDay
} = require("./calendar-service");

function testSummerDayBoundary() {
  const start = startOfDisplayDay(
    "2026-08-04T15:57:41.422Z"
  );

  assert.equal(
    start.toISOString(),
    "2026-08-04T04:00:00.000Z"
  );
}

function testWinterDayBoundary() {
  const start = startOfDisplayDay(
    "2026-01-12T18:00:00.000Z"
  );

  assert.equal(
    start.toISOString(),
    "2026-01-12T05:00:00.000Z"
  );
}

function testInvalidBoundaryInput() {
  assert.throws(
    () => startOfDisplayDay("not-a-date"),
    /valid Date or date string/
  );
}

function testDefaultWindowIncludesLocationHistory() {
  const { startTime, endTime } =
    calendarQueryWindow({
      now:
        "2026-08-04T15:57:41.422Z",
      days: 14,
      historyDays: 7
    });

  assert.equal(
    startTime.toISOString(),
    "2026-07-28T04:00:00.000Z"
  );
  assert.equal(
    endTime.toISOString(),
    "2026-08-18T04:00:00.000Z"
  );
}

function testExplicitMinimumDoesNotAddHistory() {
  const { startTime, endTime } =
    calendarQueryWindow({
      timeMin:
        "2026-08-04T15:57:41.422Z",
      days: 2
    });

  assert.equal(
    startTime.toISOString(),
    "2026-08-04T15:57:41.422Z"
  );
  assert.equal(
    endTime.toISOString(),
    "2026-08-06T15:57:41.422Z"
  );
}

function runTests() {
  testSummerDayBoundary();
  testWinterDayBoundary();
  testInvalidBoundaryInput();
  testDefaultWindowIncludesLocationHistory();
  testExplicitMinimumDoesNotAddHistory();

  console.log(
    "Calendar service tests passed."
  );
}

runTests();
