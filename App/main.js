const startupScreen = document.querySelector("#startup-screen");
const dashboard = document.querySelector("#dashboard");
const statusMessage = document.querySelector(".status-message");

window.addEventListener("load", () => {
  setTimeout(() => {
    statusMessage.textContent = "FLIGHT SYSTEMS ONLINE";
  }, 1800);

  setTimeout(() => {
    startupScreen.hidden = true;
    dashboard.hidden = false;
  }, 3000);
});