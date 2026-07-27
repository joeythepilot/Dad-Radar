const startupScreen = document.querySelector("#startup-screen");
const dashboard = document.querySelector("#dashboard");
const statusMessage = document.querySelector(".status-message");

const statusValue = document.querySelector("#status-value");
const flightBoardText = document.querySelector("#flight-board-text");

const airspeedValue = document.querySelector("#airspeed-value");
const headingValue = document.querySelector("#heading-value");
const altitudeValue = document.querySelector("#altitude-value");
const destinationCity = document.querySelector("#destination-city");
const destinationAirport = document.querySelector("#destination-airport");
const etaValue = document.querySelector("#eta-value");
const mapOrigin = document.querySelector("#map-origin");
const mapDestination = document.querySelector("#map-destination");
const aircraftMarker = document.querySelector(".aircraft-marker");
const activeMode = "HOME";
const flightBoard = document.querySelector(".flight-board");
const mapPanel = document.querySelector(".map-panel");
const instrumentPanel = document.querySelector(".instrument-panel");
const destinationPanel = document.querySelector(".destination-panel");
const dadRadarModes = {
  HOME: {
    status: "HOME",
    flight: null
  },

  EN_ROUTE: {
    status: "ENROUTE",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 438,
      heading: 171,
      altitude: 34000,
      progress: 62,
      eta: "7:42 PM"
    }
  }
};

const dadRadarState = dadRadarModes[activeMode];

function updateDashboard(state) {
  statusValue.textContent = state.status;

  if (state.flight) {
    mapPanel.hidden = false;
instrumentPanel.hidden = false;
destinationPanel.hidden = false;
    flightBoardText.textContent =
      `${state.flight.number}  ${state.flight.origin} → ${state.flight.destination}`;

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
    flightBoardText.textContent = "NO ACTIVE FLIGHT";

    airspeedValue.textContent = "---";
    headingValue.textContent = "---";
    altitudeValue.textContent = "-----";
    etaValue.textContent = "--:--";
  }
}

window.addEventListener("load", () => {
  updateDashboard(dadRadarState);

  setTimeout(() => {
    statusMessage.textContent = "FLIGHT SYSTEMS ONLINE";
  }, 1800);

  setTimeout(() => {
    startupScreen.hidden = true;
    dashboard.hidden = false;
  }, 3000);
});