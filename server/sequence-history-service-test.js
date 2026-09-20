"use strict";

const assert = require("node:assert/strict");
const {
  createSequenceHistoryService,
  eventKey,
  isWorkFlight
} = require("./sequence-history-service");

let now = Date.parse("2026-09-13T12:00:00Z");
const storage = {};
const service = createSequenceHistoryService(storage, {now: () => now});

function event(id, origin, destination, role = "operating") {
  return {
    id,
    kind: "flight",
    travelRole: role,
    isDeadhead: role === "deadhead",
    isCommute: role === "commute",
    flightNumber: id,
    origin,
    destination,
    times: {
      startUtc: new Date(now - 3600000).toISOString(),
      endUtc: new Date(now + 3600000).toISOString()
    }
  };
}

function resolved(selectedEvent, track, mode = "EN_ROUTE") {
  return {
    event: selectedEvent,
    mode,
    state: {
      livePhase: mode,
      flight: {
        number: selectedEvent.flightNumber,
        origin: selectedEvent.origin,
        destination: selectedEvent.destination,
        actualTrack: track
      }
    }
  };
}

assert.equal(isWorkFlight(event("C", "AVL", "ORD", "commute")), false);

const first = event("101", "ORD", "BMI");
let summary = service.update(resolved(first, [
  {latitude: 41.97, longitude: -87.9, recordedAt: new Date(now).toISOString()},
  {latitude: 41.0, longitude: -88.6, recordedAt: new Date(now + 60000).toISOString()}
]));
assert.equal(summary.legCount, 1);
assert.equal(summary.currentEventKey, eventKey(first));
assert.ok(summary.totalDistanceNm > 50);

now += 2 * 3600000;
summary = service.update(resolved(first, [
  {latitude: 40.48, longitude: -88.92, recordedAt: new Date(now).toISOString()}
], "ARRIVED"));
assert.equal(summary.completedLegCount, 1);

summary = service.update({event: {kind: "layover", airport: "BMI"}, mode: "LAYOVER", state: {}});
assert.equal(summary.currentEventKey, null);
assert.equal(summary.legCount, 1, "Layover preserves completed trip history.");

const deadhead = event("202", "BMI", "ORD", "deadhead");
now += 3 * 3600000;
summary = service.update(resolved(deadhead, [
  {latitude: 40.48, longitude: -88.92, recordedAt: new Date(now).toISOString()},
  {latitude: 41.97, longitude: -87.9, recordedAt: new Date(now + 60000).toISOString()}
]));
assert.equal(summary.legCount, 2);
assert.equal(summary.legs[1].isDeadhead, true);
assert.equal(summary.currentEventKey, eventKey(deadhead));

const commute = event("303", "AVL", "ORD", "commute");
summary = service.update(resolved(commute, [
  {latitude: 35.4, longitude: -82.5},
  {latitude: 41.9, longitude: -87.9}
]));
assert.equal(summary.legCount, 2, "Personal commute must be excluded.");
assert.equal(summary.currentEventKey, null);

const cancelled = {...event("404", "ORD", "TVC"), status: "cancelled"};
summary = service.update(resolved(cancelled, [
  {latitude: 41.9, longitude: -87.9},
  {latitude: 44.7, longitude: -85.6}
]));
assert.equal(summary.legCount, 2, "Cancelled plans must not become flown history.");

const reassigned = {...deadhead, origin: "ORD", destination: "MSN"};
summary = service.update(resolved(reassigned, [
  {latitude: 41.97, longitude: -87.9},
  {latitude: 43.14, longitude: -89.34}
]));
assert.equal(summary.legCount, 3);

now += 49 * 3600000;
summary = service.read();
assert.equal(summary.legCount, 0, "Sequence expires after 48 hours without work-flight activity.");

