'use strict';
const assert=require('node:assert/strict');
const {checkMobileWood}=require('./mobile-wood-browser-proof');
async function checkMobileWoodLifecycle(browser,origin){
 for(const suffix of ['Source','Infill']){
  const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await p.route('**/*',r=>{const u=r.request().url();if(u.includes('Walnut_'+suffix+'_v1.png'))return r.abort();return u.startsWith(origin)||u.startsWith('blob:')?r.continue():r.abort();});
  await p.goto(origin+'/mobile');await p.waitForFunction(()=>window.DadRadarMobileWood?.failed);
  assert.equal(await p.locator('canvas.family-walnut').count(),0,'Failed input never leaves a partial overlay');
  assert.equal(await p.locator('.flap-character').count(),19,'All original live flaps remain usable');
  await p.waitForSelector('canvas.family-clock-plate');await p.close();
 }
 const slow=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 let release;const held=new Promise(r=>{release=r});
 await slow.route('**/*',async r=>{const u=r.request().url();if(!u.startsWith(origin)&&!u.startsWith('blob:'))return r.abort();if(u.includes('Walnut_Source_v1.png'))await held;return r.continue();});
 await slow.goto(origin+'/mobile',{waitUntil:'domcontentloaded'});await slow.waitForSelector('canvas.family-clock-plate');
 assert.equal(await slow.locator('canvas.family-walnut').count(),0,'Slow material does not block or partially cover the live display');
 release();await slow.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence);await checkMobileWood(slow);await slow.close();
 const primary=await browser.newPage({viewport:{width:1920,height:1080},serviceWorkers:'block'}),requests=[];
 primary.on('request',r=>requests.push(r.url()));await primary.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());await primary.goto(origin+'/');await primary.waitForSelector('#dashboard:not([hidden])');
 assert.equal(await primary.locator('canvas.family-walnut').count(),0);assert(!requests.some(u=>u.includes('wood-registration')||u.includes('Walnut_')),'Primary does not request walnut code or photographs');await primary.close();
 console.log('Walnut lifecycle: both asset failures, slow load and primary isolation passed');
}
module.exports={checkMobileWoodLifecycle};
