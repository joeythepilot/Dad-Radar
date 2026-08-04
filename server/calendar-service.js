const fs = require("fs/promises");
const path = require("path");
const { google } = require("googleapis");

const {
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
    timeMin = new Date(),
    days = 14,
    maxResults = 100
  } = options;

  const startTime =
    timeMin instanceof Date
      ? timeMin
      : new Date(timeMin);

  if (Number.isNaN(startTime.getTime())) {
    throw new TypeError(
      "timeMin must be a valid Date or date string."
    );
  }

  const endTime = new Date(
    startTime.getTime() +
      days * 24 * 60 * 60 * 1000
  );

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
  getUpcomingEvents
};