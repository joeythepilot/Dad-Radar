import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import "dotenv/config";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly"
];

const CREDENTIALS_PATH =
  path.join(process.cwd(), "credentials.json");

const TOKEN_PATH =
  path.join(process.cwd(), "token.json");

const FORCE_REAUTHORIZE =
  process.argv.includes("--force");

const CALENDAR_ID =
  process.env.GOOGLE_CALENDAR_ID ||
  "family04491195316374346619@group.calendar.google.com";

async function loadSavedCredentials() {
  try {
    const content = await fs.readFile(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(content);

    return google.auth.fromJSON(credentials);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(
    CREDENTIALS_PATH,
    "utf8"
  );

  const keys = JSON.parse(content);
  const key = keys.installed ?? keys.web;
  const refreshToken = client.credentials?.refresh_token;

  if (!key?.client_id || !key?.client_secret) {
    throw new Error(
      "credentials.json does not contain Desktop OAuth credentials."
    );
  }

  if (!refreshToken) {
    throw new Error(
      "Google did not return a refresh token."
    );
  }

  const token = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: refreshToken
  };

  await fs.writeFile(
    TOKEN_PATH,
    `${JSON.stringify(token, null, 2)}\n`
  );

  console.log("Authorization saved to token.json.");
}

async function authorize() {
  if (FORCE_REAUTHORIZE) {
    try {
      const backupPath = path.join(
        process.cwd(),
        `token.expired-${Date.now()}.json`
      );

      await fs.rename(
        TOKEN_PATH,
        backupPath
      );

      console.log(
        `Previous authorization preserved as ${path.basename(backupPath)}.`
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const savedClient = await loadSavedCredentials();

  if (savedClient) {
    return savedClient;
  }

  const newClient = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH
  });

  await saveCredentials(newClient);

  return newClient;
}

async function main() {
  const auth = await authorize();

  const calendar = google.calendar({
    version: "v3",
    auth
  });

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime"
  });

  const events = response.data.items ?? [];

  if (events.length === 0) {
    console.log(
      "No upcoming Pilot Schedule events found."
    );

    return;
  }

  console.log("Upcoming Pilot Schedule events:");

  for (const event of events) {
    const start =
      event.start?.dateTime ??
      event.start?.date ??
      "UNKNOWN";

    const end =
      event.end?.dateTime ??
      event.end?.date ??
      "UNKNOWN";

    console.log(
      `${start} -> ${end} | ${event.summary}`
    );
  }
}

main().catch((error) => {
  console.error("Calendar test failed:");

  if (
    error?.response?.data?.error ===
      "invalid_grant"
  ) {
    console.error(
      "The saved Google Calendar authorization has expired or was revoked."
    );
    console.error(
      "Run: npm.cmd run calendar:reauthorize"
    );
  } else {
    console.error(
      error?.message ?? String(error)
    );
  }

  process.exitCode = 1;
});
