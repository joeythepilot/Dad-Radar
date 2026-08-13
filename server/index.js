const path = require("path");
const express = require("express");

require("dotenv").config();

const {
  getUpcomingEvents
} = require("./calendar-service");

const {
  Flightradar24ConfigurationError,
  Flightradar24RequestError,
  getLiveFlightSnapshot
} = require("./flightradar24-service");

const app = express();
const port = Number(process.env.PORT) || 4173;

app.use(
  express.json({ limit: "16kb" })
);

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "Dad Radar",
    flightData: {
      provider: "flightradar24",
      configured: Boolean(
        process.env.FR24_API_TOKEN
      )
    }
  });
});

app.get(
  "/api/calendar/upcoming",
  async (request, response) => {
    try {
      const requestedDays = Number(
        request.query.days ?? 14
      );

      const days =
        Number.isFinite(requestedDays) &&
        requestedDays > 0
          ? Math.min(requestedDays, 60)
          : 14;

      const calendarData =
        await getUpcomingEvents({ days });

      response.json({
        ok: true,
        ...calendarData
      });
    } catch (error) {
      console.error(
        "Calendar request failed:",
        error
      );

      response.status(500).json({
        ok: false,
        error:
          "Unable to load the Pilot Schedule calendar."
      });
    }
  }
);

app.post(
  "/api/flights/lookup",
  async (request, response) => {
    try {
      const liveFlight =
        await getLiveFlightSnapshot(
          request.body
        );

      response.json({
        ok: true,
        provider: "flightradar24",
        retrievedAt:
          liveFlight?.retrievedAt ??
          new Date().toISOString(),
        liveFlight
      });
    } catch (error) {
      if (
        error instanceof
        Flightradar24ConfigurationError
      ) {
        response.status(503).json({
          ok: false,
          error:
            "Flightradar24 is not configured."
        });
        return;
      }

      if (error instanceof TypeError) {
        response.status(400).json({
          ok: false,
          error: error.message
        });
        return;
      }

      if (
        error instanceof
        Flightradar24RequestError
      ) {
        console.error(
          "Flightradar24 request failed:",
          error.message
        );

        response.status(502).json({
          ok: false,
          error:
            "Unable to load live flight data."
        });
        return;
      }

      console.error(
        "Live flight lookup failed:",
        error
      );

      response.status(500).json({
        ok: false,
        error:
          "Unable to resolve live flight data."
      });
    }
  }
);

app.use(
  express.static(
    path.join(__dirname, ".."),
    { extensions: ["html"] }
  )
);

app.listen(port, "127.0.0.1", () => {
  console.log(
    `Dad Radar service running at http://127.0.0.1:${port}`
  );
});
