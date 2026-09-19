"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ticker = require("./weekly-ticker");
const airportCatalog = require("../data/airport-catalog");

assert.equal(ticker.normalizeTickerText("  Upcoming Trip — Montréal  "),"UPCOMING TRIP - MONTREAL");
assert.deepEqual(
  {
    width:ticker.DESIGN_WIDTH,
    height:ticker.DESIGN_HEIGHT,
    paper:ticker.PAPER,
    textBaselineOffset:ticker.TEXT_BASELINE_OFFSET,
    scrollSpeed:ticker.SCROLL_SPEED,
    scrollAxis:ticker.SCROLL_AXIS,
    lineAdvance:ticker.LINE_ADVANCE,
    feedStep:ticker.FEED_STEP_PX,
    feedCycle:ticker.FEED_CYCLE_MS,
    feedMove:ticker.FEED_MOVE_MS,
    feedDirection:ticker.FEED_DIRECTION,
    itemSeparator:ticker.ITEM_SEPARATOR,
    glyphDrawWidth:ticker.GLYPH_DRAW_WIDTH,
    glyphDrawHeight:ticker.GLYPH_DRAW_HEIGHT,
    glyphAdvance:ticker.GLYPH_ADVANCE
  },
  {
    width:1500,
    height:144,
    paper:{left:80,top:18,right:1420,bottom:126},
    textBaselineOffset:-2,
    scrollSpeed:0,
    scrollAxis:"vertical",
    lineAdvance:48,
    feedStep:16,
    feedCycle:2200,
    feedMove:460,
    feedDirection:"up",
    itemSeparator:" • ",
    glyphDrawWidth:32,
    glyphDrawHeight:42,
    glyphAdvance:24
  },
  "Ticker remains a map-width stepped paper transport while using compact weekly separators."
);
assert((ticker.PAPER.right-ticker.PAPER.left)/ticker.DESIGN_WIDTH >= 0.85,
  "Paper occupies nearly the full width of the visible mechanism.");
const mechanismAsset=path.join(__dirname,"..","assets","ticker","weekly-ticker-mechanism-v11.png");
assert(fs.existsSync(mechanismAsset),"Photographic internal mechanism artwork is present.");
assert(fs.statSync(mechanismAsset).size>10000,"Mechanism artwork is a real raster asset, not a placeholder.");
assert(ticker.FEED_MOVE_MS<ticker.FEED_CYCLE_MS/2,"Paper advances in a short motorized movement followed by a longer readable pause.");

const first=ticker.buildGlyphRun("WEEK AHEAD: TUE - MADISON, WI");
const second=ticker.buildGlyphRun("WEEK AHEAD: TUE - MADISON, WI");
assert.deepEqual(first.glyphs,second.glyphs,"Typewriter imperfections stay deterministic across refreshes.");
assert(first.glyphs.every(g=>g.yJitter===0 && g.xJitter===0),
  "Typewriter baseline stays steady instead of wobbling like cartoon lettering.");
assert(first.glyphs.every(g=>g.variant===0),
  "Ticker uses one restrained typewriter impression instead of erratic per-letter variants.");
assert(first.glyphs.every((g,index)=>index===0 || g.x-first.glyphs[index-1].x===24),
  "Larger type keeps a steady proportional character advance.");

function flight(id,origin,destination,startUtc,endUtc,overrides={}){return{id,kind:"flight",status:"confirmed",origin,destination,times:{startUtc,endUtc},...overrides};}
function layover(id,airport,startUtc,endUtc){return{id,kind:"layover",status:"confirmed",airport,times:{startUtc,endUtc}};}
const schedule={events:[
  flight("tue-commute","AVL","ORD","2026-09-15T11:00:00Z","2026-09-15T13:00:00Z",{isCommute:true,flightNumber:"AA3963"}),
  flight("tue-msn","ORD","MSN","2026-09-15T15:00:00Z","2026-09-15T17:00:00Z",{flightNumber:"3917"}),
  layover("msn-night","MSN","2026-09-15T17:00:00Z","2026-09-16T11:00:00Z"),
  flight("wed-ord","MSN","ORD","2026-09-16T11:30:00Z","2026-09-16T13:00:00Z"),
  flight("wed-hpn","ORD","HPN","2026-09-16T15:00:00Z","2026-09-16T17:00:00Z"),
  layover("hpn-night","HPN","2026-09-16T17:00:00Z","2026-09-17T11:00:00Z"),
  flight("thu-ord","HPN","ORD","2026-09-17T11:30:00Z","2026-09-17T13:00:00Z"),
  flight("thu-xna","ORD","XNA","2026-09-17T15:00:00Z","2026-09-17T17:00:00Z"),
  layover("xna-night","XNA","2026-09-17T17:00:00Z","2026-09-18T11:00:00Z"),
  flight("fri-ord","XNA","ORD","2026-09-18T11:30:00Z","2026-09-18T13:00:00Z"),
  flight("fri-home","ORD","AVL","2026-09-18T17:00:00Z","2026-09-18T19:00:00Z",{isCommute:true})
]};
const options={homeAirport:"AVL",timeZone:"America/New_York",airports:airportCatalog};
const upcoming=ticker.buildWeeklyTripTicker(schedule,{...options,now:"2026-09-14T16:00:00Z"});
assert.equal(upcoming.prefix,"UPCOMING TRIP");
assert.equal(upcoming.text,"UPCOMING TRIP: TUE - MADISON, WI • WED - WHITE PLAINS, NY • THU - BENTONVILLE, AR • FRI - HOME 3:00 PM");
assert(!upcoming.text.includes("AA3963") && !upcoming.text.includes("3917"),
  "Weekly overview never repeats granular flight numbers already shown in Today's Duty.");
