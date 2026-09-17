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
    scrollSpeed:48,
    scrollAxis:"vertical",
    lineAdvance:48,
    itemSeparator:" • • ",
    glyphDrawWidth:32,
    glyphDrawHeight:42,
    glyphAdvance:24
  },
  "Ticker becomes a shallow map-width paper transport with a vertical feed."
);
assert((ticker.PAPER.right-ticker.PAPER.left)/ticker.DESIGN_WIDTH >= 0.85,
  "Paper occupies nearly the full width of the visible mechanism.");
const mechanismAsset=fs.readFileSync(path.join(__dirname,"..","assets","ticker","weekly-ticker-mechanism-v11.png"));
assert.deepEqual([...mechanismAsset.subarray(0,8)],[137,80,78,71,13,10,26,10],
  "Mechanism is generated raster artwork rather than a CSS/vector faceplate.");
assert.equal(mechanismAsset.readUInt32BE(16),1500,"Mechanism raster matches the ticker backing width.");
assert.equal(mechanismAsset.readUInt32BE(20),144,"Mechanism raster matches the shallow ticker backing height.");
assert.equal(ticker.feedVelocityFactor(1000),0,"Vertical paper feed dwells between mechanical advances.");
assert(ticker.feedVelocityFactor(3050)>1,"Vertical paper feed accelerates through a short roller-driven advance.");
assert(ticker.feedVelocityFactor(3720)>0 && ticker.feedVelocityFactor(3720)<0.5,
  "Vertical paper feed eases into a brief mechanical settle.");
assert.equal(ticker.feedVelocityFactor(4100),0,"Vertical paper feed fully settles before the next advance.");

const first=ticker.buildGlyphRun("THIS WEEK: TUE - MADISON, WI");
const second=ticker.buildGlyphRun("THIS WEEK: TUE - MADISON, WI");
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
  flight("tue-commute","AVL","ORD","2026-09-15T11:00:00Z","2026-09-15T13:00:00Z",{isCommute:true}),
  flight("tue-msn","ORD","MSN","2026-09-15T15:00:00Z","2026-09-15T17:00:00Z"),
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
assert.equal(upcoming.text,"UPCOMING TRIP: TUE - MADISON, WI • • WED - WHITE PLAINS, NY • • THU - BENTONVILLE, AR • • FRI - HOME");
assert(!upcoming.text.includes("OVERNIGHT"),"Ticker omits the repetitive word OVERNIGHT from trip entries.");

const upcomingLines=ticker.buildTickerLines(upcoming);
assert.deepEqual(upcomingLines,[
  "UPCOMING TRIP",
  "TUE - MADISON, WI • • WED - WHITE PLAINS, NY",
  "THU - BENTONVILLE, AR • • FRI - HOME"
],"Vertical ticker wraps the itinerary into restrained typewritten rows instead of a horizontal crawl.");
assert(upcomingLines.every(line=>line.length<=ticker.LINE_CHARACTER_LIMIT),
  "Every vertical-feed line fits the paper width without horizontal scrolling.");
assert.equal(ticker.buildWeeklyTripTicker(schedule,{...options,now:"2026-09-16T18:00:00Z"}).prefix,"CURRENT TRIP");
assert.equal(ticker.buildWeeklyTripTicker({events:[]},{...options,now:"2026-09-14T16:00:00Z"}).text,"THIS WEEK: HOME ALL WEEK");
assert.equal(ticker.buildWeeklyTripTicker({events:[flight("out","AVL","ORD","2026-09-14T12:00:00Z","2026-09-14T14:00:00Z"),flight("home","ORD","AVL","2026-09-14T20:00:00Z","2026-09-14T22:00:00Z")]},{...options,now:"2026-09-14T16:00:00Z"}).text,"THIS WEEK: NO LAYOVERS");
console.log("Weekly ticker schedule, shallow geometry, full-width paper, vertical feed, wrapping, and concise wording tests passed.");
