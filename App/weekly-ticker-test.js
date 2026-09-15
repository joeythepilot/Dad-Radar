"use strict";
const assert = require("node:assert/strict");
const ticker = require("./weekly-ticker");
const airportCatalog = require("../data/airport-catalog");

assert.equal(ticker.normalizeTickerText("  Upcoming Trip — Montréal  "),"UPCOMING TRIP - MONTREAL");
const first=ticker.buildGlyphRun("THIS WEEK: TUE OVERNIGHT - MADISON, WI");
const second=ticker.buildGlyphRun("THIS WEEK: TUE OVERNIGHT - MADISON, WI");
assert.deepEqual(first.glyphs,second.glyphs,"Typewriter imperfections stay deterministic across refreshes.");
assert(first.glyphs.every(g=>g.yJitter===0 && g.xJitter===0),
  "Typewriter baseline stays steady instead of wobbling like cartoon lettering.");
assert(first.glyphs.every(g=>g.variant===0),
  "Ticker uses one restrained typewriter impression instead of erratic per-letter variants.");
assert(first.glyphs.every((g,index)=>index===0 || g.x-first.glyphs[index-1].x===16),
  "Typewriter character advance stays steady; ink variation provides most of the mechanical imperfection.");

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
assert.equal(upcoming.text,"UPCOMING TRIP: TUE OVERNIGHT - MADISON, WI • WED OVERNIGHT - WHITE PLAINS, NY • THU OVERNIGHT - BENTONVILLE, AR • FRI - HOME");
assert.equal(ticker.buildWeeklyTripTicker(schedule,{...options,now:"2026-09-16T18:00:00Z"}).prefix,"CURRENT TRIP");
assert.equal(ticker.buildWeeklyTripTicker({events:[]},{...options,now:"2026-09-14T16:00:00Z"}).text,"THIS WEEK: HOME ALL WEEK");
assert.equal(ticker.buildWeeklyTripTicker({events:[flight("out","AVL","ORD","2026-09-14T12:00:00Z","2026-09-14T14:00:00Z"),flight("home","ORD","AVL","2026-09-14T20:00:00Z","2026-09-14T22:00:00Z")]},{...options,now:"2026-09-14T16:00:00Z"}).text,"THIS WEEK: NO OVERNIGHTS");
console.log("Weekly ticker schedule and restrained raster-type tests passed.");