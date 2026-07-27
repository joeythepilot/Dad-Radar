const startupScreen = document.querySelector("#startup-screen");
const dashboard = document.querySelector("#dashboard");
const statusMessage = document.querySelector(".status-message");

const unitLabel = document.querySelector("#unit-label");
const startupAppName = document.querySelector("#startup-app-name");
const dashboardAppName = document.querySelector("#dashboard-app-name");
const etaZone = document.querySelector("#eta-zone");

const statusValue = document.querySelector("#status-value");
const flightBoardText = document.querySelector("#flight-board-text");
const flightBoardFlight = document.querySelector("#flight-board-flight");
const flightNumber = document.querySelector("#flight-number");
const flightOrigin = document.querySelector("#flight-origin");
const flightDestination = document.querySelector("#flight-destination");
const etaValue = document.querySelector("#eta-value");
const clockValue = document.querySelector("#clock-value");

const airspeedValue = document.querySelector("#airspeed-value");
const headingValue = document.querySelector("#heading-value");
const altitudeValue = document.querySelector("#altitude-value");

const destinationCity = document.querySelector("#destination-city");
const destinationAirport = document.querySelector("#destination-airport");

const mapOrigin = document.querySelector("#map-origin");
const mapDestination = document.querySelector("#map-destination");
const aircraftMarker = document.querySelector(".aircraft-marker");

const mapPanel = document.querySelector(".map-panel");
const instrumentPanel = document.querySelector(".instrument-panel");
const destinationPanel = document.querySelector(".destination-panel");

function renderFlapText(container, text) {
  container.replaceChildren();

  for (const character of text) {
    const flap = document.createElement("span");
    flap.className = "flap-character";
    flap.textContent = character === " " ? "\u00A0" : character;
    container.appendChild(flap);
  }
}
function updateDashboard(state) {
  statusValue.textContent = state.status;

  if (state.flight) {
    mapPanel.hidden = false;
    instrumentPanel.hidden = false;
    destinationPanel.hidden = false;

    flightBoardFlight.hidden = false;
flightBoardText.hidden = true;

renderFlapText(flightNumber, state.flight.number);
renderFlapText(flightOrigin, state.flight.origin);
renderFlapText(flightDestination, state.flight.destination);

    airspeedValue.textContent = state.flight.airspeed;
    headingValue.textContent = state.flight.heading;
    altitudeValue.textContent = state.flight.altitude.toLocaleString();

    etaValue.textContent = state.flight.eta;

    destinationCity.textContent = state.flight.destinationCity;
    destinationAirport.textContent = state.flight.destination;

    mapOrigin.textContent = state.flight.origin;
    mapDestination.textContent = state.flight.destination;
    aircraftMarker.style.left = `${state.flight.progress}%`;
  } else {
    mapPanel.hidden = true;
    instrumentPanel.hidden = true;
    destinationPanel.hidden = true;

    flightBoardFlight.hidden = true;
    flightBoardText.hidden = false;

    flightBoardText.textContent =
      state.message ?? "NO ACTIVE FLIGHT";

    airspeedValue.textContent = "---";
    headingValue.textContent = "---";
    altitudeValue.textContent = "-----";
    etaValue.textContent = "--:--";
  }
}

function updateClock() {
  const currentTime = new Intl.DateTimeFormat("en-US", {
    timeZone: dadRadarSettings.displayTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date());

  clockValue.textContent = currentTime;
}

const modeShortcuts = {
  "1": "HOME",
  "2": "COMMUTING_TO_BASE",
  "3": "PRE_FLIGHT",
  "4": "BOARDING",
  "5": "TAXI_OUT",
  "6": "EN_ROUTE",
  "7": "APPROACH",
  "8": "DIVERTED",
  "9": "ARRIVED",
  "0": "LAYOVER",
  "-": "COMMUTING_HOME",
  "=": "OFFLINE"
};

window.addEventListener("dad-radar:state-change", (event) => {
  updateDashboard(event.detail.state);
});

window.addEventListener("keydown", (event) => {
  const nextMode = modeShortcuts[event.key];

  if (!nextMode) {
    return;
  }

  setDadRadarMode(nextMode);

  console.log(`Dad Radar mode: ${nextMode}`);
});

updateClock();
window.setInterval(updateClock, 1000);
unitLabel.textContent = dadRadarSettings.unitLabel;
startupAppName.textContent = dadRadarSettings.appName;
dashboardAppName.textContent = dadRadarSettings.appName;
etaZone.textContent = dadRadarSettings.displayTimeZoneLabel;

updateDashboard(dadRadarState);
setTimeout(() => {
  statusMessage.textContent = "FLIGHT SYSTEMS ONLINE";
}, dadRadarSettings.startup.systemsOnlineDelayMs);

setTimeout(() => {
  startupScreen.hidden = true;
  dashboard.hidden = false;
}, dadRadarSettings.startup.dashboardDelayMs);

if (dadRadarSettings.developerMode) {
  startMockFlightService();
}