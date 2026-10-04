'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {observeBrowserErrors}=require('./browser-error-proof');
const {createDisplayFixture}=require('./display-browser-fixture');
const focus=process.env.DADRADAR_BROWSER_FOCUS;
const engine=process.env.DADRADAR_BROWSER_ENGINE;
if(!['duty','posters','family'].includes(focus)||!['chromium','webkit'].includes(engine))throw new Error('Unknown component/engine');
const {root,state,server}=createDisplayFixture();
const output=path.join(process.env.DADRADAR_ARTIFACT_ROOT||path.join(root,'artifacts'),focus);
fs.mkdirSync(output,{recursive:true});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await ({chromium,webkit})[engine].launch({headless:true});
 try {
  const views=focus==='duty'?[
   ['kiosk',1920,1080,'/'],['desktop',1440,900,'/'],['tablet',1024,768,'/'],
   ['family-landscape',844,390,'/mobile/full?layout=full'],['family-portrait',390,844,'/mobile/full?layout=full']
  ]:focus==='posters'?[
   ['kiosk',1920,1080,'/'],['family-portrait',390,844,'/mobile/full?layout=full']
  ]:[['family-full',390,844,'/mobile/full?layout=full'],['family-compact',390,844,'/mobile?layout=compact']];
  for(const [name,width,height,route] of views){
   const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
   const settled=observeBrowserErrors(page);
   const responses=[];page.on('response',r=>{if(r.status()>=400)responses.push(`${r.status()} ${r.url()}`);});
   await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
   await page.goto(origin+route);
   if(name!=='family-compact')await page.waitForSelector('#dashboard:not([hidden])',{timeout:12000});
   if(focus==='duty'){
    // Restore the three-row stamped fixture before exercising each layout.
    await page.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:s}})),state);
    await require('./duty-card-browser-proof').checkDutyCard(page,name,output,state);
   } else if(focus==='posters'){
    await page.locator('#destination-poster').evaluate(image=>image.decode());
    const actual=await page.locator('#destination-poster').evaluate(n=>({src:n.getAttribute('src'),w:n.naturalWidth,h:n.naturalHeight,visible:!n.hidden,background:getComputedStyle(n.parentElement).backgroundImage}));
    assert(actual.w>0&&actual.h>0&&actual.visible,'Selected destination poster decodes and is visible');
    assert.equal(new URL(actual.src,origin).pathname,new URL(require('../config/posters').getPoster('AVL').source,origin).pathname,'Correct approved AVL poster is selected, independently of cache/retry parameters');
    assert.equal(actual.background,'none','Poster has one foreground rendering path');
   } else {
    await page.waitForFunction(()=>document.querySelector('#flight-number')?.getAttribute('aria-label')==='3761'&&document.querySelector('#flight-destination')?.getAttribute('aria-label')==='AVL');
    assert.equal(await page.locator('#flight-destination').getAttribute('aria-label'),'AVL');
    assert(await page.locator(name==='family-compact'?'#duty-entries':'.daily-schedule-panel').isVisible(),'Family route renders duty alongside the flight');
    assert.equal(await page.locator('script[src*="deployment-refresh.js"]').count(),1,'Independent refresh watchdog is present');
   }
   await settled(`${focus}/${name}`);
   assert.deepEqual(responses,[],`${name}: production assets load`);
   await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true});
   await page.close();console.log(`${focus}/${engine}/${name}: passed`);
  }
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
