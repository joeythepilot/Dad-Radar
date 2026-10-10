"use strict";
// Controlled-time capture of the production DOM and its native CSS animations.
// Software browser frame streaming dropped intermediate pictures; screenshots
// capture each authored time independently. This is NOT real-time/Pi evidence.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process"),{chromium}=require("playwright");
const {createDisplayFixture}=require("./display-browser-fixture");
const {server,state,root}=createDisplayFixture();
state.flight.marketingCarrierCode="AA";state.flight.scheduledCarrierCode="AA";
const output=path.join(root,"artifacts","power","frame-review-slower-native"),fps=20,step=1000/fps;
function wav(samples,rate){const b=Buffer.alloc(44+samples.length*2);b.write("RIFF");b.writeUInt32LE(b.length-8,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(samples.length*2,40);samples.forEach((s,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,s))*32767),44+i*2));return b;}
(async()=>{
 fs.mkdirSync(path.join(output,"frames"),{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const origin=`http://127.0.0.1:${server.address().port}`,mod=require("@sparticuz/chromium"),portable=mod.default||mod;
 const browser=await chromium.launch({headless:true,executablePath:await portable.executablePath(),args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--autoplay-policy=no-user-gesture-required"]});
 try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.addInitScript(()=>{
  window.__film={events:[],segments:[],media:new Map(),cues:new WeakMap(),active:false};
  const time=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,"currentTime");
  Object.defineProperty(HTMLMediaElement.prototype,"currentTime",{get(){const f=window.__film;return f.active&&f.cues.has(this)?f.cues.get(this):time.get.call(this);},set(value){const f=window.__film;if(f.active)f.cues.set(this,value);else time.set.call(this,value);},configurable:true});
  const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play=function(...args){const f=window.__film;if(!f.active)return play.apply(this,args);
   if(!f.media.has(this)){const info={paused:true};f.media.set(this,info);Object.defineProperty(this,"paused",{get:()=>info.paused});}
   const info=f.media.get(this);info.paused=false;info.segment={at:performance.now()-f.zero,src:this.src,offset:this.currentTime,volumes:[]};f.segments.push(info.segment);return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(...args){const f=window.__film,info=f.media.get(this);if(!f.active||!info)return pause.apply(this,args);if(!info.paused&&info.segment)info.segment.end=performance.now()-f.zero;info.paused=true;};
  window.addEventListener("dad-radar:display-power-change",e=>{const f=window.__film;if(f.active&&f.events.at(-1)?.state!==e.detail.state)f.events.push({type:"state",...e.detail,at:performance.now()-f.zero});});
  window.addEventListener("dad-radar:power-detent",e=>{const f=window.__film;if(f.active)f.events.push({type:"detent",kind:e.detail.kind,at:performance.now()-f.zero});});
 });
 await page.route("**/*",r=>{
  if(r.request().url()===origin+"/api/calendar/upcoming"){
   const date=new Date();date.setUTCHours(14,0,0,0);
   const events=["AVL","ORD","MSN","ORD","AVL","AVL","AVL"].map((destination,index)=>{const start=new Date(date.getTime()+index*86400000),end=new Date(start.getTime()+7200000);return {kind:"flight",origin:"ORD",destination,startUtc:start.toISOString(),endUtc:end.toISOString()};});
   return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,events})});
  }
  return r.request().url().startsWith(origin)||r.request().url().startsWith("blob:")?r.continue():r.abort();
 });
 await page.goto(origin);await page.waitForSelector("#dashboard:not([hidden])");await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800);
 await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 const bounds=()=>page.evaluate(()=>Object.fromEntries(["#flight-number","#flight-origin","#flight-destination","#status-value",".twin-clock-panel","#route-map-shell",".destination-poster-image",".daily-schedule-panel",".weekly-overnight-bank",".airspeed-instrument",".heading-instrument",".altimeter-instrument"].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
 const before=await bounds(),camera=await page.locator("#route-map-svg").getAttribute("viewBox");
 await page.screenshot({path:path.join(output,"on.png")});
 await page.evaluate(()=>{window.__film.zero=performance.now();window.__film.active=true;window.__film.animations=new Map();});
 // Start native CSS animations at the virtual time when their actual DOM node
 // first appears. Pause only capture-time animation clocks; retain keyframes,
 // easing, delays, real textured halves and animationend queue completions.
 async function pin(){await page.evaluate(()=>{
  const f=window.__film,now=performance.now()-f.zero;
  for(const a of document.getAnimations()){if(!f.animations.has(a)){f.animations.set(a,now);a.pause();}const elapsed=now-f.animations.get(a),end=a.effect.getComputedTiming().endTime;
   a.currentTime=elapsed;if(Number.isFinite(end)&&elapsed>=end){try{a.finish();}catch(_){}}}
  for(const [element,info] of f.media)if(!info.paused&&info.segment)info.segment.volumes.push({at:now,value:element.volume});
 });}
 const cdp=await page.context().newCDPSession(page);
 const limit=process.env.DADRADAR_FILM_LIMIT?Number(process.env.DADRADAR_FILM_LIMIT):15200;
 for(let t=0,index=0;t<limit;t+=step,index++){
  if(index)await page.clock.fastForward(step);
  if(t===500||t===5200)await page.locator("#display-power-switch").evaluate(n=>n.click());
  await pin();
  const frame=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,clip:{x:0,y:0,width:1920,height:1080,scale:2/3}});
  // CDP transports screenshot bytes internally; artifacts are saved/transferred
  // as ordinary binary files, never embedded image data for the user.
  fs.writeFileSync(path.join(output,"frames",`${String(index).padStart(4,"0")}.png`),Buffer.from(frame.data,"base64"));
  if(index%20===0)console.log(`Captured ${t/1000}s / ${limit/1000}s`);
 }
 const after=await bounds();assert.deepEqual(after,before);assert.equal(await page.locator("#route-map-svg").getAttribute("viewBox"),camera);
 assert.equal(await page.evaluate(()=>window.dadRadarDisplayPowerController.getState()),limit>=14200?"on":"starting");
 if(limit>=14200)assert.equal(await page.locator("#flight-number").evaluate(n=>Array.from(n.children).slice(1).map(cell=>cell.dataset.value).join("")),"3761","Wake ends with actual current flight digits");
 await page.screenshot({path:path.join(output,"wake.png")});
 const timeline=await page.evaluate(()=>({events:window.__film.events,segments:window.__film.segments}));
 for(const segment of timeline.segments.filter(s=>s.src.endsWith("/split-flap.mp3")&&s.volumes.some(v=>v.value>0)))assert.equal(segment.offset,5.195,"Use the configured production recording cue, not an unseeked media placeholder");
 // Production power sound graph and the existing flap sample are rendered at
 // the captured mechanism timestamps. This is synchronized offline audio,
 // explicitly not an acoustic recording or hardware performance assertion.
 const audio=await page.evaluate(async({timeline,seconds})=>{
  const rate=44100,offline=new OfflineAudioContext(1,Math.ceil(rate*seconds),rate);let cursor=0;
  function source(node){const start=node.start.bind(node),stop=node.stop.bind(node);node.start=(at,...args)=>start(at??cursor,...args);node.stop=at=>stop(at??cursor);node.disconnect=()=>{};return node;}
  const adapter={state:"running",get currentTime(){return cursor;},sampleRate:rate,destination:offline.destination,
   createOscillator:()=>source(offline.createOscillator()),createBufferSource:()=>source(offline.createBufferSource()),createGain:()=>offline.createGain(),createBuffer:(...args)=>offline.createBuffer(...args),resume:async()=>{}};
  const controller=window.dadRadarDisplayPowerAudio.createPowerAudio({audioContextFactory:()=>adapter,volume:window.dadRadarSettings?.audio?.splitFlap?.volume??.25});await controller.unlock();
  for(const e of timeline.events){cursor=e.at/1000;if(e.type==="state")controller.apply(e);else controller.mechanicalCue(e.kind);}
  for(const s of timeline.segments){const at=s.at/1000,end=Math.min(seconds,(s.end??seconds*1000)/1000);if(end<=at||!s.volumes.some(v=>v.value>0))continue;
   const buffer=await offline.decodeAudioData(await (await fetch(s.src)).arrayBuffer()),node=offline.createBufferSource(),gain=offline.createGain();node.buffer=buffer;node.connect(gain);gain.connect(offline.destination);
   gain.gain.setValueAtTime(s.volumes[0]?.value??0,at);for(const v of s.volumes)gain.gain.linearRampToValueAtTime(v.value,v.at/1000);
   node.start(at,s.offset);node.stop(Math.min(end,at+buffer.duration-s.offset));}
  return Array.from((await offline.startRendering()).getChannelData(0));
 },{timeline,seconds:limit/1000});
 fs.writeFileSync(path.join(output,"sound.wav"),wav(audio,44100));
 const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
 fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify({sourceSha:git("rev-parse","HEAD"),sourceTree:git("rev-parse","HEAD^{tree}"),dirty:!!git("status","--porcelain"),viewport:{width:1920,height:1080,dpr:1},previewFrame:{width:1280,height:720},fps,browser:browser.version(),capturedAt:new Date().toISOString(),fixture:"Production HTML/build; fictional shared flight; provider requests blocked",timing:"Frame-stepped production RAF/timers and native CSS keyframes; NOT real-time/Pi evidence",audio:"Production power audio graph + existing native split-flap sample rendered offline at captured event timestamps",physicalMonitorVerified:false,piPerformanceVerified:false,before,after,timeline},null,2));
 console.log("Controlled-time production animation captured; all measured module bounds and map camera unchanged.");
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
