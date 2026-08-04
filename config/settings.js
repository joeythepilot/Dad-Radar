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
    preFlightLeadMinutes: 45,
    arrivedHoldMinutes: 45
  },

  flightData: {
    enabled: true,
    refreshIntervalMs: 60 * 1000,
    staleAfterMs: 3 * 60 * 1000
  },

  developerMode: true
};
