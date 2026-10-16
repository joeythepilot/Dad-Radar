'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const start = source.indexOf('function startDashboardSequence()');
const end = source.indexOf('\nfunction observeAltitudeChime(', start);
assert(start >= 0 && end > start, 'Exercise the actual production startup function');
function run(family) {
  const timers = [], dashboard = {hidden:true}, startupScreen = {hidden:false};
  let calendarStarts = 0, ready = 0;
  const context = {
    document:{documentElement:{hasAttribute:name=>family && name === 'data-family-full'}},
    window:{setTimeout:(fn, delay)=>timers.push({fn,delay}),setInterval:()=>{},__dadRadarBoot:{ready:()=>ready++}},
    dadRadarSettings:{startup:{systemsOnlineDelayMs:1800,dashboardDelayMs:3000},schedule:{dataSource:'calendar'}},
    unitLabel:null,startupAppName:null,dashboardAppName:null,etaZone:null,statusMessage:{},
    dashboard,startupScreen,dadRadarState:{},updateDashboard:()=>{},updateClock:()=>{},
    scheduleFlightBoardBalance:()=>{},startCalendarStateController:()=>calendarStarts++
  };
  vm.runInNewContext(source.slice(start,end)+'\nstartDashboardSequence();',context);
  assert.equal(calendarStarts,1,'Calendar state starts immediately, independently of presentation');
  const reveal = timers.find(t=>t.delay === (family ? 0 : 3000));
  assert(reveal, family ? 'Family startup must not inherit the three-second appliance delay' : 'Primary startup must retain its 3000ms reveal');
  for (const timer of timers) timer.fn();
  assert.equal(dashboard.hidden,false); assert.equal(startupScreen.hidden,true);assert.equal(ready,1);
  assert.deepEqual(timers.map(t=>t.delay),family ? [0,0] : [1800,3000]);
}
run(true);run(false);
console.log('Real mobile/primary startup timing and immediate calendar-start tests passed.');
