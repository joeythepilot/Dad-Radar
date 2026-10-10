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
  const REVEAL={paper:.14,instruments:.22,clocks:.30,flaps:.34,weekly:.42,sequence:.42};
  function apertureContains(rectangles,point){return rectangles.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom);}
  function aperturePath(rectangles){
    // Disjoint row spans describe the union. Simply appending overlapping
    // rectangles under even-odd fill would black out their intersection.
    const xs=[...new Set(rectangles.flatMap(r=>[r.left,r.right]))].sort((a,b)=>a-b);
    const ys=[...new Set(rectangles.flatMap(r=>[r.top,r.bottom]))].sort((a,b)=>a-b);
    let d="";
    for(let j=0;j<ys.length-1;j++){
      let left=null;
      for(let i=0;i<xs.length;i++){
        const inside=i<xs.length-1&&apertureContains(rectangles,{x:(xs[i]+xs[i+1])/2,y:(ys[j]+ys[j+1])/2});
        if(inside&&left===null)left=xs[i];
        if(!inside&&left!==null){d+=` M${left} ${ys[j]}H${xs[i]}V${ys[j+1]}H${left}Z`;left=null;}
      }
    }
    return d;
  }
  function moduleLight(snapshot,kind,index=0) {
    if(snapshot.failed || snapshot.state==="on")return 1;
    if(snapshot.state==="off")return 0;
    if(snapshot.reducedMotion)return smooth(snapshot.progress);
    const start=(REVEAL[kind]??.34)+(kind==="weekly"?index*.02:0);
    return smooth((snapshot.progress-start)/.10);
  }
  function needlePresentation(snapshot,liveAngle) {
    if(snapshot.failed || snapshot.state==="on" || snapshot.reducedMotion)return liveAngle;
    if(snapshot.state==="off")return 0;
    const t=clamp((snapshot.progress-.22)/.32);
    if(snapshot.state==="stopping")return liveAngle*smooth(t);
    return t<.5?180*smooth(t*2):180+(liveAngle-180)*smooth((t-.5)*2);
  }
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
    const local=[];
    [[".flight-board","flaps"],[".twin-clock-panel","clocks"],
      [".destination-poster-image","paper"],[".daily-schedule-panel","paper"],
      [".instrument","instruments"],[".weekly-overnight-bay","weekly"],
      [".sequence-mileage-badge","sequence"]].forEach(([selector,kind])=>{
      doc.querySelectorAll(selector).forEach((node,index)=>{
        const mask=doc.createElementNS(ns,"rect");mask.classList.add("power-local-dark");
        curtain.appendChild(mask);local.push({node,kind,index,mask});
      });
    });
    const needles=new Map(Array.from(doc.querySelectorAll("#airspeed-needle,#altitude-needle,#altitude-thousands-needle,#altitude-ten-thousands-needle,#home-bearing-needle"),node=>[node,{generation:-1,angle:null,from:0}]));
    const clocks=Array.from(doc.querySelectorAll(".drum-clock"));
    function renderMechanical(snapshot){
      clocks.forEach(clock=>root.dadRadarClockDrums.setClockPowerPresentation(clock,snapshot,root.dadRadarPrintedInk));
      doc.querySelector(".weekly-overnight-bank")?.dadRadarWeeklyOvernight?.setPowerPresentation(snapshot);
      local.forEach(entry=>entry.mask.style.opacity=String(1-moduleLight(snapshot,entry.kind,entry.index)));
      doc.documentElement.style.setProperty("--power-flap-lamp",String(moduleLight(snapshot,"flaps")));
      needles.forEach((presentation,node)=>{
        const liveAngle=Number(/rotate\((-?[\d.]+)deg\)/.exec(node.style.transform)?.[1]||0);
        if(snapshot.state==="on" || snapshot.failed || snapshot.reducedMotion){node.style.removeProperty("rotate");presentation.angle=null;return;}
        if(presentation.generation!==snapshot.generation){presentation.generation=snapshot.generation;presentation.from=presentation.angle??liveAngle;}
        const target=needlePresentation(snapshot,liveAngle);
        const catchup=smooth(snapshot.elapsed/180);
        presentation.angle=presentation.from+(target-presentation.from)*catchup;
        // CSS rotate is independent of the live transform. Tracking continues
        // updating that transform; clearing this additive presentation exposes
        // the newest reading, without ever feeding a sweep into telemetry.
        node.style.rotate=`${presentation.angle-liveAngle}deg`;
      });
    }
    const button=doc.createElement("button");button.id="display-power-switch";button.type="button";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.4 5.8a8 8 0 1 0 11.2 0"/></svg>';
    doc.body.appendChild(button);
    const powerAudio=root.dadRadarDisplayPowerAudio?.createPowerAudio({
      audioContextFactory:()=>new (root.AudioContext||root.webkitAudioContext)(),
      volume:root.dadRadarSettings?.audio?.splitFlap?.volume??.25,
      isEnabled:()=>root.dadRadarSettings?.audio?.splitFlap?.enabled!==false
    });
    let controller, lastGeneration=-1,lastState="on";
    function updateCurtain() {
      const w=root.innerWidth,h=root.innerHeight,r=shell.getBoundingClientRect();
      curtain.setAttribute("viewBox",`0 0 ${w} ${h}`);
      const apertures=[r];
      local.forEach(entry=>{
        const b=entry.node.getBoundingClientRect();
        apertures.push(b);
        Object.entries({x:b.left,y:b.top,width:b.width,height:b.height}).forEach(([key,value])=>entry.mask.setAttribute(key,String(value)));
      });
      const outer=`M0 0H${w}V${h}H0Z`;
      path.setAttribute("d",controller?.getState()==="off"?outer:outer+aperturePath(apertures));
    }
    function failOpen() {
      powerAudio?.stop();
      screen.style.transform="none";screen.style.filter="none";screen.style.opacity="1";
      screen.style.visibility="visible";
      [black,dot,raster,curtain].forEach(n=>n.style.opacity="0");
      curtain.style.pointerEvents="none";dashboard.inert=false;dashboard.removeAttribute("aria-hidden");
      doc.documentElement.removeAttribute("data-display-power");
      doc.documentElement.style.removeProperty("--power-flap-lamp");
      clocks.forEach(clock=>root.dadRadarClockDrums.clearClockPowerPresentation(clock,root.dadRadarPrintedInk));
      doc.querySelector(".weekly-overnight-bank")?.dadRadarWeeklyOvernight?.clearPowerPresentation();
      needles.forEach((_,node)=>node.style.removeProperty("rotate"));
      root.dispatchEvent(new root.CustomEvent("dad-radar:display-power-change",{detail:{state:"on",progress:1,failed:true}}));
    }
    function render(snapshot) {
      try {
        if(snapshot.failed){failOpen();return;}
        const v=crtPresentation(snapshot);
        if(snapshot.generation!==lastGeneration){
          lastGeneration=snapshot.generation;
          if(snapshot.state!=="on")root.dadRadarStopLocalOperationalAudio?.();
          if(snapshot.state!=="on")shell.dadRadarMapRoll?.settleForDisplayPower?.();
          updateCurtain();
        }
        if(snapshot.state==="off" && lastState!=="off")root.dadRadarStopLocalOperationalAudio?.();
        lastState=snapshot.state;powerAudio?.apply(snapshot);
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
        curtain.style.opacity=snapshot.state==="on"?"0":"1";
        curtain.style.pointerEvents=snapshot.state==="on"?"none":"auto";
        dashboard.inert=snapshot.state!=="on";
        if(snapshot.state==="off")dashboard.setAttribute("aria-hidden","true");else dashboard.removeAttribute("aria-hidden");
        button.setAttribute("aria-pressed",String(snapshot.targetOn));
        button.setAttribute("aria-label",snapshot.targetOn?"Turn DadRadar display off":"Turn DadRadar display on");
        button.title=button.getAttribute("aria-label");
        root.dispatchEvent(new root.CustomEvent("dad-radar:display-power-change",{detail:snapshot}));
        renderMechanical(snapshot);
      } catch(error) {failOpen();throw error;}
    }
    controller=(options.controllerFactory || root.dadRadarDisplayPowerState.createDisplayPowerController)({
      now:()=>root.performance.now(), requestFrame:fn=>root.requestAnimationFrame(fn),
      cancelFrame:id=>root.cancelAnimationFrame(id),reducedMotion:()=>root.matchMedia("(prefers-reduced-motion: reduce)").matches,render
    });
    root.dadRadarDisplayPowerController=controller;
    button.addEventListener("click",()=>{
      void powerAudio?.unlock();
      controller.setDisplayPower(!controller.getSnapshot().targetOn);
    });
    root.addEventListener("resize",updateCurtain);
    if(root.ResizeObserver)new root.ResizeObserver(updateCurtain).observe(shell);
    updateCurtain();return controller;
  }
  return {crtPresentation,moduleLight,needlePresentation,apertureContains,aperturePath,mount};
});
