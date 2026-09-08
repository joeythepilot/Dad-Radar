'use strict';
const assert=require('node:assert/strict');
const {viewModel,dutyWindow}=require('./view-model');
const airports=require('../data/airport-catalog');
const now=Date.parse('2026-09-04T16:00:00Z');
const event={origin:'ORD',destination:'AVL',times:{endUtc:'2026-09-04T17:30:00Z'}};
const state={status:'EN ROUTE',liveData:true,flight:{origin:'ORD',destination:'AVL',number:'AA 4140',isCommute:true,lastPositionAt:'2026-09-04T15:59:40Z'}};
const snapshot={origin:'ORD',destination:'AVL',retrievedAt:'2026-09-04T15:59:40Z',arrival:{estimated:'2026-09-04T17:10:00Z'}};
const base={airports,now,event,state,snapshot,calendarAt:'2026-09-04T15:59:00Z'};
let m=viewModel(base);
assert.equal(m.pickup,true);assert.equal(m.time,'1:10 PM');assert.match(m.timeZone,/EDT/);assert.equal(m.arrivalLabel,'Expected arrival');assert.equal(m.flightNumber,'AA 4140');assert.equal(m.position,'Position 20s ago');
m=viewModel({...base,now:now+5*60000});assert.equal(m.arrivalLabel,'Last reported arrival');assert.equal(m.stale,true);assert.match(m.position,/Last position/);
m=viewModel({...base,failed:true});assert.match(m.freshness,/Connection interrupted/);assert.equal(m.stale,true);
m=viewModel({...base,snapshot:null});assert.equal(m.arrivalLabel,'Scheduled arrival');assert.equal(m.time,'1:30 PM');
m=viewModel({...base,snapshot:{...snapshot,destination:'TUL'}});assert.equal(m.time,'1:30 PM');
m=viewModel({...base,snapshot:{...snapshot,arrival:{actualRunway:'2026-09-04T16:00:00Z'}}});assert.equal(m.arrivalLabel,'Landed');
m=viewModel({...base,snapshot:{...snapshot,arrival:{actualGate:'2026-09-04T16:00:00Z'}}});assert.equal(m.arrivalLabel,'Arrived');
m=viewModel({...base,event:{origin:'ORD',destination:'PHX',times:{endUtc:'2026-09-05T06:30:00Z'}},state:{flight:{origin:'ORD',destination:'PHX'}},snapshot:null});
assert.equal(m.time,'2:30 AM');assert.match(m.timeZone,/Sep 5/);assert.match(m.timeZone,/EDT/);assert.equal(m.pickup,false);
m=viewModel({...base,state:{status:'HOME',locationAirport:'AVL'},event:null,snapshot:null});assert.equal(m.time,'—');assert.equal(m.code,'AVL');
console.log('Mobile arrival and freshness tests passed.');
const day={time:'ALL DAY',label:'HOME · DAY OFF',tag:'OFF DUTY'};
m=viewModel({...base,state:{locationAirport:'AVL',dailySchedule:{entries:[day,{...day},{time:'8:00 AM',label:'AVL → ORD',tag:'COMMUTE'}]}},event:null,snapshot:null});
assert.equal(m.hasFlight,false);assert.equal(m.entries.length,2);
assert.equal(viewModel(base).hasFlight,true);

const instruments={...base,state:{...state,flight:{...state.flight,groundSpeed:391,altitude:25475}}};
assert.deepEqual(viewModel(instruments).telemetry,{speed:'391',altitude:'25,475',stale:false,note:''});
assert.deepEqual(viewModel({...instruments,state:{...state,flight:{...state.flight,groundSpeed:0,altitude:0}}}).telemetry,
  {speed:'0',altitude:'0',stale:false,note:''},'Taxi readings at zero must remain visible.');
assert.equal(viewModel({...instruments,now:now+5*60000}).telemetry.note,'STALE');
assert.equal(viewModel({...instruments,failed:true}).telemetry.note,'STALE');
assert.equal(viewModel({...instruments,state:{...instruments.state,liveData:false}}).telemetry.note,'STALE');
assert.equal(viewModel({...instruments,snapshot:null,state:{...instruments.state,flight:{...instruments.state.flight,lastPositionAt:null}}}).telemetry.note,'AGE UNKNOWN');
for(const value of [null,undefined,NaN,Infinity,'']) {
  const telemetry=viewModel({...base,state:{...state,flight:{...state.flight,groundSpeed:value,altitude:value}}}).telemetry;
  assert.equal(telemetry.speed,'—');assert.equal(telemetry.altitude,'—');
}
assert.equal(viewModel({...base,state:{...state,flight:{...state.flight,groundSpeed:-10,altitude:-50}}}).telemetry.speed,'—');
assert.equal(viewModel({...base,state:{...state,flight:{...state.flight,groundSpeed:-10,altitude:-50}}}).telemetry.altitude,'-50');
assert.equal(viewModel({...base,state:{flight:{origin:'PHX',destination:'CLT'}},snapshot:{...snapshot,position:{groundSpeedKnots:420,altitudeFeet:35000}}}).telemetry.speed,'—',
  'A replacement flight must not inherit the old snapshot’s instruments.');
const legs=Array.from({length:6},(_,i)=>({id:String(i),kind:'flight',time:`${i+8}:00 AM`,label:'AVL → ORD',status:i<2?'completed':i===2?'current':'upcoming'}));
let duty=dutyWindow([day,...legs],3);
assert.deepEqual(duty.entries.map(e=>e.id),['2','3','4']);assert.equal(duty.summary,'2 earlier · 1 later');
duty=dutyWindow(legs,1);assert.equal(duty.entries[0].status,'current');
duty=dutyWindow(legs.map(e=>({...e,status:'completed'})),2);assert.deepEqual(duty.entries.map(e=>e.id),['4','5']);
duty=dutyWindow(legs.map(e=>({...e,status:'upcoming'})),2);assert.deepEqual(duty.entries.map(e=>e.id),['0','1']);
duty=dutyWindow([day],3);assert.equal(duty.entries[0].label,'HOME · DAY OFF');
assert.equal(dutyWindow([],2).entries.length,0);
console.log('Mobile duty selection and numerical telemetry tests passed.');

const inferred = viewModel({...base, state: {...state, status: 'ARRIVED', liveData: false,
  flight: {...state.flight, arrivalEstimated: true}}});
assert.equal(inferred.phase, 'ARRIVED');
assert.equal(inferred.arrivalLabel, 'Arrival estimated');
assert.equal(inferred.time, '—', 'Do not present an old ETA as an observed landing time.');
assert.match(inferred.timeZone, /unconfirmed/);
assert.match(inferred.message, /likely arrived/);
