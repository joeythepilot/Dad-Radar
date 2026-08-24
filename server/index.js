const path = require("path");
const express = require("express");

require("dotenv").config({ quiet: true });

const {
  getUpcomingEvents,
  isCalendarAuthorizationError
} = require("./calendar-service");

const {
  getLiveFlightSnapshot
} = require("./live-flight-provider-service");
const {
  addDiagnostic,
  recentDiagnostics
} = require("./diagnostic-log");
const {
  getRadarImage
} = require("./weather-radar-service");

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
      primaryProvider: "adsb.lol",
      providers: {
        "adsb.lol": { configured: true },
        flightradar24: {
          configured: Boolean(process.env.FR24_API_TOKEN)
        }
      },
      filedRoute: {
        provider: "flightaware",
        configured: Boolean(process.env.FLIGHTAWARE_AEROAPI_KEY)
      },
      weatherRadar: {
        provider: "NOAA NWS",
        configured: true
      }
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

      const authorizationRequired =
        isCalendarAuthorizationError(
          error
        );

      response.status(
        authorizationRequired
          ? 401
          : 500
      ).json({
        ok: false,
        code: authorizationRequired
          ? "calendar-authorization-required"
          : "calendar-unavailable",
        error:
          authorizationRequired
            ? "Google Calendar authorization must be renewed."
            : "Unable to load the Pilot Schedule calendar."
      });
    }
  }
);

app.post(
  "/api/flights/lookup",
  async (request, response) => {
    try {
      const result =
        await getLiveFlightSnapshot(
          request.body,
          {
            onProviderError(provider, error) {
              addDiagnostic("provider-error", {
                provider,
                message: error.message
              });
            }
          }
        );

      const liveFlight = result.snapshot;

      for (const attempt of result.attempts) {
        addDiagnostic("provider-attempt", attempt);
      }

      response.json({
        ok: true,
        provider: liveFlight?.provider ?? null,
        retrievedAt:
          liveFlight?.retrievedAt ??
          new Date().toISOString(),
        liveFlight
      });
    } catch (error) {
      if (error instanceof TypeError) {
        response.status(400).json({
          ok: false,
          error: error.message
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

app.get("/api/diagnostics/recent", (request, response) => {
  response.json({
    ok: true,
    entries: recentDiagnostics(request.query.limit)
  });
});

app.post("/api/diagnostics/event", (request, response) => {
  const allowed = new Set([
    "altitude-chime-crossing",
    "altitude-chime-test"
  ]);
  const type = String(request.body?.type ?? "");
  if (!allowed.has(type)) {
    response.status(400).json({ ok: false, error: "Unsupported diagnostic event." });
    return;
  }
  addDiagnostic(type, request.body);
  response.json({ ok: true });
});

app.get("/api/weather/radar", async (request, response) => {
  try {
    const radar = await getRadarImage(request.query);
    response.set({
      "Content-Type": radar.contentType,
      "Cache-Control": "public, max-age=300",
      "X-Dad-Radar-Cache": radar.cached ? "HIT" : "MISS"
    });
    response.send(radar.buffer);
  } catch (error) {
    addDiagnostic("weather-error", { message: error.message });
    response.status(error instanceof TypeError ? 400 : 204).end();
  }
});

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
