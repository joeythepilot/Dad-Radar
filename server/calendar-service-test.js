const assert = require("node:assert/strict");

const {
  calendarQueryWindow,
  isCalendarAuthorizationError,
  startOfDisplayDay,
  fetchCalendarPages
} = require("./calendar-service");

async function testCompleteBoundedCalendarRead() {
  assert.equal(typeof fetchCalendarPages, "function", "Calendar reads must have a bounded, paginated fetch path.");
  const requests = [];
  const calendar = {events:{async list(params, transport) {
    requests.push({params,transport});
    return {data:params.pageToken
      ? {items:[{id:"later-reserve"}],timeZone:"America/Chicago"}
      : {items:[{id:"earlier-flight"}],timeZone:"America/Chicago",nextPageToken:"next"}};
  }}};
  const result = await fetchCalendarPages(calendar,{calendarId:"pilot",timeMin:"2026-09-20T00:00:00Z",timeMax:"2026-10-10T00:00:00Z",maxResults:100});
  assert.deepEqual(result.items.map(event=>event.id),["earlier-flight","later-reserve"],
    "A later calendar page must reach the family schedule.");
  assert.equal(result.timeZone,"America/Chicago");
  assert.deepEqual(requests.map(request=>request.params.pageToken),[undefined,"next"]);
  assert(requests.every(request=>request.transport.timeout>0 && request.transport.timeout<=15000),
    "Every Google request has a finite timeout, including subsequent pages.");
}

function testSummerDayBoundary() {
  const start = startOfDisplayDay(
    "2026-08-04T15:57:41.422Z"
  );

  assert.equal(
    start.toISOString(),
    "2026-08-04T04:00:00.000Z"
  );
}

function testExpiredAuthorizationDetection() {
  assert.equal(
    isCalendarAuthorizationError({
      code: 400,
      response: {
        data: {
          error: "invalid_grant",
          error_description:
            "Token has been expired or revoked."
        }
      }
    }),
    true
  );

  assert.equal(
    isCalendarAuthorizationError({
      code: 500
    }),
    false
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

async function runTests() {
  testSummerDayBoundary();
  testWinterDayBoundary();
  testInvalidBoundaryInput();
  testDefaultWindowIncludesLocationHistory();
  testExplicitMinimumDoesNotAddHistory();
  testExpiredAuthorizationDetection();
  await testCompleteBoundedCalendarRead();

  console.log(
    "Calendar service tests passed."
  );
}

runTests().catch(error=>{console.error(error);process.exitCode=1;});