// A tracked leg must not remain incomplete forever just because the display
// missed the brief ARRIVED/LANDED phase before moving on.
let missedArrivalNow = Date.parse("2026-09-13T22:30:00Z");
const missedArrivalService = createSequenceHistoryService({}, {now: () => missedArrivalNow});
const missedArrivalLeg = {
  id: "missed-arrival-1",
  kind: "flight",
  travelRole: "operating",
  isCommute: false,
  isDeadhead: false,
  flightNumber: "4334",
  origin: "ORD",
  destination: "BMI",
  times: {
    startUtc: "2026-09-13T22:00:00Z",
    endUtc: "2026-09-13T23:00:00Z"
  }
};
let missedArrivalSummary = missedArrivalService.update(resolved(missedArrivalLeg, [
  {latitude: 41.97, longitude: -87.9, recordedAt: "2026-09-13T22:30:00Z"},
  {latitude: 41.0, longitude: -88.6, recordedAt: "2026-09-13T22:45:00Z"}
], "EN_ROUTE"));
assert.equal(missedArrivalSummary.completedLegCount, 0);

missedArrivalNow = Date.parse("2026-09-14T01:30:00Z");
missedArrivalSummary = missedArrivalService.backfill([missedArrivalLeg]);
assert.equal(missedArrivalSummary.legCount, 1, "Past reconciliation must not duplicate an already tracked leg.");
assert.equal(missedArrivalSummary.completedLegCount, 1, "A past tracked leg is complete even if ARRIVED was missed.");
assert.equal(missedArrivalSummary.estimatedLegCount, 0, "Reconciliation preserves real tracked mileage.");
assert.equal(missedArrivalSummary.legs[0].track.length, 2, "Reconciliation preserves the recorded track.");

// A newly installed tracker can recover a just-completed trip from calendar history.
const recoveryNow = Date.parse("2026-09-14T01:30:00Z");
const recovered = createSequenceHistoryService({}, {now: () => recoveryNow});
const recentLeg = {
  id: "recent-1",
  kind: "flight",
  travelRole: "operating",
  isCommute: false,
  isDeadhead: false,
  flightNumber: "4334",
  origin: "BMI",
  destination: "ORD",
  times: {
    startUtc: "2026-09-13T22:00:00Z",
    endUtc: "2026-09-13T23:00:00Z"
  }
};
const recentDeadhead = {
  ...recentLeg,
  id: "recent-2",
  travelRole: "deadhead",
  isDeadhead: true,
  flightNumber: "999",
  origin: "ORD",
  destination: "BMI",
  times: {
    startUtc: "2026-09-13T19:00:00Z",
    endUtc: "2026-09-13T20:00:00Z"
  }
};
const recentCommute = {
  ...recentLeg,
  id: "recent-3",
  travelRole: "commute",
  isCommute: true,
  origin: "AVL",
  destination: "ORD"
};
const recoveredSummary = recovered.backfill([recentDeadhead, recentCommute, recentLeg]);
assert.equal(recoveredSummary.legCount, 2, "Recovery includes operating/deadhead legs but excludes commute.");
assert.equal(recoveredSummary.completedLegCount, 2);
assert.equal(recoveredSummary.estimatedLegCount, 2);
assert.ok(recoveredSummary.totalDistanceNm > 150, "Recovered trip uses great-circle mileage.");
assert.ok(recoveredSummary.legs.every(leg => leg.estimated));

