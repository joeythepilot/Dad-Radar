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
    // Incandescent pools are established before any printing mechanism moves.
    // On shutdown the same separation leaves blanking visible before blackout.
    const start=({paper:.12,instruments:.08,clocks:.12,flaps:.08,weekly:.26,sequence:.12}[kind]??.08)+(kind==="weekly"?index*.02:0);
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
    if (snapshot.state === "on") return {x:1,y:1,light:1,dot:0,blur:0,raster:0,bloom:0};
    if (snapshot.state === "off") return {x:0,y:0,light:0,dot:0,blur:0,raster:0,bloom:0};
    if (snapshot.reducedMotion) return {x:1,y:1,light:p,dot:0,blur:0,raster:0,bloom:0};
    if(snapshot.state==="starting"){
      // Heater warm-up changes phosphor output, never picture dimensions.
      // Deflection is already established when the full-size picture appears.
      const warm=smooth((p-.12)/.34);
      const settling=1-smooth((p-.38)/.24);
      const ripple=warm*settling*.035*Math.sin(snapshot.elapsed/110);
      const bloom=.72*smooth((p-.16)/.07)*(1-smooth((p-.29)/.15));
      return {x:1,y:1,light:clamp(warm+ripple),dot:0,bloom,
        blur:3.2*smooth((p-.14)/.05)*(1-smooth((p-.28)/.18)),
        raster:p>.16&&p<.62?.10*settling:0};
    }
    const x = smooth((p-.12)/.08), y = smooth((p-.21)/.16);
    const light = smooth((p-.16)/.04);
    const dot = p > 0 && p < .18 ? Math.min(1,p/.02)*Math.min(1,(.18-p)/.02)*.8 : 0;
    return {x:Math.max(.002,x),y:Math.max(.003,y),light,dot,
      bloom:0,blur:(1-y)*1.8,raster:snapshot.state==="starting" && p>.18 && p<.62 ? .20*(1-smooth((p-.38)/.24)) : 0};
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
    // SVG use renders the current picture without cloning IDs or resampling
    // the source camera. Deflection belongs to this optical projection alone.
    const ns="http://www.w3.org/2000/svg";
    const projection=doc.createElementNS(ns,"svg");projection.classList.add("power-crt-projection");
    projection.setAttribute("aria-hidden","true");
    const picture=doc.createElementNS(ns,"use");picture.setAttribute("href","#route-map-svg");
    picture.setAttribute("width","100%");picture.setAttribute("height","100%");
    projection.appendChild(picture);shell.appendChild(projection);
    const black=doc.createElement("div");black.className="power-crt-black";shell.appendChild(black);
    const dot=doc.createElement("div");dot.className="power-crt-dot";shell.appendChild(dot);
    const raster=doc.createElement("div");raster.className="power-crt-raster";shell.appendChild(raster);
    const bloom=doc.createElement("div");bloom.className="power-crt-bloom";bloom.setAttribute("aria-hidden","true");shell.appendChild(bloom);
    const glass=doc.createElement("div");glass.className="power-crt-glass";shell.appendChild(glass);
    [screen,black,dot,raster].forEach(n=>n.setAttribute("aria-hidden","true"));
    screen.removeAttribute("aria-hidden"); // Contains the actual live accessible map.
    const curtain=doc.createElementNS(ns,"svg"),path=doc.createElementNS(ns,"path");
    curtain.classList.add("display-power-curtain");curtain.setAttribute("aria-hidden","true");
    path.setAttribute("fill-rule","evenodd");curtain.appendChild(path);doc.body.appendChild(curtain);
    const defs=doc.createElementNS(ns,"defs"),paperSpill=doc.createElementNS(ns,"radialGradient");
    paperSpill.id="power-incandescent-spill";
    Object.entries({cx:"50%",cy:"5%",r:"95%"}).forEach(([k,v])=>paperSpill.setAttribute(k,v));
    [["0%","#ffcf83",".42"],["48%","#e7a54a",".12"],["100%","#dca25d","0"]].forEach(([offset,color,opacity])=>{
      const stop=doc.createElementNS(ns,"stop");stop.setAttribute("offset",offset);stop.setAttribute("stop-color",color);stop.setAttribute("stop-opacity",opacity);paperSpill.appendChild(stop);
    });
    defs.appendChild(paperSpill);curtain.appendChild(defs);
    const local=[];
    [["#flight-number,#flight-origin,#flight-destination,#status-value","flaps"],[".twin-clock-panel","clocks"],
      [".destination-poster-image","paper"],[".daily-schedule-panel","paper"],
      [".instrument","instruments"],[".weekly-overnight-bay","weekly"],
      [".sequence-mileage-badge","sequence"]].forEach(([selector,kind])=>{
      doc.querySelectorAll(selector).forEach((node,index)=>{
        const mask=doc.createElementNS(ns,"rect");mask.classList.add("power-local-dark");
        curtain.appendChild(mask);
        let spill=null;
        if(kind==="paper"){
          spill=doc.createElementNS(ns,"rect");spill.setAttribute("fill","url(#power-incandescent-spill)");
          spill.setAttribute("opacity","0");curtain.appendChild(spill);
        }
        local.push({node,kind,index,mask,spill});
      });
    });
    const needles=new Map(Array.from(doc.querySelectorAll("#airspeed-needle,#altitude-needle,#altitude-thousands-needle,#altitude-ten-thousands-needle,#home-bearing-needle"),node=>[node,{generation:-1,angle:null,from:0}]));
    const clocks=Array.from(doc.querySelectorAll(".drum-clock"));
    function renderMechanical(snapshot){
      clocks.forEach(clock=>root.dadRadarClockDrums.setClockPowerPresentation(clock,snapshot,root.dadRadarPrintedInk));
      doc.querySelector(".weekly-overnight-bank")?.dadRadarWeeklyOvernight?.setPowerPresentation(snapshot);
      local.forEach(entry=>{
        const darkness=1-moduleLight(snapshot,entry.kind,entry.index);
        entry.mask.setAttribute("opacity",String(darkness));
        entry.mask.style.display=darkness===0?"none":"block";
        if(entry.spill)entry.spill.setAttribute("opacity",String(4*darkness*(1-darkness)));
      });
      doc.documentElement.style.setProperty("--power-flap-lamp",String(moduleLight(snapshot,"flaps")));
      doc.documentElement.style.setProperty("--power-clock-lamp",String(moduleLight(snapshot,"clocks")));
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
    // Preload bytes while the display is on; decode after the user's gesture.
    // A failed recording load stays silent and never blocks visual power.
    const sampleBytes=Promise.all(["relay","toggle"].map(async name=>{
      const response=await root.fetch(`/assets/audio/power-${name}.wav`);
      if(!response.ok)throw Error("Power recording unavailable");
      return [name,await response.arrayBuffer()];
    })).catch(()=>[]);
    const powerAudio=root.dadRadarDisplayPowerAudio?.createPowerAudio({
      loadSamples:async context=>Object.fromEntries(await Promise.all((await sampleBytes).map(async([name,bytes])=>[name,await context.decodeAudioData(bytes.slice(0))]))),
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
        Object.entries({x:b.left,y:b.top,width:b.width,height:b.height}).forEach(([key,value])=>{
          entry.mask.setAttribute(key,String(value));entry.spill?.setAttribute(key,String(value));
        });
      });
      const outer=`M0 0H${w}V${h}H0Z`;
      path.setAttribute("d",controller?.getState()==="off"?outer:outer+aperturePath(apertures));
    }
    function failOpen() {
      powerAudio?.stop();
      screen.style.transform="none";screen.style.clipPath="none";screen.style.filter="none";screen.style.opacity="1";
      screen.style.visibility="visible";
      [black,dot,raster,glass,bloom,projection,curtain].forEach(n=>n.style.opacity="0");
      curtain.style.pointerEvents="none";dashboard.inert=false;dashboard.removeAttribute("aria-hidden");
      doc.documentElement.removeAttribute("data-display-power");
      doc.documentElement.style.removeProperty("--power-flap-lamp");
      doc.documentElement.style.removeProperty("--power-clock-lamp");
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
        // Clip the CRT aperture, never scale the live SVG. Its camera and
        // placard sizing read rendered bounds even while the display is dark.
        screen.style.transform="none";
        screen.style.clipPath="none";
        // Do not blur the live map's nested SVG filters: that forces huge
        // offscreen surfaces on software/Pi renderers. Focus is expressed by
        // the aperture-local raster/light catch, never by resampling hardware.
        const ordinary=snapshot.state==="on" || snapshot.reducedMotion || snapshot.state==="starting";
        screen.style.opacity=ordinary?String(v.light):"0";
        screen.style.filter=v.bloom>0?`brightness(${1+v.bloom*.9})`:"none";
        screen.style.visibility="visible"; // Source remains available to SVG use.
        const liveMap=shell.querySelector("#route-map-svg");
        const surface=shell.querySelector(".airport-surface-svg");
        if(surface && shell.classList.contains("is-surface-registered")){
          if(!surface.id)surface.id="power-surface-picture";
          picture.setAttribute("href",`#${surface.id}`);
        }else picture.setAttribute("href","#route-map-svg");
        // The referenced SVG already maps its geographic viewBox into a
        // viewport. The outer optical viewport is pixel-local, not another
        // geographic camera (which would crop the use instance to empty).
        projection.setAttribute("viewBox",`0 0 ${shell.clientWidth} ${shell.clientHeight}`);
        projection.setAttribute("preserveAspectRatio",liveMap?.getAttribute("preserveAspectRatio")||"xMidYMid slice");
        projection.style.transform=`scale(${v.x},${v.y})`;
        projection.style.opacity=ordinary?"0":String(v.light);
        projection.style.filter=`brightness(${1+(1-v.y)*2.2}) saturate(${.8+v.y*.2})`;
        black.style.opacity="0";dot.style.opacity=String(v.dot);
        bloom.style.opacity=String(v.bloom);
        // Focus acts on the already composited, aperture-sized image, avoiding
        // a huge blur/filter surface on the map's geographic SVG layers.
        glass.style.backdropFilter=v.blur>0&&snapshot.state==="starting"?`blur(${v.blur}px)`:"none";
        glass.style.opacity=snapshot.state==="starting"&&v.blur>0?"1":ordinary?"0":String(v.light*.38);
        raster.style.opacity=String(v.raster);raster.style.top=`${(snapshot.progress*2.7%1)*100}%`;
        raster.style.transform=`scaleY(${.8+v.y*1.2})`;
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
    root.addEventListener("dad-radar:power-detent",event=>powerAudio?.mechanicalCue?.(event.detail?.kind));
    root.addEventListener("resize",updateCurtain);
    if(root.ResizeObserver)new root.ResizeObserver(updateCurtain).observe(shell);
    updateCurtain();return controller;
  }
  return {crtPresentation,moduleLight,needlePresentation,apertureContains,aperturePath,mount};
});
