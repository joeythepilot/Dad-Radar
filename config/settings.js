const dadRadarSettings = {
  appName: "DAD RADAR",
  unitLabel: "FLIGHT OPERATIONS UNIT NO. 001",

  homeAirport: "AVL",
  homeCity: "ASHEVILLE",
  baseAirport: "ORD",

  displayTimeZone: "America/New_York",
  displayTimeZoneLabel: "EASTERN TIME",

  startup: {
    systemsOnlineDelayMs: 1800,
    dashboardDelayMs: 3000
  },

  schedule: {
    dataSource: "calendar",
    lookAheadDays: 14,
    refreshIntervalMs: 5 * 60 * 1000,
    stateCheckIntervalMs: 30 * 1000,
    boardingLeadMinutes: 30,
    delayGraceMinutes: 5,
    legLockTimeoutMinutes: 8 * 60,
    arrivedHoldMinutes: 45
  },

  flightData: {
    enabled: true,
    provider: "flightradar24",
    acquisitionLeadMinutes: 30,
    refreshIntervalMs: 60 * 1000,
    staleAfterMs: 3 * 60 * 1000,
    visualInterpolationMs: 52 * 1000
  },

  audio: {
    splitFlap: {
      enabled: true,
      source:
        "./assets/audio/split-flap.mp3",
      cueSeconds: 5.195,
      fadeOutMs: 260,
      volume: 0.68
    }
  },

  developerMode: true
};
