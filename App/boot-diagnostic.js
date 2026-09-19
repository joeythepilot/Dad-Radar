(function installDadRadarBootDiagnostic() {
  "use strict";

  let hasFinished = false;
  let timeoutId = null;

  function fail(message) {
    if (hasFinished) return;
    const status = document.querySelector(".status-message");
    if (status) {
      status.textContent = "STARTUP ERROR · " +
        String(message || "UNKNOWN STARTUP FAILURE").toUpperCase().slice(0, 120);
    }
    document.documentElement.setAttribute("data-dad-radar-boot-error", "true");
  }

  function ready() {
    hasFinished = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }

  window.__dadRadarBoot = {fail, ready};
  window.addEventListener("error", event => {
    if (event.target?.tagName === "SCRIPT") {
      fail("BROWSER BUNDLE DID NOT LOAD");
    } else if (event.message) {
      fail(event.message + (event.lineno ? " AT LINE " + event.lineno : ""));
    }
  }, true);
  window.addEventListener("unhandledrejection", event => {
    fail(event.reason?.message || "UNHANDLED STARTUP FAILURE");
  });
  timeoutId = window.setTimeout(() => {
    const dashboard = document.getElementById("dashboard");
    if (!dashboard || dashboard.hidden) fail("APPLICATION DID NOT START");
  }, 12000);
})();
