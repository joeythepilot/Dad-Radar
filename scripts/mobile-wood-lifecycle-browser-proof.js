'use strict';
const assert=require('node:assert/strict');
const {checkMobileWood}=require('./mobile-wood-browser-proof');
async function checkMobileWoodLifecycle(browser,origin){
 for(const input of ['HomingBeacon_Walnut_Profile_Atlas_v2.png','HomingBeacon_Map_Walnut_Frame_Study_v3.png']){
  const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  let intercepted=0;
  await p.route('**/*',r=>{const u=r.request().url();if(new URL(u).pathname==='/assets/hardware/'+input){intercepted++;return r.abort();}return u.startsWith(origin)||u.startsWith('blob:')?r.continue():r.abort();});
  await p.goto(origin+'/mobile');
  assert.equal(intercepted,1,'Failure fixture must intercept the actual current material input: '+input);
  await p.waitForFunction(()=>window.DadRadarMobileWood?.failed);
  assert.equal(await p.locator('canvas.family-walnut').count(),0,'Failed input never leaves a partial overlay');
  assert.equal(await p.locator('.flap-character').count(),19,'All original live flaps remain usable');
  await p.waitForSelector('canvas.family-clock-plate');await p.close();
 }
 const slow=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 let release,intercepted=0;const held=new Promise(r=>{release=r});
 await slow.route('**/*',async r=>{const u=r.request().url();if(!u.startsWith(origin)&&!u.startsWith('blob:'))return r.abort();if(new URL(u).pathname==='/assets/hardware/HomingBeacon_Walnut_Profile_Atlas_v2.png'){intercepted++;await held;}return r.continue();});
 await slow.goto(origin+'/mobile',{waitUntil:'domcontentloaded'});await slow.waitForSelector('canvas.family-clock-plate');
 assert.equal(intercepted,1,'Slow-load fixture must hold the current stock, not an obsolete asset');
 assert.equal(await slow.locator('canvas.family-walnut').count(),0,'Slow material does not block or partially cover the live display');
 release();await slow.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence);
 const first=await checkMobileWood(slow);
 for(const [width,height]of[[390,844],[320,568],[1024,768],[768,1024],[430,932],[932,430],[844,390]]){
  await slow.setViewportSize({width,height});
  await slow.waitForFunction(()=>{
   const p=innerHeight>innerWidth,w=p?innerWidth:Math.min(innerWidth,innerHeight*16/9),h=p?Math.max(1000,innerHeight):w*9/16,e=document.querySelector('canvas.family-walnut')?._woodEvidence;
   return e&&Math.abs(e.width-w)<.1&&Math.abs(e.height-h)<.1;
  });
  const rotated=await checkMobileWood(slow);
  if(width===844)assert.equal(rotated.signature,first.signature,'Rotation returns identical walnut pixels');
 }
 await slow.close();
 await checkMobileWoodPosterArrival(browser,origin);
 await checkMobileWoodPosterFallback(browser,origin);
 await checkMobileWoodDecodeResize(browser,origin);
 const primary=await browser.newPage({viewport:{width:1920,height:1080},serviceWorkers:'block'}),requests=[];
 primary.on('request',r=>requests.push(r.url()));await primary.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());await primary.goto(origin+'/');await primary.waitForSelector('#dashboard:not([hidden])');
 assert.equal(await primary.locator('canvas.family-walnut').count(),0);assert(!requests.some(u=>u.includes('wood-registration')||u.includes('Walnut_')),'Primary does not request walnut code or photographs');await primary.close();
 console.log('Walnut lifecycle: failures, slow load, eight layouts/return signature, late poster and primary isolation passed');
}
async function checkMobileWoodPosterArrival(browser,origin){
 const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const poster=new URL(require('../config/posters').getPoster('AVL').source,origin).pathname;
 let release;const held=new Promise(r=>{release=r});
 await p.route('**/*',async r=>{const u=r.request().url();if(!u.startsWith(origin)&&!u.startsWith('blob:'))return r.abort();if(new URL(u).pathname===poster)await held;return r.continue();});
 try{
  await p.goto(origin+'/mobile',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence&&document.querySelectorAll('canvas.family-photo-plate').length===2);
  await p.waitForSelector('canvas.family-clock-plate');
  assert.equal(await p.locator('.destination-poster-image').evaluate(n=>n.naturalWidth),0,'Poster is truly held until after walnut and metal mount');
  release();await p.locator('.destination-poster-image').evaluate(n=>n.decode());
  // The original portrait image box uses contain; its unused letterbox must
  // become wood after late decode, not remain a module-sized black cutout.
  const point=await p.locator('.destination-poster-image').evaluate(n=>{
   const r=n.getBoundingClientRect(),s=Math.min(r.width/n.naturalWidth,r.height/n.naturalHeight),dx=r.width-n.naturalWidth*s,dy=r.height-n.naturalHeight*s;
   const center={x:r.x+r.width/2,y:r.y+r.height/2};
   if(dx>2)return{x:r.x+dx/4,y:r.y+r.height/2,center};
   if(dy>2)return{x:r.x+r.width/2,y:r.y+dy/4,center};
   return null;
  });
  assert(point,'Portrait fixture contains a real poster letterbox');
  const alpha=()=>p.evaluate(({x,y})=>{const c=document.querySelector('canvas.family-walnut'),r=c.getBoundingClientRect(),d=c._woodEvidence.dpr;return c.getContext('2d').getImageData(Math.floor((x-r.x)*d),Math.floor((y-r.y)*d),1,1).data[3];},point);
  try{await p.waitForFunction(({x,y,center})=>{const c=document.querySelector('canvas.family-walnut'),r=c.getBoundingClientRect(),d=c._woodEvidence.dpr,ctx=c.getContext('2d'),a=(x,y)=>ctx.getImageData(Math.floor((x-r.x)*d),Math.floor((y-r.y)*d),1,1).data[3];return a(x,y)===255&&a(center.x,center.y)===0;},point,{timeout:3000});}catch{}
  assert.equal(await alpha(),255,'Late poster decode refits wood into the unused letterbox');
  const centerAlpha=await p.evaluate(({x,y})=>{const c=document.querySelector('canvas.family-walnut'),r=c.getBoundingClientRect(),d=c._woodEvidence.dpr;return c.getContext('2d').getImageData(Math.floor((x-r.x)*d),Math.floor((y-r.y)*d),1,1).data[3];},point.center);
  assert.equal(centerAlpha,0,'The actual late-revealed poster remains unobscured, independently of reported cutouts');
  await checkMobileWood(p);
 }finally{release();await p.close();}
}
async function checkMobileWoodPosterFallback(browser,origin){
 const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
 try{
  await p.goto(origin+'/mobile');await p.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence&&document.querySelectorAll('canvas.family-photo-plate').length===2);
  await p.locator('.destination-poster-image').evaluate(n=>n.decode());
  await p.evaluate(()=>window.DadRadarMobileWood.fit());
  const point=await p.locator('.destination-poster-image').evaluate(n=>{
   const r=n.getBoundingClientRect(),s=Math.min(r.width/n.naturalWidth,r.height/n.naturalHeight),dy=r.height-n.naturalHeight*s;
   return{x:r.x+r.width/2,y:r.y+dy/4};
  });
  const alpha=()=>p.evaluate(({x,y})=>{const c=document.querySelector('canvas.family-walnut'),r=c.getBoundingClientRect(),d=c._woodEvidence.dpr;return c.getContext('2d').getImageData(Math.floor((x-r.x)*d),Math.floor((y-r.y)*d),1,1).data[3];},point);
  assert.equal(await alpha(),255,'Successful poster leaves actual walnut in its letterbox');
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:{status:'EN ROUTE',flight:{number:'3761',origin:'ORD',destination:'ZZZ',destinationCity:'UNKNOWN DESTINATION'}}}})));
  await p.locator('#destination-poster-fallback').waitFor({state:'visible'});
  try{await p.waitForFunction(({x,y})=>{const c=document.querySelector('canvas.family-walnut'),r=c.getBoundingClientRect(),d=c._woodEvidence.dpr;return c.getContext('2d').getImageData(Math.floor((x-r.x)*d),Math.floor((y-r.y)*d),1,1).data[3]===0;},point,{timeout:3000});}catch{}
  assert.equal(await alpha(),0,'Missing-poster fallback remains unobscured outside the previous printed-image cutout');
 }finally{await p.close();}
}
async function checkMobileWoodDecodeResize(browser,origin){
 const p=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
 try{
  await p.goto(origin+'/mobile');await p.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence&&document.querySelectorAll('canvas.family-photo-plate').length===2);
  await p.locator('#destination-poster').evaluate(n=>n.decode());await p.evaluate(()=>window.DadRadarMobileWood.fit());
  await p.evaluate(()=>{
   const decode=HTMLImageElement.prototype.decode;
   HTMLImageElement.prototype.decode=function(){
    if(!this.src.endsWith('/HomingBeacon_Walnut_Profile_Atlas_v2.png'))return decode.call(this);
    window.walnutReferenceDecodeHeld=true;
    return new Promise(resolve=>{window.releaseWalnutReferenceDecode=resolve;}).then(()=>decode.call(this));
   };
  });
  const proof=checkMobileWood(p);
  await Promise.race([p.waitForFunction(()=>window.walnutReferenceDecodeHeld),proof.then(()=>{throw new Error('Reference decode challenge was not exercised');})]);
  await p.setViewportSize({width:932,height:430});
  await p.waitForFunction(()=>{const e=document.querySelector('canvas.family-walnut')?._woodEvidence;return e&&Math.abs(e.height-430)<.1;});
  await p.evaluate(()=>window.releaseWalnutReferenceDecode());
  await proof;
 }finally{await p.close();}
}
module.exports={checkMobileWoodLifecycle,checkMobileWoodPosterArrival,checkMobileWoodPosterFallback,checkMobileWoodDecodeResize};
