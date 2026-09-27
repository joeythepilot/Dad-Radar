"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ticker = require("./weekly-ticker");
function layover(id,airport,startUtc,endUtc){return{id,kind:"layover",status:"confirmed",airport,times:{startUtc,endUtc}};}
function flight(id,destination,startUtc,endUtc){return{id,kind:"flight",status:"confirmed",origin:"ORD",destination,times:{startUtc,endUtc}};}

const overnightAsset=path.join(__dirname,"..","assets","hardware","weekly-overnight","weekly-overnight-module.png");
assert(fs.existsSync(overnightAsset),"Reusable weekly overnight module artwork is present.");
const overnightPng=fs.readFileSync(overnightAsset);
assert.equal(overnightPng.readUInt32BE(16),1192,"Weekly overnight artwork retains the original 1192 px width.");
assert.equal(overnightPng.readUInt32BE(20),976,"Weekly overnight artwork retains the original 976 px height.");
assert.equal(require("node:crypto").createHash("sha256").update(overnightPng).digest("hex"),
  "ac97916a25af2ed2a5780e4a63857f53527738ae997e8b09667f9101f35e681e",
  "Production artwork is the unchanged approved high-resolution original.");
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
    ["WED","UNKN","UNKN"],
    ["THU","UNKN","UNKN"],
    ["FRI","UNKN","UNKN"],
    ["SAT","UNKN","UNKN"],
    ["SUN","UNKN","UNKN"]
  ],
  "Seven-bay bank shows explicit layovers and an honest four-wheel unknown for uncovered dates."
);

const rolloverBefore=ticker.buildWeeklyOvernightModules({events:[]},{
  homeAirport:"AVL",timeZone:"America/New_York",now:"2026-09-15T09:59:00Z"
});
const rolloverAfter=ticker.buildWeeklyOvernightModules({events:[]},{
  homeAirport:"AVL",timeZone:"America/New_York",now:"2026-09-15T10:01:00Z"
});
assert.equal(rolloverBefore[0].day,"MON","At 05:59 local the far-left bay still shows Monday.");
assert.equal(rolloverAfter[0].day,"TUE","After 06:00 local the far-left bay advances to Tuesday.");

const reserve={id:'reserve-ord',kind:'reserve',airport:'ORD',allDay:true,status:'confirmed',times:{startUtc:'2026-10-01T04:00:00Z',endUtc:'2026-10-04T04:00:00Z'}};
const assignedLayover=layover('assigned-evv','EVV','2026-10-02T23:00:00Z','2026-10-03T15:00:00Z');
const reserveBank=ticker.buildWeeklyOvernightModules({events:[reserve,assignedLayover]},{now:'2026-09-30T16:00:00Z'});
assert.deepEqual(reserveBank.map(module=>module.code).slice(0,5),['UNKN','ORD','EVV','ORD','UNKN'],
  'Explicit reserve dates show ORD; an assigned layover wins; blank days beyond the block stay outside reserve.');

const scheduleEvidence=ticker.buildWeeklyOvernightModules({events:[
  flight('return-base','ORD','2026-09-30T14:00:00Z','2026-09-30T22:00:00Z'),
  layover('base-layover','ORD','2026-09-30T23:00:00Z','2026-10-01T12:00:00Z'),
  {id:'rap',kind:'reserve',reserveType:'RAP',airport:'ORD',allDay:false,status:'confirmed',
    times:{startUtc:'2026-10-01T16:00:00Z',endUtc:'2026-10-02T03:59:00Z'}}
]},{now:'2026-09-30T16:00:00Z'});
assert.deepEqual(scheduleEvidence.map(module=>module.code).slice(0,5),
  ['ORD','ORD','UNKN','UNKN','UNKN'],
  'A flight arrival and timed RAP establish their own operational dates, but no later blank date.');

const assignment=ticker.buildWeeklyOvernightModules({events:[
  reserve,
  flight('assigned','AVL','2026-10-02T17:00:00Z','2026-10-03T01:30:00Z'),
  {...flight('cancelled-assignment','CMH','2026-10-02T18:00:00Z','2026-10-03T02:00:00Z'),status:'cancelled'}
]},{now:'2026-09-30T16:00:00Z'});
assert.equal(assignment[2].code,'HOME','A scheduled AVL arrival beats reserve; a cancelled assignment supplies no location.');
assert.deepEqual(assignment[2].characters,['H','O','M','E']);

