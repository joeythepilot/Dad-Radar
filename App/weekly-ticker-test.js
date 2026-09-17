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

assert.equal(ticker.buildWeeklyTripTicker({events:[]},{...options,now:"2026-09-14T16:00:00Z"}).text,"WEEK AHEAD: HOME ALL WEEK");
assert.equal(ticker.buildWeeklyTripTicker({events:[flight("out","AVL","ORD","2026-09-14T12:00:00Z","2026-09-14T14:00:00Z"),flight("home","ORD","AVL","2026-09-14T20:00:00Z","2026-09-14T22:00:00Z")]},{...options,now:"2026-09-14T16:00:00Z"}).text,"WEEK AHEAD: HOME EACH NIGHT");
console.log("Weekly ticker family overview contract tests passed: overnights, return-home time, week-ahead home nights, reverse vertical feed, and no duplicated daily flight detail.");