const startupScreen = document.querySelector("#startup-screen");
const dashboard = document.querySelector("#dashboard");
const statusMessage = document.querySelector(".status-message");
const statusValue = document.querySelector("#status-value");
const flightBoardText = document.querySelector("#flight-board-text");

const dadRadarState = {
  status: "EN ROUTE",
  flight: {
    number: "AA 1234",
    origin: "ORD",
    destination: "AVL"
  }
};

function updateDashboard(state) {
  statusValue.textContent = state.status;

  if (state.flight) {
    flightBoardText.textContent =
      `${state.flight.number}  ${state.flight.origin} → ${state.flight.destination}`;
  } else {
    flightBoardText.textContent = "NO ACTIVE FLIGHT";
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