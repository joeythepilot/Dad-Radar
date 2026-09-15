(function initializeWeeklyTicker(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarWeeklyTicker = Object.freeze(api);
    if (root.document) api.install(root);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createWeeklyTickerApi() {
    "use strict";

    const DESIGN_WIDTH = 750;
    const DESIGN_HEIGHT = 72;
    const PAPER = Object.freeze({left:52, top:20, right:698, bottom:52});
    const GLYPH_CHARACTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-,.!?'/•";
    const GLYPH_VARIANTS = 4;
    const GLYPH_CELL_WIDTH = 24;
    const GLYPH_CELL_HEIGHT = 32;
    const GLYPH_COLUMNS = 16;
    const GLYPH_ADVANCE = 15;
    const LOOP_GAP = 92;
    const DEFAULT_TEXT = "THIS WEEK: UPDATING SCHEDULE";
    const TRIP_GAP_MS = 20 * 60 * 60 * 1000;
    const DEFAULT_ALIASES = Object.freeze({XNA:"BENTONVILLE, AR"});
    const US = Object.freeze({Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY","District of Columbia":"DC","Puerto Rico":"PR","U.S. Virgin Islands":"VI"});
    const CA = Object.freeze({Alberta:"AB","British Columbia":"BC",Manitoba:"MB","New Brunswick":"NB","Newfoundland and Labrador":"NL","Northwest Territories":"NT","Nova Scotia":"NS",Nunavut:"NU",Ontario:"ON","Prince Edward Island":"PE",Quebec:"QC",Saskatchewan:"SK",Yukon:"YT"});

    function normalizeTickerText(value) {
      let text = String(value ?? DEFAULT_TEXT);
      try { text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (_error) {}
      return text.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toUpperCase();
    }

    function characterHash(character, index) {
      return ((character.charCodeAt(0) || 0) * 31 + index * 17 + 620) >>> 0;
    }

    function buildGlyphRun(value) {
      const text = normalizeTickerText(value);
      const glyphs = [];
      let cursor = 0;
      for (let index = 0; index < text.length; index += 1) {
        const requested = text[index];
        const character = GLYPH_CHARACTERS.includes(requested) ? requested : "?";
        const characterIndex = GLYPH_CHARACTERS.indexOf(character);
        const hash = characterHash(character, index);
        const verticalNudge = ((hash >>> 4) % 13) === 0 ? ((hash & 1) ? 0.35 : -0.35) : 0;
        const horizontalNudge = ((hash >>> 7) % 19) === 0 ? ((hash & 2) ? 0.2 : -0.2) : 0;
        glyphs.push({
          character, characterIndex, variant: hash % GLYPH_VARIANTS, x: cursor,
          yJitter: verticalNudge,
          xJitter: horizontalNudge
        });
        cursor += GLYPH_ADVANCE;
      }
      return {text,glyphs,width:cursor,cycleWidth:Math.max(cursor + LOOP_GAP, PAPER.right - PAPER.left + LOOP_GAP)};
    }

    function toDate(value) {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    function startOf(event) { return toDate(event?.times?.startUtc ?? event?.startUtc); }
    function endOf(event) { return toDate(event?.times?.endUtc ?? event?.endUtc); }
    function usable(event) { return event && event.status !== "cancelled" && startOf(event) && endOf(event); }
    function sorted(events) { return (Array.isArray(events) ? events : []).filter(usable).slice().sort((a,b)=>startOf(a)-startOf(b)); }

    function dateKey(value, timeZone) {
      const date = toDate(value); if (!date) return null;
      const parts = new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
      const get = type => parts.find(part=>part.type===type)?.value ?? "";
      return [get("year"),get("month"),get("day")].join("-");
    }
    function shiftKey(key, days) {
      const match = String(key ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match) return null;
      const date = new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])+Number(days||0),12));
      return [String(date.getUTCFullYear()).padStart(4,"0"),String(date.getUTCMonth()+1).padStart(2,"0"),String(date.getUTCDate()).padStart(2,"0")].join("-");
    }
    function weekBounds(key) {
      const noon = toDate(`${key}T12:00:00.000Z`); if (!noon) return {startKey:key,endKey:key};
      const mondayOffset = (noon.getUTCDay()+6)%7;
      const startKey = shiftKey(key,-mondayOffset);
      return {startKey,endKey:shiftKey(startKey,6)};
    }
    function weekday(value, timeZone) {
      const date = toDate(value); return date ? new Intl.DateTimeFormat("en-US",{timeZone,weekday:"short"}).format(date).toUpperCase() : "---";
    }

    function locationFor(code, options) {
      const normalized = String(code ?? "").trim().toUpperCase();
      const aliases = {...DEFAULT_ALIASES,...(options.locationAliases ?? {})};
      if (aliases[normalized]) return normalizeTickerText(aliases[normalized]);
      const airport = options.airports?.lookupAirport?.(normalized) ?? null;
      if (!airport) return normalized || "DESTINATION";
      const region = airport.countryCode === "US" ? (US[airport.subdivision] ?? airport.subdivision)
        : airport.countryCode === "CA" ? (CA[airport.subdivision] ?? airport.subdivision)
        : (airport.countryCode || airport.subdivision);
      return normalizeTickerText([airport.city || normalized, region].filter(Boolean).join(", "));
    }

    function tripClusters(schedule, options) {
      const events = sorted(schedule?.events).filter(event=>event.kind==="flight" || event.kind==="layover");
      const clusters=[]; let current=[]; let currentEnd=null; let closedAtHome=false;
      const finish=()=>{ if(current.length)clusters.push(current); current=[];currentEnd=null;closedAtHome=false; };
      events.forEach(event=>{
        const start=startOf(event), end=endOf(event);
        if(current.length && (closedAtHome || (currentEnd && start-currentEnd>TRIP_GAP_MS))) finish();
        current.push(event); if(!currentEnd || end>currentEnd)currentEnd=end;
        if(event.kind==="flight" && event.destination===options.homeAirport) closedAtHome=true;
      }); finish();
      return clusters.map(events=>{
        const layovers=events.filter(event=>event.kind==="layover");
        const flights=events.filter(event=>event.kind==="flight");
        const homeFlights=flights.filter(event=>event.destination===options.homeAirport);
        const start=startOf(events[0]); const end=events.reduce((latest,event)=>!latest||endOf(event)>latest?endOf(event):latest,null);
        return {events,layovers,flights,homeFlight:homeFlights.length ? homeFlights[homeFlights.length - 1] : null,start,end,startKey:dateKey(start,options.timeZone),endKey:dateKey(end,options.timeZone)};
      }).filter(trip=>trip.layovers.length>0);
    }

    function tripItems(trip, options) {
      const items=[]; const seen=new Set();
      trip.layovers.forEach(layover=>{
        const airport=String(layover.airport??"").toUpperCase(); const key=`${dateKey(startOf(layover),options.timeZone)}|${airport}`;
        if(!airport || seen.has(key))return; seen.add(key);
        items.push(`${weekday(startOf(layover),options.timeZone)} OVERNIGHT - ${locationFor(airport,options)}`);
      });
      items.push(trip.homeFlight ? `${weekday(endOf(trip.homeFlight),options.timeZone)} - HOME` : "RETURN HOME - TBD");
      return items;
    }

    function buildWeeklyTripTicker(schedule, providedOptions = {}) {
      const options = {
        homeAirport: providedOptions.homeAirport ?? "AVL",
        timeZone: providedOptions.timeZone ?? "America/New_York",
        locationAliases: providedOptions.locationAliases ?? {},
        airports: providedOptions.airports ?? null
      };
      const now=toDate(providedOptions.now)??new Date();
      const todayKey=dateKey(now,options.timeZone), tomorrowKey=shiftKey(todayKey,1), week=weekBounds(todayKey);
      const trips=tripClusters(schedule,options);
      const current=trips.find(trip=>trip.start<=now && now<=trip.end)??null;
      const next=trips.find(trip=>trip.start>now)??null;
      let prefix="THIS WEEK"; let selected=[];
      if(current){prefix="CURRENT TRIP";selected=[current];}
      else if(next && next.startKey===tomorrowKey){prefix="UPCOMING TRIP";selected=[next];}
      else selected=trips.filter(trip=>trip.startKey<=week.endKey && trip.endKey>=week.startKey);
      let items=[]; selected.forEach(trip=>{ items = items.concat(tripItems(trip,options)); });
      if(!items.length){
        const eventsThisWeek=sorted(schedule?.events).filter(event=>{
          const start=dateKey(startOf(event),options.timeZone); const inclusiveEnd=new Date(endOf(event).getTime()-1); const end=dateKey(inclusiveEnd,options.timeZone);
          return start<=week.endKey && end>=week.startKey;
        });
        items=[eventsThisWeek.some(event=>event.kind==="flight") ? "NO OVERNIGHTS" : "HOME ALL WEEK"];
      }
      return {prefix,items,text:`${prefix}: ${items.join(" • ")}`};
    }

    function install(root) {
      const stack = root.document.querySelector(".center-map-stack");
      if (!stack || stack.querySelector("#weekly-trip-ticker-canvas")) return null;

      if (!root.document.querySelector("link[data-dad-radar-weekly-ticker]")) {
        const link=root.document.createElement("link"); link.rel="stylesheet"; link.href="/UI/weekly-ticker-layout.css?v=2"; link.dataset.dadRadarWeeklyTicker="true"; root.document.head.appendChild(link);
      }

      const holder=root.document.createElement("div"); holder.className="weekly-trip-ticker"; holder.id="weekly-trip-ticker";
      const canvas=root.document.createElement("canvas"); canvas.className="weekly-trip-ticker-canvas"; canvas.id="weekly-trip-ticker-canvas";
      canvas.width=DESIGN_WIDTH; canvas.height=DESIGN_HEIGHT; canvas.setAttribute("role","img"); canvas.setAttribute("aria-label",DEFAULT_TEXT);
      holder.appendChild(canvas); stack.appendChild(holder);

      const context=canvas.getContext("2d",{alpha:true}); if(!context)return null;
      const frameImage=new root.Image(), paperImage=new root.Image(), glyphImage=new root.Image();
      frameImage.decoding="async"; paperImage.decoding="async"; glyphImage.decoding="async";
      let run=buildGlyphRun(DEFAULT_TEXT),scrollOffset=0,lastFrameAt=null,animationFrame=null,destroyed=false,lastScheduleFetchAt=0,fetchRequest=null;
      frameImage.src="/assets/ticker/weekly-ticker-frame-v2.png";
      paperImage.src="/assets/ticker/weekly-ticker-paper-v2.png";
      glyphImage.src="/assets/ticker/weekly-ticker-glyphs-v2.png";
      const reducedMotion=()=>root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
      const baseSpeed=21;
      const imageReady=image=>image.complete && Number(image.naturalWidth||image.width)>0;

      function setSummary(summary) {
        const next=normalizeTickerText(summary?.text??summary??DEFAULT_TEXT); if(next===run.text)return;
        run=buildGlyphRun(next);scrollOffset=0;canvas.setAttribute("aria-label",next);
      }
      function drawGlyph(glyph,x,y){if(!imageReady(glyphImage))return;const tile=glyph.characterIndex*GLYPH_VARIANTS+glyph.variant;context.drawImage(glyphImage,(tile%GLYPH_COLUMNS)*GLYPH_CELL_WIDTH,Math.floor(tile/GLYPH_COLUMNS)*GLYPH_CELL_HEIGHT,GLYPH_CELL_WIDTH,GLYPH_CELL_HEIGHT,x+glyph.xJitter,y+glyph.yJitter,GLYPH_CELL_WIDTH,GLYPH_CELL_HEIGHT);}
      function drawRun(startX,y){run.glyphs.forEach(glyph=>drawGlyph(glyph,startX+glyph.x,y));}
      function drawPaper(now){
        if(!imageReady(paperImage))return;
        const width=paperImage.naturalWidth||paperImage.width||1024;
        const height=PAPER.bottom-PAPER.top;
        const travel=reducedMotion()?0:(scrollOffset*0.52);
        const offset=((travel%width)+width)%width;
        const y=PAPER.top+(reducedMotion()?0:Math.sin(now/941)*0.16);
        let x=PAPER.left-offset;
        while(x>PAPER.left)x-=width;
        for(;x<PAPER.right;x+=width)context.drawImage(paperImage,x,y,width,height);
      }
      function render(now){
        if(destroyed)return; if(lastFrameAt===null)lastFrameAt=now; const delta=Math.min(Math.max(now-lastFrameAt,0),80); lastFrameAt=now;
        if(!reducedMotion()){
          const wander=Math.sin(now/1270)*0.017, ripple=Math.sin(now/223)*0.005, phase=now%12100, hitch=phase>5630&&phase<5790?0.82:1;
          scrollOffset += baseSpeed*(1+wander+ripple)*hitch*delta/1000; if(scrollOffset>=run.cycleWidth)scrollOffset%=run.cycleWidth;
        }
        context.clearRect(0,0,DESIGN_WIDTH,DESIGN_HEIGHT);
        context.save();context.beginPath();context.rect(PAPER.left,PAPER.top,PAPER.right-PAPER.left,PAPER.bottom-PAPER.top);context.clip();
        drawPaper(now);
        const micro=reducedMotion()?0:Math.sin(now/509)*0.16; const baseline=PAPER.top+Math.round((PAPER.bottom-PAPER.top-GLYPH_CELL_HEIGHT)/2)+micro; const first=PAPER.left+10-scrollOffset;
        drawRun(first,baseline);drawRun(first+run.cycleWidth,baseline);
        context.restore();
        if(imageReady(frameImage))context.drawImage(frameImage,0,0,DESIGN_WIDTH,DESIGN_HEIGHT);
        animationFrame=root.requestAnimationFrame(render);
      }

      async function refreshSchedule(force=false){
        const now=Date.now(); if(fetchRequest)return fetchRequest; if(!force && now-lastScheduleFetchAt<30000)return null; lastScheduleFetchAt=now;
        fetchRequest=(async()=>{
          try{
            const response=await root.fetch("/api/calendar/upcoming",{cache:"no-store"}); const data=await response.json();
            if(!response.ok || !data?.events)throw new Error("Schedule unavailable");
            setSummary(buildWeeklyTripTicker(data,{homeAirport:root.dadRadarSettings?.homeAirport??"AVL",timeZone:root.dadRadarSettings?.displayTimeZone??"America/New_York",locationAliases:root.dadRadarSettings?.weeklyTicker?.locationAliases??{},airports:root.dadRadarAirports}));
          }catch(_error){}
          finally{fetchRequest=null;}
        })(); return fetchRequest;
      }

      canvas.setAttribute("aria-label",run.text);
      root.addEventListener("dad-radar:calendar-sync",event=>{if(event.detail?.ok)void refreshSchedule(false);});
      void refreshSchedule(true);
      const refreshMs=Math.max(60000,Number(root.dadRadarSettings?.schedule?.refreshIntervalMs)||300000);
      const interval=root.setInterval(()=>void refreshSchedule(true),refreshMs);
      animationFrame=root.requestAnimationFrame(render);

      const controller=Object.freeze({setSummary,refreshSchedule,destroy(){destroyed=true;root.clearInterval(interval);if(animationFrame!==null)root.cancelAnimationFrame(animationFrame);}});
      canvas.dadRadarTicker=controller; return controller;
    }

    return {DESIGN_WIDTH,DESIGN_HEIGHT,PAPER,buildGlyphRun,buildWeeklyTripTicker,install,normalizeTickerText};
  }
);