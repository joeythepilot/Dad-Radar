const path = require("path");
const express = require("express");

require("dotenv").config();

const {
  getUpcomingEvents
} = require("./calendar-service");

const app = express();
const port = Number(process.env.PORT) || 4173;

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "Dad Radar"
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