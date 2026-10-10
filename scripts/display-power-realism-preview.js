"use strict";
// Actual dashboard capture. Audio is recorded from browser output, including
// native mechanical samples; no unrelated sound is added after capture.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process"),{chromium}=require("playwright");
const {createDisplayFixture}=require("./display-browser-fixture");
const {server,state,root}=createDisplayFixture();
state.flight.marketingCarrierCode="AA";state.flight.scheduledCarrierCode="AA";
const output=path.join(root,"artifacts","power","realism-v2");
(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const mod=require("@sparticuz/chromium"),portable=mod.default||mod;
  const browser=await chromium.launch({headless:true,executablePath:await portable.executablePath(),args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
  try{
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:output,size:{width:1920,height:1080}}});
    await context.addInitScript(()=>{
      const Native=window.AudioContext||window.webkitAudioContext;
      const contexts=[];let master,recordOutput;
      window.__powerCapture={events:[]};
      const originalConnect=AudioNode.prototype.connect;
      function setupMaster(){
        if(master)return;master=new Native();recordOutput=master.createMediaStreamDestination();
        window.__powerCapture.master=master;window.__powerCapture.output=recordOutput;
      }
      window.AudioContext=class extends Native{
        constructor(...args){super(...args);setupMaster();const output=this.createMediaStreamDestination();
          this.__powerRecord=output;contexts.push(this);
          const bridge=master.createMediaStreamSource(output.stream);originalConnect.call(bridge,recordOutput);
        }
      };
      window.webkitAudioContext=window.AudioContext;
      AudioNode.prototype.connect=function(destination,...args){
        const result=originalConnect.call(this,destination,...args);
        if(destination===this.context.destination && this.context.__powerRecord)originalConnect.call(this,this.context.__powerRecord);
        return result;
      };
      const nativePlay=HTMLMediaElement.prototype.play,sources=new WeakMap();
      HTMLMediaElement.prototype.play=function(...args){
        setupMaster();if(!sources.has(this)){
          const source=master.createMediaElementSource(this);sources.set(this,source);
          originalConnect.call(source,master.destination);originalConnect.call(source,recordOutput);
        }
        return nativePlay.apply(this,args);
      };
      window.__powerCapture.start=async()=>{
        setupMaster();await master.resume();await Promise.all(contexts.map(c=>c.resume()));
        const recorder=new MediaRecorder(recordOutput.stream,{mimeType:"audio/webm;codecs=opus"});
        const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        window.__powerCapture.recorder=recorder;window.__powerCapture.chunks=chunks;
        window.__powerCapture.startAt=performance.now();recorder.start(100);
      };
      window.addEventListener("dad-radar:display-power-change",e=>{
        const log=window.__powerCapture.events,last=log.at(-1);
        if(!last||last.state!==e.detail.state)log.push({state:e.detail.state,at:performance.now(),elapsed:e.detail.elapsed});
      });
    });
    const page=await context.newPage();
    await page.route("**/*",r=>{
      if(r.request().url()===origin+"/api/calendar/upcoming"){
        const date=new Date();date.setUTCHours(14,0,0,0);
        const events=["AVL","ORD","MSN","ORD","AVL","AVL","AVL"].map((destination,index)=>{
          const start=new Date(date.getTime()+index*86400000),end=new Date(start.getTime()+7200000);
          return {kind:"flight",origin:"ORD",destination,start:start.toISOString(),end:end.toISOString()};
        });
        return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,events})});
      }
      return r.request().url().startsWith(origin)||r.request().url().startsWith("blob:")?r.continue():r.abort();
    });
    await page.goto(origin);await page.waitForSelector("#dashboard:not([hidden])");await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(2200);
    const bounds=()=>page.evaluate(()=>Object.fromEntries(["#flight-number","#flight-origin","#flight-destination","#status-value",".twin-clock-panel","#route-map-shell",".destination-poster-image",".daily-schedule-panel",".weekly-overnight-bank",".airspeed-instrument",".heading-instrument",".altimeter-instrument"].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
    const before=await bounds(),camera=await page.locator("#route-map-svg").getAttribute("viewBox");
    await page.screenshot({path:path.join(output,"on.png")});
    // Probe an exact optical-compression phase separately from the movie.
    if(process.env.DADRADAR_POWER_PROBE==="1"){
      await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
      await page.locator("#display-power-switch").evaluate(n=>n.click());
      await page.clock.fastForward(2500);
      await page.locator("#display-power-switch").evaluate(n=>n.click());
      for(let i=0;i<13;i++)await page.clock.fastForward(100);
      assert.equal(await page.locator(".power-crt-projection use").getAttribute("href"),"#route-map-svg");
      await page.screenshot({path:path.join(output,"crt-compression.png")});
      console.log("Optics",JSON.stringify(await page.evaluate(()=>[".power-crt-projection","#route-map-svg",".power-crt-screen"].map(s=>{const n=document.querySelector(s),c=getComputedStyle(n);return {s,opacity:c.opacity,visibility:c.visibility,display:c.display,transform:c.transform,rect:n.getBoundingClientRect().toJSON(),viewBox:n.getAttribute("viewBox")};}))));
      await page.clock.fastForward(1200);
      console.log("Illumination",JSON.stringify(await page.evaluate(()=>[".destination-poster-image",".daily-schedule-panel"].map(s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),p=document.querySelector(".display-power-curtain path");return {s,complete:n.complete,opacity:getComputedStyle(n).opacity,path:p.isPointInFill(new DOMPoint(r.x+r.width/2,r.y+r.height/2)),masks:[...document.querySelectorAll(".power-local-dark")].map(n=>({opacity:getComputedStyle(n).opacity,display:getComputedStyle(n).display,x:n.getAttribute("x")}))};}))));
      await page.screenshot({path:path.join(output,"crt-full.png")});
      console.log("CRT projection phase captured.");return;
    }
    // Put a tiny numbered synchronization marker outside all display modules.
    // Capture a frame with marker1 immediately before audio recording starts;
    // ffmpeg detects this marker to align actual browser audio to native video.
    await page.evaluate(()=>{
      const marker=document.createElement("div");marker.id="capture-sync";
      marker.style.cssText="position:fixed;left:0;bottom:0;width:12px;height:12px;z-index:99999;background:#000";
      document.body.appendChild(marker);
    });
    await page.evaluate(async()=>{await window.__powerCapture.start();document.getElementById("capture-sync").style.background="#ff00ff";});
    await page.waitForTimeout(450);
    await page.locator("#display-power-switch").click();
    await page.waitForFunction(()=>window.dadRadarDisplayPowerController.getState()==="off");
    await page.waitForTimeout(700);
    await page.locator("#display-power-switch").click();
    await page.waitForFunction(()=>window.dadRadarDisplayPowerController.getState()==="on");
    await page.waitForTimeout(1000);
    const capture=await page.evaluate(async()=>{
      const c=window.__powerCapture;await new Promise(resolve=>{c.recorder.onstop=resolve;c.recorder.stop();});
      const bytes=Array.from(new Uint8Array(await new Blob(c.chunks,{type:"audio/webm"}).arrayBuffer()));
      return {bytes,startAt:c.startAt,events:c.events,endedAt:performance.now()};
    });
    fs.writeFileSync(path.join(output,"browser-audio.webm"),Buffer.from(capture.bytes));delete capture.bytes;
    await page.evaluate(()=>document.getElementById("capture-sync").remove());
    await page.screenshot({path:path.join(output,"wake.png")});
    assert.deepEqual(await bounds(),before,"All module bounds unchanged");
    assert.equal(await page.locator("#route-map-svg").getAttribute("viewBox"),camera,"Live map camera unchanged");
    const video=page.video();await context.close();await video.saveAs(path.join(output,"native-video.webm"));
    const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
    fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify({sourceSha:git("rev-parse","HEAD"),sourceTree:git("rev-parse","HEAD^{tree}"),dirty:Boolean(git("status","--porcelain")),viewport:{width:1920,height:1080,dpr:1},browser:browser.version(),playwright:require("playwright/package.json").version,capturedAt:new Date().toISOString(),fixture:"Actual production HTML/build; fictional flight/calendar; no provider requests",audio:"Recorded actual browser WebAudio and HTMLAudio output; native existing split-flap sample plus power circuit and detents",timing:"Real-time native browser timers/RAF; software renderer, no Pi performance claim",physicalMonitorVerified:false,piPerformanceVerified:false,before,after:before,capture},null,2));
    console.log("Actual audiovisual cycle captured; geometry/camera unchanged.");
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
