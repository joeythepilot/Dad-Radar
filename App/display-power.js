(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarDisplayPower = Object.freeze(api);
  if (root?.document) api.mount({document:root.document});
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {const t=clamp(value);return t*t*(3-2*t);};
  function crtPresentation(snapshot) {
    const p = snapshot.progress;
    if (snapshot.state === "on") return {x:1,y:1,light:1,dot:0,blur:0,raster:0};
    if (snapshot.state === "off") return {x:0,y:0,light:0,dot:0,blur:0,raster:0};
    if (snapshot.reducedMotion) return {x:1,y:1,light:p,dot:0,blur:0,raster:0};
    const x = smooth((p-.08)/.12), y = smooth((p-.18)/.62);
    const light = smooth((p-.16)/.2);
    const dot = p > 0 && p < .18 ? Math.min(1,p/.02)*Math.min(1,(.18-p)/.02)*.8 : 0;
    return {x:Math.max(.002,x),y:Math.max(.003,y),light,dot,
      blur:(1-y)*1.8,raster:snapshot.state==="starting" && p>.18 && p<.65 ? .09 : 0};
  }
  function mount(options) {
    const doc = options.document;
    if (!doc || doc.documentElement.hasAttribute("data-family-full") || /^\/mobile(?:\/|$)/.test(root.location?.pathname || "")) return null;
    if (root.dadRadarDisplayPowerController) return root.dadRadarDisplayPowerController;
    const dashboard=doc.getElementById("dashboard"),shell=doc.getElementById("route-map-shell");
    const transport=shell?.querySelector(".map-roll-transport");
    if (!dashboard || !shell || !transport) return null;
    const link=doc.createElement("link");link.rel="stylesheet";link.href="/UI/display-power.css?v=1";doc.head.appendChild(link);
    const screen=doc.createElement("div");screen.className="power-crt-screen";
    transport.parentNode.insertBefore(screen,transport);screen.appendChild(transport);
    const black=doc.createElement("div");black.className="power-crt-black";shell.appendChild(black);
    const dot=doc.createElement("div");dot.className="power-crt-dot";shell.appendChild(dot);
    const raster=doc.createElement("div");raster.className="power-crt-raster";shell.appendChild(raster);
    [screen,black,dot,raster].forEach(n=>n.setAttribute("aria-hidden","true"));
    screen.removeAttribute("aria-hidden"); // Contains the actual live accessible map.
    const ns="http://www.w3.org/2000/svg",curtain=doc.createElementNS(ns,"svg"),path=doc.createElementNS(ns,"path");
    curtain.classList.add("display-power-curtain");curtain.setAttribute("aria-hidden","true");
    path.setAttribute("fill-rule","evenodd");curtain.appendChild(path);doc.body.appendChild(curtain);
    const button=doc.createElement("button");button.id="display-power-switch";button.type="button";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.4 5.8a8 8 0 1 0 11.2 0"/></svg>';
    doc.body.appendChild(button);
    let controller, lastGeneration=-1;
    function updateCurtain() {
      const w=root.innerWidth,h=root.innerHeight,r=shell.getBoundingClientRect();
      curtain.setAttribute("viewBox",`0 0 ${w} ${h}`);
      let d=`M0 0H${w}V${h}H0Z M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`;
      const badge=doc.querySelector(".sequence-mileage-badge")?.getBoundingClientRect();
      if(badge)d+=` M${badge.left} ${badge.top}H${badge.right}V${badge.bottom}H${badge.left}Z`;
      path.setAttribute("d",controller?.getState()==="off"?`M0 0H${w}V${h}H0Z`:d);
    }
    function failOpen() {
      screen.style.transform="none";screen.style.filter="none";screen.style.opacity="1";
      [black,dot,raster,curtain].forEach(n=>n.style.opacity="0");
      curtain.style.pointerEvents="none";dashboard.inert=false;dashboard.removeAttribute("aria-hidden");
      doc.documentElement.removeAttribute("data-display-power");
    }
    function render(snapshot) {
      try {
        if(snapshot.failed){failOpen();return;}
        const v=crtPresentation(snapshot);
        if(snapshot.generation!==lastGeneration){
          lastGeneration=snapshot.generation;
          if(snapshot.state!=="on")shell.dadRadarMapRoll?.settleForDisplayPower?.();
          updateCurtain();
        }
        doc.documentElement.setAttribute("data-display-power",snapshot.state);
        screen.style.transform=snapshot.state==="on"?"none":`scale(${v.x},${v.y})`;
        // Do not blur the live map's nested SVG filters: that forces huge
        // offscreen surfaces on software/Pi renderers. Focus is expressed by
        // the aperture-local raster/light catch, never by resampling hardware.
        screen.style.opacity=String(v.light);screen.style.filter="none";
        screen.style.visibility=v.light===0?"hidden":"visible";
        black.style.opacity=String(1-v.light);dot.style.opacity=String(v.dot);
        raster.style.opacity=String(v.raster);raster.style.top=`${20+snapshot.progress*65}%`;
        if(snapshot.state==="off")path.setAttribute("d",`M0 0H${root.innerWidth}V${root.innerHeight}H0Z`);
        curtain.style.opacity=String(1-smooth(snapshot.progress));
        curtain.style.pointerEvents=snapshot.state==="on"?"none":"auto";
        dashboard.inert=snapshot.state!=="on";
        if(snapshot.state==="off")dashboard.setAttribute("aria-hidden","true");else dashboard.removeAttribute("aria-hidden");
        button.setAttribute("aria-pressed",String(snapshot.targetOn));
        button.setAttribute("aria-label",snapshot.targetOn?"Turn DadRadar display off":"Turn DadRadar display on");
        button.title=button.getAttribute("aria-label");
        root.dispatchEvent(new root.CustomEvent("dad-radar:display-power-change",{detail:snapshot}));
      } catch(error) {failOpen();throw error;}
    }
    controller=(options.controllerFactory || root.dadRadarDisplayPowerState.createDisplayPowerController)({
      now:()=>root.performance.now(), requestFrame:fn=>root.requestAnimationFrame(fn),
      cancelFrame:id=>root.cancelAnimationFrame(id),reducedMotion:()=>root.matchMedia("(prefers-reduced-motion: reduce)").matches,render
    });
    root.dadRadarDisplayPowerController=controller;
    button.addEventListener("click",()=>controller.setDisplayPower(!controller.getSnapshot().targetOn));
    root.addEventListener("resize",updateCurtain);
    if(root.ResizeObserver)new root.ResizeObserver(updateCurtain).observe(shell);
    updateCurtain();return controller;
  }
  return {crtPresentation,mount};
});
