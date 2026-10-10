"use strict";
// Real-time review capture, separate from virtual-clock regression evidence.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process"),{chromium}=require("playwright");
const {createDisplayFixture}=require("./display-browser-fixture");
const {server,root}=createDisplayFixture(),output=path.join(root,"artifacts","power","review");
function wav(samples,rate){
  const b=Buffer.alloc(44+samples.length*2);b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVEfmt ",8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(b.length-44,40);
  samples.forEach((s,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,s))*32767),44+i*2));return b;
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;let launch={headless:true};
  if(process.env.DADRADAR_PORTABLE_CHROMIUM==="1"){
    const m=require("@sparticuz/chromium"),portable=m.default||m;
    launch={...launch,executablePath:await portable.executablePath(),args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]};
  }
  const browser=await chromium.launch(launch);
  try{
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:output,size:{width:1920,height:1080}}});
    const page=await context.newPage();
    await page.route("**/*",r=>r.request().url().startsWith(origin)||r.request().url().startsWith("blob:")?r.continue():r.abort());
    await page.goto(origin);await page.waitForSelector("#dashboard:not([hidden])");await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(4000);await page.screenshot({path:path.join(output,"dashboard-on.png")});
    const camera=await page.locator("#route-map-svg").getAttribute("viewBox");
    await page.locator("#display-power-switch").click();await page.waitForFunction(()=>window.dadRadarDisplayPowerController.getState()==="off");
    await page.screenshot({path:path.join(output,"dashboard-off.png")});await page.waitForTimeout(500);
    await page.locator("#display-power-switch").click();await page.waitForFunction(()=>window.dadRadarDisplayPowerController.getState()==="on");
    await page.waitForTimeout(1000);await page.screenshot({path:path.join(output,"dashboard-wake.png")});
    assert.equal(await page.locator("#route-map-svg").getAttribute("viewBox"),camera,"Same-flight power cycle preserves live camera");
    const geometry=await page.evaluate(()=>Object.fromEntries([".flight-board",".twin-clock-panel","#route-map-shell",".destination-poster-image",".daily-schedule-panel",".weekly-overnight-bank",".instrument-rail"].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
    // Video is silent. Audition the actual production envelopes separately.
    for(const state of ["starting","stopping"]){
      const samples=await page.evaluate(async state=>{
        const rate=44100,offline=new OfflineAudioContext(1,rate*3,rate);
        const adapter={state:"running",currentTime:0,destination:offline.destination,createGain:()=>offline.createGain(),createOscillator:()=>offline.createOscillator()};
        const audio=window.dadRadarDisplayPowerAudio.createPowerAudio({audioContextFactory:()=>adapter,volume:.68});
        await audio.unlock();audio.apply({state,generation:1,elapsed:0,duration:state==="starting"?5000:2400});
        return Array.from((await offline.startRendering()).getChannelData(0));
      },state);
      assert(samples.some(s=>s!==0));fs.writeFileSync(path.join(output,`${state}-provisional.wav`),wav(samples,44100));
    }
    const video=page.video();await context.close();await video.saveAs(path.join(output,"power-cycle-realtime.webm"));
    const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
    fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify({sourceSha:git("rev-parse","HEAD"),sourceTree:git("rev-parse","HEAD^{tree}"),dirty:Boolean(git("status","--porcelain")),capturedAt:new Date().toISOString(),browser:browser.version(),playwright:require("playwright/package.json").version,viewport:{width:1920,height:1080,dpr:1},fixture:"Actual production HTML/build, fictional server state; no provider calls",timing:"Real-time RAF/timers, no virtual clock",audio:"Separate production Web Audio offline WAV audition; video silent",physicalMonitorVerified:false,piPerformanceVerified:false,geometry},null,2));
    console.log("Real-time browser motion and provisional audio audition captured.");
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
