const path = require("path");
const express = require("express");

require("dotenv").config({ quiet: true });

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
const host =
  process.env.HOST || "0.0.0.0";
const projectRoot = path.join(
  __dirname,
  ".."
);

const PUBLIC_DIRECTORIES = [
  "App",
  "UI",
  "assets",
  "config",
  "data",
  "models",
  "services"
];

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

for (const directory of
  PUBLIC_DIRECTORIES) {
  app.use(
    `/${directory}`,
    express.static(
      path.join(
        projectRoot,
        directory
      ),
      {
        dotfiles: "deny",
        fallthrough: false,
        index: false
      }
    )
  );
}

app.get("/", (_request, response) => {
  response.sendFile(
    path.join(projectRoot, "index.html")
  );
});

app.get(
  ["/index.html", "/display"],
  (_request, response) => {
    response.sendFile(
      path.join(projectRoot, "index.html")
    );
  }
);

function startServer(options = {}) {
  const listenPort =
    options.port ?? port;

  const listenHost =
    options.host ?? host;

  const server = app.listen(
    listenPort,
    listenHost,
    () => {
      const address =
        server.address();

      const displayedPort =
        typeof address === "object"
          ? address.port
          : listenPort;

      console.log(
        `Dad Radar service running on port ${displayedPort}.`
      );
      console.log(
        `This PC: http://127.0.0.1:${displayedPort}`
      );
      console.log(
        "Family display: run npm.cmd run beta:address for the iPad address."
      );
    }
  );

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  PUBLIC_DIRECTORIES
};
