"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium,webkit}=require("playwright");
const baseline=process.argv.includes("--baseline");
const root=baseline?process.env.DADRADAR_BASELINE_REPO:path.join(__dirname,"..");
const {createDisplayFixture}=require(path.join(root,"scripts/display-browser-fixture"));
const {observeBrowserErrors}=require("./browser-error-proof");
const output=process.env.DADRADAR_ARTIFACT_ROOT||path.join(__dirname,"../artifacts/airline-logo");
const groups=["flight-number","flight-origin","flight-destination","status-value"];
const brands=["american","united","delta","southwest","jetblue","alaska","allegiant"];
const codes=["AA","UA","DL","WN","B6","AS","G4"];
const near=(a,b,tolerance=.04)=>assert(Math.abs(a-b)<=tolerance,`${a} != ${b} (tolerance ${tolerance})`);
fs.mkdirSync(output,{recursive:true});
async function geometry(page) {
 return page.evaluate(ids=>({
  groups:ids.map(id=>({id,rect:document.getElementById(id).getBoundingClientRect().toJSON(),
   tiles:[...document.getElementById(id).children].map(n=>n.getBoundingClientRect().toJSON())})),
  neighbors:[...document.querySelectorAll(".destination-panel,.daily-schedule-panel,.vintage-map-panel,.route-map-shell,.sequence-mileage-badge,.weekly-overnight-bank,.weekly-overnight-bay,.instrument-slot,.twin-clock-art,.clock-wheel,.period-wheel")].map(n=>({id:n.id,class:n.className,rect:n.getBoundingClientRect().toJSON()}))
 }),groups);
}
async function settled(page) {
 await page.waitForFunction(()=>document.querySelectorAll(".flap-character").length>0&&[...document.querySelectorAll(".flap-character")].every(n=>!n._animationRunning&&!n.classList.contains("is-flipping")));
 await page.evaluate(()=>document.fonts.ready);
}
(async()=>{
 const fixture=createDisplayFixture();
 fixture.state.flight.marketingCarrierCode="AA";
 await new Promise(r=>fixture.server.listen(0,"127.0.0.1",r));
 const origin=`http://127.0.0.1:${fixture.server.address().port}`;
 const engine=process.env.DADRADAR_BROWSER_ENGINE||"chromium";
 const browser=await ({chromium,webkit})[engine].launch({headless:true,
  ...(engine==="chromium"&&process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:["--no-sandbox","--disable-dev-shm-usage"]}:{})});
 const result={engine,browser:browser.version(),viewport:[1920,1080],dpr:1,fixture:"Fictional scheduled AA3761 ORD–AVL EN ROUTE",geometry:{}};
 try {
  for(const [name,width,height,route] of [["primary",1920,1080,"/"],["phone-portrait",390,844,"/mobile"],["phone-landscape",844,390,"/mobile"],["tablet",1024,768,"/mobile/full"]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,timezoneId:"America/New_York",serviceWorkers:"block"});
   const errors=observeBrowserErrors(page);
   await page.clock.setFixedTime(new Date("2026-10-09T02:35:00Z"));
   await page.route("**/*",r=>r.request().url().startsWith(origin)||r.request().url().startsWith("blob:")?r.continue():r.abort());
   await page.goto(origin+route);await page.waitForSelector("#dashboard:not([hidden])");await settled(page);
   const measured=await geometry(page);result.geometry[name]=measured;
   fs.writeFileSync(path.join(output,`measured-${name}.json`),JSON.stringify(measured,null,2));
   if(baseline) {
    fs.writeFileSync(path.join(output,`baseline-${name}-geometry.json`),JSON.stringify(measured,null,2));
    await page.screenshot({path:path.join(output,`before-${name}.png`),fullPage:true});
    await page.close();continue;
   }
   const before=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/airline-logo-geometry",`baseline-${name}-geometry.json`)));
   assert.deepEqual(measured.neighbors,before.neighbors,`${name}: neighboring module rectangles unchanged`);
   assert.deepEqual(measured.groups.map(g=>g.tiles.length),[5,3,3,8]);
   const tiles=measured.groups.flatMap(g=>g.tiles);
   for(const tile of tiles){near(tile.width,tiles[0].width,.001);near(tile.height,tiles[0].height,.001);near(tile.height,before.groups[0].tiles[0].height,.02);}
   const spacing=g=>g.tiles.slice(1).map((t,i)=>t.left-g.tiles[i].right);
   for(let i=0;i<4;i++)for(const gap of spacing(measured.groups[i]))near(gap,spacing(before.groups[i])[0],.02);
   const gaps=gs=>gs.slice(1).map((g,i)=>g.tiles[0].left-gs[i].tiles.at(-1).right);
   const newGaps=gaps(measured.groups),oldGaps=gaps(before.groups);
   newGaps.forEach((g,i)=>near(g,oldGaps[i],name==="primary"?.001:.125));
   near(tiles[0].left,before.groups[0].tiles[0].left,name==="primary"?.001:.125);
   const oldRight=before.groups.at(-1).rect.right;
   assert(tiles.at(-1).right<=oldRight+(name==="primary"?.001:.125),`${name}: no strip overflow`);
   near(tiles.at(-1).right,oldRight,.3); // Native 1/64px CSS layout quantization, explicitly recorded.
   result.geometry[name].groupGaps=newGaps;
   result.geometry[name].rightEdgeResidual=tiles.at(-1).right-oldRight;
   const cells=page.locator(".flap-character"),logo=page.locator("#flight-number>.flap-character").first();
   assert((await cells.evaluateAll(ns=>ns.map(n=>getComputedStyle(n.querySelector(".flap-hardware-left")).backgroundImage))).every(s=>s.includes("experimental-v4/experimental-fixed.png")));
   assert((await cells.evaluateAll(ns=>ns.map(n=>getComputedStyle(n.querySelector(".flap-hardware-left")).backgroundSize))).every(s=>s==="auto 100%"));
   assert((await cells.evaluateAll(ns=>ns.map(n=>getComputedStyle(n,"::after").backgroundImage))).every(s=>s.includes("experimental-v3/warm-lighting.svg")));
   assert.equal(await logo.getAttribute("data-value"),"@american");
   await page.screenshot({path:path.join(output,`after-${engine}-${name}.png`),fullPage:true});
   if(name==="primary") {
    for(let i=0;i<brands.length;i++){
     // Exercise production renderState through the scheduled-flight state, not only a logo painter.
     const state=JSON.parse(JSON.stringify(fixture.state));state.flight.marketingCarrierCode=codes[i];
     state.flight.carrierCode="OO";state.flight.number="SKW3761";
     await page.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:s}})),state);await settled(page);
     assert.equal(await logo.getAttribute("data-value"),"@"+brands[i]);
     assert.equal(await page.locator("#flight-number").evaluate(n=>[...n.children].slice(1).map(n=>n.dataset.value).join("")),"3761");
     await page.evaluate(async brand=>{const image=new Image();image.src="/assets/airlines/"+brand+".svg";await image.decode();},brands[i]);
     const box=await page.locator("#flight-number").boundingBox();
     await page.screenshot({path:path.join(output,`bank-${brands[i]}.png`),clip:box});
     await page.screenshot({path:path.join(output,`dashboard-${brands[i]}.png`),fullPage:true});
    }
    const motion=await logo.evaluate(n=>{
     window.logoFlip=flipFlapOnce(n,"@american");
     const animations=n.getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains("flap-moving"));
     animations.forEach(a=>{a.pause();a.currentTime=100;});
     return animations.map(a=>({duration:a.effect.getTiming().duration,delay:a.effect.getTiming().delay,transform:getComputedStyle(a.effect.target).transform,href:a.effect.target.querySelector("image")?.getAttribute("href")}));
    });
    assert.equal(motion.length,2);assert.equal(motion[0].duration,190);assert.equal(motion[1].delay,185);
    assert.deepEqual(motion.map(m=>m.href),["/assets/airlines/allegiant.svg","/assets/airlines/american.svg"]);
    assert((await logo.locator(".flap-fixed-hardware").evaluate(n=>getComputedStyle(n).transform))==="none");
    await page.screenshot({path:path.join(output,"logo-indexing.png"),fullPage:true});
    await logo.evaluate(n=>n.getAnimations({subtree:true}).forEach(a=>a.play()));await page.evaluate(()=>window.logoFlip);
    assert.equal(await logo.getAttribute("data-value"),"@american");assert.equal(await logo.locator(".flap-moving").count(),0);
    result.motion=motion;
    await logo.evaluate(n=>{queueFlapAnimation(n,"@united",0);queueFlapAnimation(n,"@delta",0);});await settled(page);
    assert.equal(await logo.getAttribute("data-value"),"@delta","Latest scheduled carrier settles after rapid changes");
    const unknown=JSON.parse(JSON.stringify(fixture.state));unknown.flight.marketingCarrierCode="ZZ";unknown.flight.carrierCode="AA";
    await page.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:s}})),unknown);await settled(page);
    assert.equal(await logo.getAttribute("data-value")," ");await page.waitForFunction(()=>getComputedStyle(document.querySelector("#flight-number>.flap-character"),"::after").opacity==="0");
    await page.screenshot({path:path.join(output,"unknown-carrier.png"),fullPage:true});
    result.unknownFallback="blank, lamp off";
   }
   await errors(`airline-logo/${name}`);await page.close();
  }
  fs.writeFileSync(path.join(output,`${baseline?"baseline":"results"}-${engine}.json`),JSON.stringify(result,null,2));
  console.log(`${baseline?"Baseline":"Airline logo"} ${engine}: all viewport geometry, native animation, carrier and asset checks passed`);
 }finally{await browser.close();await new Promise(r=>fixture.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