// Planned trip totals include future legs without adding them to flown history.
let plannedNow=Date.parse('2026-09-13T08:00:00Z');
const plannedStorage={};
const plannedService=createSequenceHistoryService(plannedStorage,{now:()=>plannedNow});
const base=Date.parse('2026-09-13T09:00:00Z');
const plannedLeg=(index,offsetHours)=>({
 id:'plan-'+index,kind:'flight',status:'confirmed',travelRole:index===9?'deadhead':'operating',
 isDeadhead:index===9,isCommute:false,flightNumber:String(4000+index),origin:'ORD',destination:'CMH',
 times:{startUtc:new Date(base+offsetHours*3600000).toISOString(),endUtc:new Date(base+(offsetHours+1)*3600000).toISOString()}
});
const trip=[0,3,24,27,48,51,72,75,96].map((hours,i)=>plannedLeg(i+1,hours));
const nextTrip=[plannedLeg(20,192),plannedLeg(21,195)];
const commutePlan={...plannedLeg(30,76),isCommute:true,travelRole:'commute'};
const cancelledPlan={...plannedLeg(31,77),status:'cancelled'};
const plan=[...trip,...nextTrip,commutePlan,cancelledPlan,{...trip[8]}];
plannedService.backfill(plan);
for(const leg of trip.slice(0,7)){
 plannedNow=Date.parse(leg.times.endUtc);
 plannedService.update(resolved(leg,[{latitude:41.97,longitude:-87.9},{latitude:40,longitude:-82.875}],'ARRIVED'));
}
const sevenDone=plannedService.read();
assert.equal(sevenDone.scheduledLegCount,9,'Seven completed legs out of nine scheduled must show a nine-leg trip');
assert.equal(sevenDone.legCount,7,'Future plans must not become recorded legs');
assert.equal(sevenDone.completedLegCount,7,'Completion remains independently recorded');
assert.equal(sevenDone.legs.length,7);
const originalMiles=sevenDone.totalDistanceNm;
const originalTracks=JSON.stringify(sevenDone.legs.map(leg=>leg.track));
plannedService.update({mode:'LAYOVER',event:{kind:'layover'},state:{}});
assert.equal(plannedService.read().scheduledLegCount,9,'Layovers keep the full scheduled trip');
plannedService.backfill(undefined);
assert.equal(plannedService.read().scheduledLegCount,9,'Missing Calendar data must not erase the known plan');
const restoredPlan=createSequenceHistoryService(plannedStorage,{now:()=>plannedNow});
assert.equal(restoredPlan.read().scheduledLegCount,9,'Restart preserves the last known scheduled total');
// Calendar edits replace planned slots rather than appending a second copy.
const editedPlan=plan.filter(leg=>leg.id!=='plan-8').map(leg=>leg.id==='plan-9'?{...leg,times:{startUtc:new Date(base+97*3600000).toISOString(),endUtc:new Date(base+98*3600000).toISOString()}}:leg);
plannedService.backfill(editedPlan);
assert.equal(plannedService.read().scheduledLegCount,8,'Removing a future leg updates the total; retiming and duplicate events do not add legs');
assert.equal(plannedService.read().totalDistanceNm,originalMiles,'Schedule totals do not alter flown mileage');
assert.equal(JSON.stringify(plannedService.read().legs.map(leg=>leg.track)),originalTracks,'Schedule totals do not alter recorded tracks');
plannedNow=base+192*3600000;
plannedService.backfill(plan);
const newTrip=plannedService.update(resolved(nextTrip[0],[],'BOARDING'));
assert.equal(newTrip.scheduledLegCount,2,'A new trip after the existing 48-hour sequence gap gets its own planned total');
assert.equal(newTrip.completedLegCount,0);
assert.equal(newTrip.legCount,1);

// A server first started midway through a trip still counts the earlier Calendar
// legs outside its 48-hour backfill window, plus remaining scheduled legs.
const recoveredPlan=createSequenceHistoryService({}, {now:()=>Date.parse(trip[6].times.endUtc)});
const recoveredTrip=recoveredPlan.backfill(plan);
assert.equal(recoveredTrip.scheduledLegCount,9,'The schedule total covers the full connected trip, not only the recent history window');
assert(recoveredTrip.legCount<9);
// A rolling Calendar window must not erase known earlier legs of a long trip.
const longStorage={};
let longNow=base;
const longService=createSequenceHistoryService(longStorage,{now:()=>longNow});
const longTrip=Array.from({length:10},(_,i)=>plannedLeg(50+i,i*24));
longService.backfill(longTrip,{startUtc:new Date(base-7*86400000).toISOString()});
for(const leg of longTrip.slice(0,9)){
 longNow=Date.parse(leg.times.endUtc);
 longService.update(resolved(leg,[],'ARRIVED'));
}
const rolledWindow={startUtc:longTrip[1].times.endUtc};
longService.backfill(longTrip.slice(2),rolledWindow);
assert.equal(longService.read().scheduledLegCount,10,'Known legs outside the rolling window remain part of the trip');
assert.equal(longService.read().completedLegCount,9);
const longRestored=createSequenceHistoryService(longStorage,{now:()=>longNow});
longRestored.backfill(longTrip.slice(2,9),rolledWindow);
assert.equal(longRestored.read().scheduledLegCount,9,'Restart preserves older membership while a removed future leg updates the total');
assert.equal(createSequenceHistoryService({}, {now:()=>plannedNow}).read().scheduledLegCount,null,'Unknown scheduled total is explicit');
console.log("Sequence history service tests passed, including scheduled trip totals, edits and restart.");
