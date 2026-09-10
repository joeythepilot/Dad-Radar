const fs = require("fs");
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

const {createAirportSurfaceService} = require("./airport-surface-service");
const airportSurface = createAirportSurfaceService({report: addDiagnostic});
const masterState = require("./master-state-service").createMasterStateService({
  getCalendar: getUpcomingEvents, getFlight: getLiveFlightSnapshot, report: addDiagnostic
});

const app = express();
const port = Number(process.env.PORT) || 4173;
const host =
  process.env.HOST || "0.0.0.0";
const projectRoot = path.join(
  __dirname,
  ".."
);

const displayHtml = fs
  .readFileSync(
    path.join(projectRoot, "index.html"),
    "utf8"
  )
  .replace(
    "</head>",
    [
      "  <link",
      "    rel=\"stylesheet\"",
      "    href=\"./assets/ui/airport-placard-enamel-v10.css?v=10.0\"",
      "  >",
      "</head>"
    ].join("\n")
  );

const PUBLIC_DIRECTORIES = [
  "Mobile",
  "App",
  "UI",
  "assets",
  "config",
  "data",
  "models",
  "services"
];

app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});
app.get("/Mobile/sw.js", (_request, response) => {
  response.set({"Service-Worker-Allowed": "/mobile", "Cache-Control": "no-cache"});
  response.sendFile(path.join(projectRoot, "Mobile", "sw.js"));
});

app.use(
  express.json({ limit: "16kb" })
);

app.get("/api/airports/:code/surface", async (request, response) => {
  const result = await airportSurface.get(request.params.code);
  if (!result) return response.status(404).json({ok: false, error: "Unknown airport"});
  response.json(result);
});

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

// Display reads never trigger upstream requests.
app.get("/api/state", (_request, response) => {
  const state = masterState.read();
  response.status(state.ok ? 200 : 503).json(state);
});
app.get("/api/calendar/upcoming", (_request, response) => {
  const calendar = masterState.readCalendar();
  response.status(calendar ? 200 : 503).json(calendar ? {ok: true, ...calendar} : {ok: false, error: "Schedule not ready."});
});
app.post("/api/flights/lookup", (_request, response) => {
  response.status(410).json({ok: false, error: "Refresh Dad Radar to use the shared home-server state."});
});

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

// Reuse the primary display inside the family app scope and authentication boundary.
app.get(["/mobile/full", "/mobile/full/"], (_request, response) => {
  const familyHtml = displayHtml
    .replace('<html lang="en">', '<html lang="en" data-family-full>')
    .replace('<head>', `<head><base href="/">
<script src="/Mobile/family-auth.js?v=1"></script>
<script src="/Mobile/layout.js?v=2"></script>
<link rel="manifest" href="/Mobile/manifest.webmanifest">
<link rel="apple-touch-icon" href="/Mobile/icon.png">
<meta name="apple-mobile-web-app-title" content="Dad Radar">
<meta name="robots" content="noindex,nofollow">`)
    .replace('</head>', '<link rel="stylesheet" href="/Mobile/layout.css?v=2"></head>');
  response.set("Cache-Control", "private, no-store").type("html").send(familyHtml);
});

app.get(["/mobile", "/mobile/"], (_request, response) => {
  response.set("Cache-Control", "private, no-store");
  response.sendFile(path.join(projectRoot, "Mobile", "index.html"));
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
  response.type("html").send(displayHtml);
});

app.get(
  ["/index.html", "/display"],
  (_request, response) => {
    response.type("html").send(displayHtml);
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
        address &&
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

  // The Windows background host imports startServer instead of running this file.
  // Keep both listeners in the shared startup and shutdown lifecycle.
  server.once("listening", () => {
    if (options.master !== false) masterState.start();
    server.once("close", () => masterState.stop());
    const gateway = require("./mobile-access").startMobileGateway(app, options.mobileOptions);
    server.mobileGateway = gateway;
    if (gateway) server.once("close", () => gateway.close());
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Dad Radar is already running on port ${listenPort}.`
      );
      console.error(
        `Open http://127.0.0.1:${listenPort} or stop the existing service before starting another copy.`
      );
      return;
    }

    console.error(
      "Dad Radar could not start:",
      error
    );
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  PUBLIC_DIRECTORIES,
  masterState
};
