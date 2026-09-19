"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ticker = require("./weekly-ticker");
function layover(id,airport,startUtc,endUtc){return{id,kind:"layover",status:"confirmed",airport,times:{startUtc,endUtc}};}

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

console.log("Weekly overnight tests passed: approved module artwork, seven bays, airport codes and 6am rollover.");