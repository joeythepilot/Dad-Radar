"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {execFileSync}=require("node:child_process");
const {chromium, webkit} = require("playwright");
const {createDisplayFixture} = require("./display-browser-fixture");
const {observeBrowserErrors} = require("./browser-error-proof");
const engine = process.env.DADRADAR_BROWSER_ENGINE || "chromium";
const capture = process.env.DADRADAR_POWER_CAPTURE !== "0";
const {server,state,payload,root} = createDisplayFixture();
const output = path.join(process.env.DADRADAR_ARTIFACT_ROOT || path.join(root,"artifacts"),"power",engine);
const bounds = async page => page.evaluate(() => {
const result=Object.fromEntries([
  ".flight-board", ".twin-clock-panel", ".destination-poster-image", ".daily-schedule-panel",
  "#route-map-shell", ".sequence-mileage-badge", ".weekly-overnight-bank", ".instrument-rail",
  ".airspeed-instrument", ".heading-instrument", ".altimeter-instrument"
].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()]));
result.clockRows=Object.fromEntries(["current","eta"].map(row=>[row,Array.from(document.querySelectorAll(`[data-clock="${row}"] .clock-wheel,[data-period="${row}"].period-wheel`),n=>n.getBoundingClientRect().toJSON())]));
result.flapHardware=Array.from(document.querySelectorAll(".flap-fixed-hardware"),n=>n.getBoundingClientRect().toJSON());
return result;});
(async () => {
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let launch = {headless:true};
  if (process.env.DADRADAR_PORTABLE_CHROMIUM === "1") {
    const portableModule = require("@sparticuz/chromium");
    const portable = portableModule.default || portableModule;
    launch = {...launch,executablePath:await portable.executablePath(),args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]};
  }
  const browser = await ({chromium,webkit})[engine].launch(launch);
  const sourceSha=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
  const sourceTree=execFileSync("git",["rev-parse","HEAD^{tree}"],{cwd:root,encoding:"utf8"}).trim();
  const dirty=Boolean(execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).trim());
  const capturedAt=new Date().toISOString();
  try {
    const context = await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,
      ...(capture?{recordVideo:{dir:output,size:{width:1920,height:1080}}}:{}), serviceWorkers:"block"});
    const page=await context.newPage(), errors=observeBrowserErrors(page);
    const screenshot = name => capture ? page.screenshot({path:path.join(output,name),timeout:60000}) : Promise.resolve();
    // Sample phases rather than skipping directly to the deadline. Mechanical
    // queues await real timer/animation completions and must get intermediate
    // frames/microtasks, otherwise they only begin when a one-shot jump ends.
    const advance=async ms=>{for(let remaining=ms;remaining>0;remaining-=100)await page.clock.fastForward(Math.min(100,remaining));};
    await page.route("**/*",r=>r.request().url().startsWith(origin)||r.request().url().startsWith("blob:")?r.continue():r.abort());
    await page.goto(origin);
    await page.waitForSelector("#dashboard:not([hidden])",{timeout:30000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1600);
    // Freeze virtual time for exact phase captures; live HTTP fetches still run.
    // This also avoids chasing a moving SVG during software-renderer screenshots.
    await page.clock.install();
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    const before=await bounds(page);
    const mapBounds=await page.locator(".route-map-svg").boundingBox();
    await screenshot("before.png");console.log("Baseline measured");
    assert.equal(await page.locator("#display-power-switch").count(),1,"Primary power switch exists");
    await page.locator("#display-power-switch").evaluate(button=>button.click());
    console.log("Shutdown commanded");
    await advance(2050);
    assert.deepEqual(await page.locator(".route-map-svg").boundingBox(),mapBounds,"CRT collapse cannot corrupt live map camera measurement bounds");
    console.log("Shutdown dot phase advanced");
    await screenshot("shutdown-dot.png");
    await advance(600);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"off");
    await screenshot("off.png");
    {
      assert(await page.locator(".flap-character").evaluateAll(nodes=>nodes.every(n=>n.dataset.value===" ")),"Off flaps mechanically blank without removing hardware");
      assert(await page.locator("[data-drum]").evaluateAll(nodes=>nodes.every(n=>n.getAttribute("data-digit")==="")),"Off clock drums mechanically blank");
      assert(await page.locator(".weekly-overnight-bay").evaluateAll(nodes=>nodes.length===7&&nodes.every(n=>n.dataset.powerCharacters==="    ")),"Seven weekly bays blank independently of live schedule");
    }
    const oldRevision=payload.revision;
    state.flight.number="2681";state.flight.origin="ATL";state.flight.destination="MSN";
    state.flight.marketingCarrierCode="DL";state.flight.scheduledCarrierCode="DL";
    state.flight.calendarLegKey="power-test-replacement"; payload.revision++;
    await page.clock.resume();
    await page.waitForFunction(()=>document.querySelector("#flight-destination")?.getAttribute("aria-label")==="MSN",{timeout:15000});
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    assert(payload.revision>oldRevision,"Shared state replacement occurred while off");
    await page.locator("#display-power-switch").evaluate(button=>button.click());
    await advance(300);await screenshot("startup-bloom.png");
    await advance(1000);await screenshot("startup-raster.png");
    await advance(1000);await screenshot("startup-mechanics.png");
    assert.deepEqual(await bounds(page),before,"Intermediate indexing leaves module and fixed hardware geometry unchanged");
    await advance(2900);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on");
    assert(await page.evaluate(()=>{
      const r=document.querySelector(".sequence-mileage-badge").getBoundingClientRect();
      return !document.querySelector(".display-power-curtain > path").isPointInFill(new DOMPoint(r.left+r.width/2,r.top+r.height/2));
    }),"Map/counter overlapping apertures form a union, not an XOR black patch");
    assert.equal(await page.locator("#flight-number").evaluate(node=>Array.from(node.children).slice(1).map(n=>n.dataset.value).join("")),"2681","Wake paints newest flight digits");
    assert.equal(await page.locator("#flight-destination").evaluate(node=>Array.from(node.children).map(n=>n.dataset.value).join("")),"MSN","Wake paints newest route, not hidden old characters");
    assert(await page.locator('[data-clock="current"] [data-drum]').evaluateAll(nodes=>nodes.some(n=>n.getAttribute("data-digit")!=="")),"Current-time drums synchronize on wake");
    assert(await page.locator("#airspeed-needle,#altitude-needle").evaluateAll(nodes=>nodes.every(n=>!n.style.rotate)),"Settled sweep relinquishes presentation override to live needles");
    await screenshot("on.png");
    const after=await bounds(page);
    assert.deepEqual(after,before,"All settled module rectangles remain unchanged");
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(450);
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(300);
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(250);
    await page.locator("#display-power-switch").evaluate(button=>button.click());
    await advance(5200);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on");
    assert.deepEqual(await bounds(page),before,"Reversals cannot move modules");
    // A long background pause must settle the newest mechanical targets in
    // the first resumed on frame, not expose blank drums then start a new roll.
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(2650);
    state.flight.number="3498";state.flight.calendarLegKey="power-background-replacement";payload.revision++;
    await page.clock.resume();
    await page.waitForFunction(()=>document.querySelector("#flight-number")?.getAttribute("aria-label")?.includes("3498"),{timeout:15000});
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    await page.locator("#display-power-switch").evaluate(button=>button.click());await page.clock.fastForward(60000);
    assert.equal(await page.locator("#flight-number").evaluate(node=>Array.from(node.children).slice(1).map(n=>n.dataset.value).join("")),"3498","Background resumption exposes latest digits immediately");
    assert.equal(await page.locator(".weekly-overnight-bank").getAttribute("data-animating"),"false","Background wake settles painted weekly wheels immediately");
    const clockPaint=await page.locator(".drum-print,.period-print").evaluateAll(nodes=>nodes.map(n=>({name:getComputedStyle(n).animationName,active:n.getAnimations().map(a=>a.playState),row:n.closest("[data-clock]")?.getAttribute("data-clock"),value:n.parentNode.getAttribute("data-digit")})));
    assert(clockPaint.every(n=>n.name==="none"&&n.active.length===0),"Background wake leaves clock ink settled, not newly indexing: "+JSON.stringify(clockPaint));
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(250);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"off");
    assert(await page.locator("#airspeed-needle,#altitude-needle").evaluateAll(nodes=>nodes.every(n=>!n.style.rotate)),"Reduced motion does not sweep needles");
    await page.clock.resume();
    await page.setViewportSize({width:1600,height:900});
    await page.waitForFunction(()=>document.querySelector(".display-power-curtain").getAttribute("viewBox")==="0 0 1600 900");
    assert.equal(await page.locator(".display-power-curtain").getAttribute("viewBox"),"0 0 1600 900","Off curtain tracks display resize");
    await page.setViewportSize({width:1920,height:1080});
    await page.waitForFunction(()=>document.querySelector(".display-power-curtain").getAttribute("viewBox")==="0 0 1920 1080");
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    await page.locator("#display-power-switch").evaluate(button=>button.click());await advance(250);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on");
    assert.deepEqual(await bounds(page),before,"Resizing/reduced motion cannot alter restored module bounds");
    // Fault the real DOM adapter once. Its coordinator must fail open without
    // unmounting the live dashboard or leaving a black/interaction mask stuck.
    await page.evaluate(()=>{
      const html=document.documentElement,original=html.setAttribute;
      html.setAttribute=function(name,value){if(name==="data-display-power"&&value==="stopping"){html.setAttribute=original;throw Error("Injected power render fault");}return original.call(this,name,value);};
      window.dadRadarDisplayPowerController.setDisplayPower(false);
    });
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on","Renderer fault fails open");
    assert.equal(await page.locator(".display-power-curtain").evaluate(n=>n.style.opacity),"0");
    assert.equal(await page.locator(".power-crt-screen").evaluate(n=>n.style.visibility),"visible");
    assert.equal(await page.locator("#dashboard").evaluate(n=>n.inert),false);
    await page.clock.resume();
    await errors("display-power primary");
    const video=page.video();await context.close();
    if(video)await video.saveAs(path.join(output,"power-cycle.webm"));
    for(const route of ["/mobile","/mobile/full"]){
      const family=await browser.newPage({viewport:{width:844,height:390}});
      await family.goto(origin+route);await family.waitForSelector("#dashboard:not([hidden])",{timeout:30000});
      assert.equal(await family.locator("#display-power-switch,.display-power-curtain,.power-crt-screen").count(),0,"Family layout has no power adapters");
      await family.close();
    }
    fs.writeFileSync(path.join(output,"geometry.json"),JSON.stringify({sourceSha,sourceTree,dirty,capturedAt,browser:browser.version(),playwright:require("playwright/package.json").version,timing:"Controlled virtual clock; not real-time/Pi performance",viewport:{width:1920,height:1080,dpr:1},engine,capture,fixture:"Fictional shared server state; no provider calls",before,after},null,2));
    console.log(`Display power/${engine}: switch, newest data while off, geometry, reversals and family isolation passed.`);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
