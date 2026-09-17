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

    const DESIGN_WIDTH = 1500;
    const DESIGN_HEIGHT = 144;
    const PAPER = Object.freeze({left:80, top:18, right:1420, bottom:126});
    const TEXT_BASELINE_OFFSET = -2;
    const SCROLL_SPEED = 48;
    const SCROLL_AXIS = "vertical";
    const LINE_ADVANCE = 48;
    const ITEM_SEPARATOR = " • • ";
    const GLYPH_CHARACTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-,.!?'/•";
    const GLYPH_VARIANTS = 4;
    const GLYPH_CELL_WIDTH = 24;
    const GLYPH_CELL_HEIGHT = 32;
    const GLYPH_COLUMNS = 16;
    const GLYPH_DRAW_WIDTH = 32;
    const GLYPH_DRAW_HEIGHT = 42;
    const GLYPH_ADVANCE = 24;
    const LINE_CHARACTER_LIMIT = Math.floor((PAPER.right - PAPER.left - 64) / GLYPH_ADVANCE);
    const LOOP_GAP = 36;
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
        const verticalNudge = 0;
        const horizontalNudge = 0;
        glyphs.push({
          character, characterIndex, variant: 0, x: cursor,
          yJitter: verticalNudge,
          xJitter: horizontalNudge
        });
        cursor += GLYPH_ADVANCE;
      }
      return {text,glyphs,width:cursor};
    }

    function wrapTickerText(value) {
      const text = normalizeTickerText(value);
      if (!text) return [];
      const words = text.split(" ");
      const lines = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= LINE_CHARACTER_LIMIT) {
          current = candidate;
          continue;
        }
        if (current) lines.push(current);
        current = word;
      }
      if (current) lines.push(current);
      return lines;
    }

    function buildTickerLines(summary) {
      if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
        return wrapTickerText(summary ?? DEFAULT_TEXT);
      }
      const prefix = normalizeTickerText(summary.prefix ?? "");
      const items = (Array.isArray(summary.items) ? summary.items : []).map(normalizeTickerText).filter(Boolean);
      if (!prefix && !items.length) return wrapTickerText(summary.text ?? DEFAULT_TEXT);
      const lines = prefix ? [prefix] : [];
      let row = "";
      for (const item of items) {
        const candidate = row ? `${row}${ITEM_SEPARATOR}${item}` : item;
        if (candidate.length <= LINE_CHARACTER_LIMIT) {
          row = candidate;
          continue;
        }
        if (row) lines.push(row);
        if (item.length <= LINE_CHARACTER_LIMIT) {
          row = item;
          continue;
        }
        const wrapped = wrapTickerText(item);
        lines.push(...wrapped.slice(0, -1));
        row = wrapped.length ? wrapped[wrapped.length - 1] : "";
      }
      if (row) lines.push(row);
      return lines.length ? lines : wrapTickerText(summary.text ?? DEFAULT_TEXT);
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
        const airport=String(layover.airport??"").toUpperCase(); const key=`${dateKey(startOf(layover),options.timeZone)}|${SECB1