assert(!upcoming.text.includes("AVL - ORD") && !upcoming.text.includes("ORD - MSN"),
  "Weekly overview summarizes overnight location rather than repeating individual legs.");

const upcomingLines=ticker.buildTickerLines(upcoming);
assert.deepEqual(upcomingLines,[
  "UPCOMING TRIP",
  "TUE - MADISON, WI • WED - WHITE PLAINS, NY",
  "THU - BENTONVILLE, AR • FRI - HOME 3:00 PM"
],"Trip overview packs multiple overnight markers across the full paper width and highlights the return-home time.");
assert(upcomingLines.every(line=>line.length<=ticker.LINE_CHARACTER_LIMIT),
  "Every vertical-feed line fits the paper width without horizontal scrolling.");
assert.equal(ticker.buildWeeklyTripTicker(schedule,{...options,now:"2026-09-16T18:00:00Z"}).prefix,"CURRENT TRIP");

const weekSchedule={events:[
  flight("wed-out","AVL","MSN","2026-09-16T15:00:00Z","2026-09-16T17:00:00Z"),
  layover("wed-night","MSN","2026-09-16T17:00:00Z","2026-09-17T11:00:00Z"),
  flight("thu-home","MSN","AVL","2026-09-17T17:00:00Z","2026-09-17T19:00:00Z")
]};
const weekAhead=ticker.buildWeeklyTripTicker(weekSchedule,{...options,now:"2026-09-14T16:00:00Z"});
assert.equal(weekAhead.prefix,"WEEK AHEAD");
assert.deepEqual(weekAhead.items,[
  "MON - HOME",
  "TUE - HOME",
  "WED - MADISON, WI",
  "THU - HOME 3:00 PM",
  "FRI - HOME",
  "SAT - HOME",
  "SUN - HOME"
],"Week-ahead mode explicitly shows where the family can expect Dad to overnight each day.");

const rollingWeekSchedule={events:[
  flight("sun-base","AVL","ORD","2026-09-20T13:00:00Z","2026-09-20T15:00:00Z",{isCommute:true}),
  layover("sun-ord-night","ORD","2026-09-20T15:00:00Z","2026-09-21T12:00:00Z"),
  flight("mon-xna","ORD","XNA","2026-09-21T13:00:00Z","2026-09-21T15:00:00Z"),
  layover("mon-xna-night","XNA","2026-09-21T15:00:00Z","2026-09-22T11:00:00Z"),
  flight("tue-ord","XNA","ORD","2026-09-22T11:30:00Z","2026-09-22T13:00:00Z"),
  flight("tue-home","ORD","AVL","2026-09-22T17:00:00Z","2026-09-22T19:00:00Z",{isCommute:true})
]};
const rollingWeek=ticker.buildWeeklyTripTicker(rollingWeekSchedule,{...options,now:"2026-09-17T16:00:00Z"});
assert.equal(rollingWeek.prefix,"WEEK AHEAD");
assert.deepEqual(rollingWeek.items,[
  "THU - HOME",
  "FRI - HOME",
  "SAT - HOME",
  "SUN - CHICAGO, IL",
  "MON - BENTONVILLE, AR",
  "TUE - HOME 3:00 PM",
  "WED - HOME"
],"Week-ahead mode is a rolling seven-day family forecast and must not stop at the calendar-week Sunday boundary.");

