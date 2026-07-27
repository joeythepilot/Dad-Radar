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
const activeMode = "COMMUTING_TO_BASE";
const flightBoard = document.querySelector(".flight-board");
const mapPanel = document.querySelector(".map-panel");
const instrumentPanel = document.querySelector(".instrument-panel");
const destinationPanel = document.querySelector(".destination-panel");
const dadRadarModes = {
  HOME: {
    status: "HOME",
    flight: null
  },
  COMMUTING_TO_BASE: {
  status: "COMMUTING TO BASE",
  flight: {
    number: "AA 5421",
    origin: "AVL",
    destination: "ORD",
    destinationCity: "CHICAGO",
    airspeed: 430,
    heading: 330,
    altitude: 32000,
    progress: 48,
    eta: "10:18 AM"
  }
},
PRE_FLIGHT: {
  status: "PRE-FLIGHT",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 0,
    heading: 0,
    altitude: 0,
    progress: 0,
    eta: "7:42 PM"
  }
},
BOARDING: {
  status: "BOARDING",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 0,
    heading: 0,
    altitude: 0,
    progress: 0,
    eta: "7:42 PM"
  }
},
TAXI_OUT: {
  status: "TAXI OUT",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 12,
    heading: 270,
    altitude: 680,
    progress: 0,
    eta: "7:42 PM"
  }
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
  },
  APPROACH: {
  status: "APPROACH",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 210,
    heading: 171,
    altitude: 8500,
    progress: 92,
    eta: "7:42 PM"
  }
},
ARRIVED: {
  status: "ARRIVED",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 0,
    heading: 0,
    altitude: 2165,
    progress: 100,
    eta: "ARRIVED"
  }
},
LAYOVER: {
  status: "LAYOVER",
  flight: null
},
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