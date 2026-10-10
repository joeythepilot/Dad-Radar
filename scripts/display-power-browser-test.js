"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {chromium, webkit} = require("playwright");
const {createDisplayFixture} = require("./display-browser-fixture");
const {observeBrowserErrors} = require("./browser-error-proof");
const engine = process.env.DADRADAR_BROWSER_ENGINE || "chromium";
const capture = process.env.DADRADAR_POWER_CAPTURE !== "0";
const {server,state,payload,root} = createDisplayFixture();
const output = path.join(process.env.DADRADAR_ARTIFACT_ROOT || path.join(root,"artifacts"),"power",engine);
const bounds = async page => page.evaluate(() => Object.fromEntries([
  ".flight-board", ".twin-clock-panel", ".destination-poster-image", ".daily-schedule-panel",
  "#route-map-shell", ".sequence-mileage-badge", ".weekly-overnight-bank", ".instrument-rail"
].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));
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
  try {
    const context = await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,
      ...(capture?{recordVideo:{dir:output,size:{width:1920,height:1080}}}:{}), serviceWorkers:"block"});
    const page=await context.newPage(), errors=observeBrowserErrors(page);
    const screenshot = name => capture ? page.screenshot({path:path.join(output,name),timeout:60000}) : Promise.resolve();
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
    await screenshot("before.png");console.log("Baseline measured");
    assert.equal(await page.locator("#display-power-switch").count(),1,"Primary power switch exists");
    await page.locator("#display-power-switch").evaluate(button=>button.click());
    console.log("Shutdown commanded");
    await page.clock.fastForward(2050);
    console.log("Shutdown dot phase advanced");
    await screenshot("shutdown-dot.png");
    await page.clock.fastForward(600);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"off");
    await screenshot("off.png");
    if(process.env.DADRADAR_POWER_MECHANICAL==="1"){
      assert(await page.locator(".flap-character").evaluateAll(nodes=>nodes.every(n=>n.dataset.value===" ")),"Off flaps mechanically blank without removing hardware");
      assert(await page.locator("[data-drum]").evaluateAll(nodes=>nodes.every(n=>n.getAttribute("data-digit")==="")),"Off clock drums mechanically blank");
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
    await page.clock.fastForward(300);await screenshot("startup-bloom.png");
    await page.clock.fastForward(1000);await screenshot("startup-raster.png");
    await page.clock.fastForward(3900);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on");
    await screenshot("on.png");
    const after=await bounds(page);
    assert.deepEqual(after,before,"All settled module rectangles remain unchanged");
    await page.locator("#display-power-switch").evaluate(button=>button.click());await page.clock.fastForward(450);
    await page.locator("#display-power-switch").evaluate(button=>button.click());await page.clock.fastForward(300);
    await page.locator("#display-power-switch").evaluate(button=>button.click());await page.clock.fastForward(250);
    await page.locator("#display-power-switch").evaluate(button=>button.click());
    await page.clock.fastForward(5200);
    assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),"on");
    assert.deepEqual(await bounds(page),before,"Reversals cannot move modules");
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
    fs.writeFileSync(path.join(output,"geometry.json"),JSON.stringify({viewport:{width:1920,height:1080,dpr:1},engine,capture,fixture:"Fictional shared server state; no provider calls",before,after},null,2));
    console.log(`Display power/${engine}: switch, newest data while off, geometry, reversals and family isolation passed.`);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