const spilloverSchedule={events:[
  flight("wed-base","AVL","ORD","2026-09-23T13:00:00Z","2026-09-23T15:00:00Z",{isCommute:true}),
  layover("wed-ord-night","ORD","2026-09-23T15:00:00Z","2026-09-24T12:00:00Z"),
  flight("thu-dfw","ORD","DFW","2026-09-24T13:00:00Z","2026-09-24T16:00:00Z"),
  layover("thu-dfw-night","DFW","2026-09-24T16:00:00Z","2026-09-25T11:00:00Z"),
  flight("fri-ord","DFW","ORD","2026-09-25T11:30:00Z","2026-09-25T14:00:00Z"),
  flight("fri-home","ORD","AVL","2026-09-25T17:00:00Z","2026-09-25T19:00:00Z",{isCommute:true})
]};
const spillover=ticker.buildWeeklyTripTicker(spilloverSchedule,{...options,now:"2026-09-17T16:00:00Z"});
assert.deepEqual(spillover.items.slice(-3),[
  "WED - CHICAGO, IL",
  "THU - DALLAS-FORT WORTH, TX",
  "FRI - HOME 3:00 PM"
],"A trip that begins inside the rolling horizon remains visible through the actual return home instead of being clipped on day seven.");

assert.equal(ticker.buildWeeklyTripTicker({events:[]},{...options,now:"2026-09-14T16:00:00Z"}).text,"WEEK AHEAD: HOME ALL WEEK");
assert.equal(ticker.buildWeeklyTripTicker({events:[flight("out","AVL","ORD","2026-09-14T12:00:00Z","2026-09-14T14:00:00Z"),flight("home","ORD","AVL","2026-09-14T20:00:00Z","2026-09-14T22:00:00Z")]},{...options,now:"2026-09-14T16:00:00Z"}).text,"WEEK AHEAD: HOME EACH NIGHT");

const overnightAsset=path.join(__dirname,"..","assets","hardware","weekly-overnight","weekly-overnight-module.png");
assert(fs.existsSync(overnightAsset),"Reusable weekly overnight module artwork is present.");
const overnightPng=fs.readFileSync(overnightAsset);
assert.equal(overnightPng.readUInt32BE(16),149,"Weekly overnight module production width is exactly 149 px.");
assert.equal(overnightPng.readUInt32BE(20),122,"Weekly overnight module production height is exactly 122 px.");
assert.equal(ticker.OVERNIGHT_MODULE_COUNT,7,"Weekly overnight bank has seven equal bays.");
assert.equal(ticker.OPERATIONAL_DAY_ROLLOVER_HOUR,6,"Weekly overnight bank rolls to a new day at 06:00 local display time.");

assert.equal(
  ticker.operationalDateKey("2026-09-15T09:30:00Z","America/New_York"),
  "2026-09-14",
  "05:30 local remains part of the prior operational day."
);
assert.equal(
  ticker.operationalDateKey("2026-09-15T10:01:00Z","America/New_York"),
  "2026-09-15",
  "06:01 local advances to the new operational day."
);

const overnightBank=ticker.buildWeeklyOvernightModules({events:[
  layover("late-ord","ORD","2026-09-15T05:00:00Z","2026-09-15T12:00:00Z"),
  layover("tue-dfw","DFW","2026-09-16T01:00:00Z","2026-09-16T12:00:00Z")
]},{
  homeAirport:"AVL",
  timeZone:"America/New_York",
  now:"2026-09-14T16:00:00Z"
});
assert.deepEqual(
  overnightBank.map(module=>[module.day,module.code,module.characters.join("")]),
  [
    ["MON","ORD","ORD "],
    ["TUE","DFW","DFW "],
    ["WED","HOME","HOME"],
    ["THU","HOME","HOME"],
    ["FRI","HOME","HOME"],
    ["SAT","HOME","HOME"],
    ["SUN","HOME","HOME"]
  ],
  "Seven-bay bank shows the overnight airport on the operational day and HOME elsewhere."
);

const rolloverBefore=ticker.buildWeeklyOvernightModules({events:[]},{
  homeAirport:"AVL",timeZone:"America/New_York",now:"2026-09-15T09:59:00Z"
});
const rolloverAfter=ticker.buildWeeklyOvernightModules({events:[]},{
  homeAirport:"AVL",timeZone:"America/New_York",now:"2026-09-15T10:01:00Z"
});
assert.equal(rolloverBefore[0].day,"MON","At 05:59 local the far-left bay still shows Monday.");
assert.equal(rolloverAfter[0].day,"TUE","After 06:00 local the far-left bay advances to Tuesday.");

console.log("Weekly ticker family overview contract tests passed: overnights, return-home time, rolling horizon spillover, 6am operational-day rollover, and no duplicated daily flight detail.");