const arrivals=ticker.buildWeeklyOvernightModules({events:[
  flight('after-six','AVL','2026-10-01T07:00:00Z','2026-10-01T10:01:00Z'),
  flight('before-six','CMH','2026-10-01T02:00:00Z','2026-10-01T09:59:00Z'),
  flight('later','ORD','2026-10-01T18:00:00Z','2026-10-02T01:00:00Z')
]},{now:'2026-09-30T16:00:00Z'});
assert.deepEqual(arrivals.map(module=>module.code).slice(0,2),['CMH','ORD'],
  'Arrivals use the 6 AM Eastern operational date, and the latest arrival on that date wins.');

const reassigned=ticker.buildWeeklyOvernightModules({events:[
  reserve,
  layover('earlier-base','ORD','2026-10-02T12:00:00Z','2026-10-02T19:00:00Z'),
  flight('later-assignment','EVV','2026-10-02T19:15:00Z','2026-10-02T22:00:00Z')
]},{now:'2026-09-30T16:00:00Z'});
assert.equal(reassigned[2].code,'EVV','A later assigned flight arrival supersedes an earlier layover and reserve.');

const dutyFree={id:'off',kind:'duty-free',allDay:true,status:'confirmed',times:{startUtc:'2026-10-02T04:00:00Z',endUtc:'2026-10-04T04:00:00Z'}};
const daysOff=ticker.buildWeeklyOvernightModules({events:[dutyFree]}, {now:'2026-09-30T16:00:00Z'});
assert.deepEqual(daysOff.map(module=>module.code).slice(0,5),['UNKN','UNKN','HOME','HOME','UNKN'],
  'Only the explicitly covered all-day Duty Free Period dates show HOME.');
assert.deepEqual(daysOff[2].characters,['H','O','M','E'],'HOME fits the four mechanical wheels.');
const offAtRollover=ticker.buildWeeklyOvernightModules({events:[dutyFree]}, {now:'2026-10-02T09:59:00Z'});
assert.equal(offAtRollover[0].code,'UNKN','At 5:59 AM Eastern the previous operational date remains unknown.');
assert.equal(offAtRollover[1].code,'HOME','The new Duty Free date is already known to be home.');
assert.equal(ticker.buildWeeklyOvernightModules({events:[dutyFree]}, {now:'2026-10-02T10:01:00Z'})[0].code,'HOME',
  'At 6 AM Eastern the Duty Free date becomes the first wheel.');
const conflictingOff=ticker.buildWeeklyOvernightModules({events:[dutyFree,reserve,
  flight('assignment','EVV','2026-10-02T18:00:00Z','2026-10-02T23:00:00Z'),
  {...layover('cancelled','CMH','2026-10-02T22:00:00Z','2026-10-03T12:00:00Z'),status:'cancelled'}
]},{now:'2026-09-30T16:00:00Z'});
assert.equal(conflictingOff[2].code,'EVV','An assigned flight wins over a Duty Free Period and a cancelled layover supplies no location.');
assert.equal(conflictingOff[3].code,'ORD','An explicit reserve block wins over a conflicting Duty Free Period.');
assert.equal(ticker.buildWeeklyOvernightModules({events:[{...dutyFree,status:'cancelled'}]},
  {now:'2026-09-30T16:00:00Z'})[2].code,'UNKN','A cancelled Duty Free Period supplies no home evidence.');
const timedOff={...dutyFree,id:'timed-off',allDay:false,times:{startUtc:'2026-10-02T16:00:00Z',endUtc:'2026-10-03T09:59:00Z'}};
assert.deepEqual(ticker.buildWeeklyOvernightModules({events:[timedOff]}, {now:'2026-09-30T16:00:00Z'})
  .map(module=>module.code).slice(0,5),['UNKN','UNKN','HOME','UNKN','UNKN'],
  'A timed Duty Free Period ending before the 6 AM rollover covers only its operational date.');

assert.equal(ticker.operationalDateKey('2026-11-01T10:59:00Z','America/New_York'),'2026-10-31',
  'The fall daylight-saving change still rolls at 5:59 AM Eastern.');
assert.equal(ticker.operationalDateKey('2026-11-01T11:00:00Z','America/New_York'),'2026-11-01',
  'The fall daylight-saving change still rolls at 6 AM Eastern.');

console.log("Weekly overnight tests passed: approved module artwork, seven bays, airport codes and 6am rollover.");
