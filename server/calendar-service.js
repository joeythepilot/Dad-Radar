const fs = require("fs/promises");
const path = require("path");
const { google } = require("googleapis");
const { DateTime } = require("luxon");

const {
  DISPLAY_TIME_ZONE,
  parsePilotSchedule
} = require("./pilot-schedule-parser");

const CALENDAR_ID =
  process.env.GOOGLE_CALENDAR_ID ||
  "family04491195316374346619@group.calendar.google.com";

const TOKEN_PATH = path.join(
  __dirname,
  "..",
  "token.json"
);

let calendarClientPromise = null;

function isCalendarAuthorizationError(
  error
) {
  return Boolean(
    error?.code === 400 &&
    (
      error?.response?.data?.error ===
        "invalid_grant" ||
      error?.response?.data
        ?.error_description ===
        "Token has been expired or revoked."
    )
  );
}

function startOfDisplayDay(
  value = new Date(),
  timeZone = DISPLAY_TIME_ZONE
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      "value must be a valid Date or date string."
    );
  }

  return DateTime
    .fromJSDate(date, {
      zone: timeZone
    })
    .startOf("day")
    .toUTC()
    .toJSDate();
}

function calendarQueryWindow(
  options = {}
) {
  const {
    timeMin,
    timeMax,
    days = 14,
    historyDays = 7,
    now = new Date(),
    timeZone = DISPLAY_TIME_ZONE
  } = options;

  if (
    !Number.isFinite(days) ||
    days <= 0
  ) {
    throw new TypeError(
      "days must be a positive number."
    );
  }

  if (
    !Number.isFinite(historyDays) ||
    historyDays < 0
  ) {
    throw new TypeError(
      "historyDays must be a non-negative number."
    );
  }

  const parseDate = (value, name) => {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(
        `${name} must be a valid Date or date string.`
      );
    }

    return date;
  };

  let startTime;
  let defaultEndTime;

  if (timeMin !== undefined) {
    startTime = parseDate(
      timeMin,
      "timeMin"
    );
    defaultEndTime = new Date(
      startTime.getTime() +
        days * 24 * 60 * 60 * 1000
    );
  } else {
    const referenceTime = parseDate(
      now,
      "now"
    );

    const displayDayStart =
      DateTime
        .fromJSDate(referenceTime, {
          zone: timeZone
        })
        .startOf("day");

    startTime = displayDayStart
      .minus({ days: historyDays })
      .toUTC()
      .toJSDate();

    defaultEndTime = displayDayStart
      .plus({ days })
      .toUTC()
      .toJSDate();
  }

  const endTime =
    timeMax === undefined
      ? defaultEndTime
      : parseDate(timeMax, "timeMax");

  if (endTime <= startTime) {
    throw new RangeError(
      "timeMax must be later than timeMin."
    );
  }

  return {
    startTime,
    endTime
  };
}

async function createCalendarClient() {
  const tokenContent = await fs.readFile(
    TOKEN_PATH,
    "utf8"
  );

  const credentials = JSON.parse(tokenContent);
  const auth = google.auth.fromJSON(credentials);

  return google.calendar({
    version: "v3",
    auth
  });
}

async function getCalendarClient() {
  if (!calendarClientPromise) {
    calendarClientPromise =
      createCalendarClient();
  }

  return calendarClientPromise;
}

async function getUpcomingEvents(options = {}) {
  const {
    timeMin,
    timeMax,
    days = 14,
    historyDays = 7,
    maxResults = 100
  } = options;

  const {
    startTime,
    endTime
  } = calendarQueryWindow({
    timeMin,
    timeMax,
    days,
    historyDays
  });

  const calendar = await getCalendarClient();

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime"
  });

  const events = response.data.items ?? [];

  const rawCalendarData = {
    calendarId: CALENDAR_ID,
    calendarTimeZone:
      response.data.timeZone ?? null,
    retrievedAt: new Date().toISOString(),
    events: events.map((event) => ({
      id: event.id ?? null,
      status: event.status ?? null,
      summary: event.summary ?? "",
      description: event.description ?? "",
      location: event.location ?? "",
      start: event.start ?? null,
      end: event.end ?? null,
      updated: event.updated ?? null
    }))
  };

  return parsePilotSchedule(
    rawCalendarData
  );
}

module.exports = {
  CALENDAR_ID,
  calendarQueryWindow,
  isCalendarAuthorizationError,
  getUpcomingEvents,
  startOfDisplayDay
};
