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

const dadRadarState = {
  status: "EN ROUTE",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL",
    destinationCity: "ASHEVILLE",
    airspeed: 438,
    heading: 171,
    altitude: 34000
  }
};

function updateDashboard(state) {
  statusValue.textContent = state.status;

  if (state.flight) {
    flightBoardText.textContent =
      `${state.flight.number}  ${state.flight.origin} → ${state.flight.destination}`;

    airspeedValue.textContent = state.flight.airspeed;
    headingValue.textContent = state.flight.heading;
    altitudeValue.textContent = state.flight.altitude.toLocaleString();
destinationCity.textContent = state.flight.destinationCity;
destinationAirport.textContent = state.flight.destination;  
} else {
    flightBoardText.textContent = "NO ACTIVE FLIGHT";

    airspeedValue.textContent = "---";
    headingValue.textContent = "---";
    altitudeValue.textContent = "-----";
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