(function dadRadarCrtMapStartup(root) {
  "use strict";
  const DURATION_MS = 3850;
  let timer = null;

  function ensureOverlay(shell) {
    let mask = shell.querySelector(".crt-boot-mask");
    if (mask) return mask;
    mask = document.createElement("div");
    mask.className = "crt-boot-mask";
    mask.setAttribute("aria-hidden", "true");
    mask.innerHTML = '<span class="crt-boot-phosphor"></span><span class="crt-boot-scan"></span><span class="crt-boot-raster"></span>';
    shell.appendChild(mask);
    return mask;
  }

  function play() {
    const shell = document.getElementById("route-map-shell");
    if (!shell) return false;
    ensureOverlay(shell);
    if (timer) root.clearTimeout(timer);
    shell.classList.remove("crt-booting");
    void shell.offsetWidth;
    shell.classList.add("crt-booting");
    timer = root.setTimeout(() => {
      shell.classList.remove("crt-booting");
      timer = null;
    }, DURATION_MS + 80);
    return true;
  }

  function startWhenVisible() {
    const dashboard = document.getElementById("dashboard");
    const shell = document.getElementById("route-map-shell");
    if (!dashboard || !shell) return;
    ensureOverlay(shell);
    const wait = () => {
      if (!dashboard.hidden) play();
      else root.requestAnimationFrame(wait);
    };
    root.requestAnimationFrame(wait);
  }

  root.dadRadarCrtMapStartup = Object.freeze({play, durationMs:DURATION_MS});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startWhenVisible, {once:true});
  else startWhenVisible();
})(globalThis);
