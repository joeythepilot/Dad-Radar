const statusMessage = document.querySelector(".status-message");

window.addEventListener("load", () => {
  setTimeout(() => {
    statusMessage.textContent = "FLIGHT SYSTEMS ONLINE";
  }, 2500);
});