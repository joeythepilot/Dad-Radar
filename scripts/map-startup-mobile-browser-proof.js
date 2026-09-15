"use strict";
const assert = require('node:assert/strict');

async function checkInitialReplay(page) {
  // Exercise real calendar-sync ordering, including a repeat of the stale token.
  await page.evaluate(() => window.refreshCalendarState());
  await page.evaluate(() => window.refreshCalendarState());
  const result = await page.evaluate(() => ({
    sounds: window.mapProofSounds.filter(s => /playMotor|Clack/.test(s.name)),
    moving: !!document.querySelector('.map-roll-to-surface,.map-roll-to-regional'),
    copies: document.querySelectorAll('.map-roll-surface-sheet .route-map-svg').length
  }));
  assert.deepEqual(result, {sounds:[],moving:false,copies:0}, 'Loading/reloading stale server test state must never demo-scroll');
}

async function checkFullHardware(page) {
  const data = await page.evaluate(() => {
    if (!document.documentElement.hasAttribute('data-family-full')) return null;
    const shell=document.querySelector('.route-map-shell'), map=shell.getBoundingClientRect();
    const modules=[...shell.querySelectorAll('.clock-block,.eta-block,.sequence-mileage-badge')].map(n=>{
      const r=n.getBoundingClientRect();
      return {name:n.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    });
    return {width:map.width,height:map.height,top:map.top,bottom:map.bottom,
      scale:Number(getComputedStyle(shell).getPropertyValue('--family-hardware-scale')),
      stacked:shell.classList.contains('map-hardware-stacked'),modules};
  });
  if (!data) return;
  assert(!data.stacked, 'Full family hardware must never form the old oversized stack');
  assert.equal(data.modules.length,3, 'All three live readouts stay available');
  for (const m of data.modules) {
    assert(m.width/data.width <= .31, `${m.name} occupies no more than 31% of map width`);
    assert(m.top >= data.top + .70*data.height, `${m.name} must stay in the lower 30%, not over the middle of the map`);
    assert(data.bottom-m.bottom <= 20, 'All readouts stay near the lower bezel, never on 90px stilts');
  }
  const coverage=data.modules.reduce((a,m)=>a+m.width*m.height,0)/(data.width*data.height);
  assert(coverage<=.19, `Readouts cover ${(coverage*100).toFixed(1)}% of map; maximum is 19%`);
  const widths=data.modules.map(m=>m.width);
  assert(Math.abs(widths[0]-184*data.scale)<1 && Math.abs(widths[2]-196*data.scale)<1,
    'Existing housings share one proportional scale, not just smaller text');
  return {...data,coverage};
}

async function checkDiagnosticRoundTrip(page) {
  // The fixture implements the existing command endpoint. No new live API.
  await page.evaluate(async()=>{
    await fetch('/api/diagnostics/shutters-test',{method:'POST'});
    await window.refreshCalendarState();
  });
  // These predicates observe recorded events, not geometry. Poll by timer so a
  // busy WebKit paint does not hide an event already present in the log. WebKit
  // can defer JavaScript polling for several seconds while compositing the real
  // transport, so the first observation window is deliberately longer than the
  // animation without changing any product timing or assertion.
  await page.waitForFunction(()=>window.mapProofSounds.some(s=>s.name==='playMotor'),null,{timeout:5000,polling:20});
  assert.equal(await page.locator('.map-roll-surface-sheet .route-map-svg').count(),1,'New intentional test uses a second chart, not blank paper');
  await page.evaluate(()=>window.refreshCalendarState());
  await page.waitForFunction(()=>window.mapProofSounds.filter(s=>s.name==='playDetentClack').length===2,null,{timeout:9000,polling:20});
  await page.waitForTimeout(250);
  const sounds=await page.evaluate(()=>window.mapProofSounds);
  assert.equal(sounds.filter(s=>s.name==='playMotor').length,2,'One deliberate command makes only one round trip');
  assert(sounds.filter(s=>/Clack/.test(s.name)).every(s=>!s.moving),'Diagnostic registration follows visual settle');
  assert.equal(await page.locator('.map-roll-surface-sheet .route-map-svg').count(),0,'Diagnostic duplicate is removed after return');
  await page.reload({waitUntil:'load'});
  if(await page.locator('#dashboard').count()) await page.waitForSelector('#dashboard:not([hidden])');
  await page.waitForSelector('.map-roll-transport',{state:'attached'});
  await checkInitialReplay(page);
  await page.evaluate(()=>{window.mapProofSounds=[];});
}
module.exports={checkInitialReplay,checkFullHardware,checkDiagnosticRoundTrip};
