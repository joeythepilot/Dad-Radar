"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/audio-control");
fs.mkdirSync(output, {recursive: true});
const state = {
  status:"EN ROUTE", message:"", locationAirport:"AVL", flight:{
    number:"3761",origin:"ORD",destination:"AVL",destinationCity:"ASHEVILLE",
    airspeed:438,heading:171,altitude:34000,progress:62,eta:"7:42 PM",
    latitude:37.3,longitude:-84.8
  },
  diagnostics:{shutterTestToken:"saved-command-before-page-load"},
  sequenceHistory:{totalDistanceNm:1468, completedLegCount:6, estimatedLegCount:6, legs:Array.from({length:6}, () => ({origin:"ORD",destination:"AVL"}))},
  dailySchedule:{dateLabel:"SUN SEP 13",timeZoneLabel:"EASTERN TIME",context:"DADDY IS HOME TODAY",entries:[
    {time:"7:58 AM",label:"ORD → BWI",tag:"FLT 3761",status:"completed",kind:"flight"},
    {time:"11:23 AM",label:"BWI → ORD",tag:"FLT 3762",status:"completed",kind:"flight"},
    {time:"3:00 PM",label:"ORD → AVL",tag:"COMMUTE",status:"completed",kind:"flight"}
  ]}
};
const now = new Date().toISOString();
const payload = {ok:true,revision:1,publishedAt:now,calendarOk:true,liveOk:true,calendarAt:now,liveAt:now,resolved:{mode:"EN_ROUTE",state,event:null}};
const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
// Use the server's exact family HTML expression, not a second hand-copied layout.
const serverCode = fs.readFileSync(path.join(root,"server/index.js"),"utf8");
const expression = serverCode.match(/const familyHtml = ([\s\S]*?);\n  response/)[1];
const fullHtml = new Function("displayHtml", `return ${expression};`)(html);
const types = {".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
const server = http.createServer((req,res) => {
  const url = new URL(req.url,"http://localhost");
  if (url.pathname === "/api/diagnostics/shutters-test" && req.method === "POST") {
    state.diagnostics.shutterTestToken = `intentional-${++payload.revision}`;
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({ok:true,token:state.diagnostics.shutterTestToken}));return;
  }
  if (url.pathname === "/api/calendar/upcoming") {
    res.setHeader("Content-Type","application/json");res.end(JSON.stringify({ok:true,events:[]}));return;
  }
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/weather")) {res.writeHead(204);res.end();return;}
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify(url.pathname.includes("/surface") ? {pending:true,retryAfterMs:3600000} : payload));return;
  }
  if (url.pathname === "/mobile/full") {res.setHeader("Content-Type","text/html");res.end(fullHtml);return;}
  const file = path.resolve(root,"." + (url.pathname === "/mobile" ? "/Mobile/index.html" : url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader("Content-Type",types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});



(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  for(const [name,width,height,route,touch] of [
   ['kiosk',1920,1080,'/',false],['diagnostic',1920,1080,'/?diagnostics=1',false],['family',844,390,'/mobile/full?layout=full',true],['phone',390,844,'/mobile/full?layout=full',true]
  ]) {
   const page=await browser.newPage({viewport:{width,height},hasTouch:touch});
   const settled=observeBrowserErrors(page);
   await page.addInitScript(()=>{
    window.audioProof={allow:false,failChime:false,calls:[],gestureOpen:false};
    window.addEventListener('click',()=>{
     audioProof.gestureOpen=true;
    },{capture:true});
    HTMLMediaElement.prototype.play=function(){
     const p=window.audioProof;
     p.calls.push({src:this.src,gesture:p.gestureOpen});
     queueMicrotask(()=>{p.gestureOpen=false;});
     if(!p.allow || !p.gestureOpen || (p.failChime && /chime/i.test(this.src)))return Promise.reject(new DOMException('Fixture autoplay blocked','NotAllowedError'));
     return Promise.resolve();
    };
   });
   await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
   await page.waitForSelector('#dashboard:not([hidden])');
   const control=page.locator('#beta-audio-button');
   if(name==='diagnostic') {
    await page.evaluate(()=>{audioProof.allow=true;audioProof.calls=[];});
    await page.locator('#diagnostic-chime-button').click();
    await page.getByText('CHIME PLAYED',{exact:true}).waitFor();
    const calls=await page.evaluate(()=>audioProof.calls.filter(call=>/chime/i.test(call.src)));
    assert.equal(calls.length,1,'First diagnostic chime click must not be interrupted by silent unlock calls');
    assert.match(calls[0].src,/chime/);
    await settled(name);await page.close();continue;
   }
   if(!touch){assert(await control.isHidden(),'Dedicated non-touch kiosk has no audio prompt');await page.close();continue;}
   await control.waitFor({state:'visible'});
   assert.equal(await control.getAttribute('aria-label'),'Enable sound');
   const box=await control.boundingBox();assert(box.width>=44&&box.width<=48&&box.height>=44&&box.height<=48,'Small speaker control retains a usable touch target');
   await page.screenshot({path:path.join(output,name+'.png')});
   // A failure must leave the control available for another attempt.
   await control.click();assert(await control.isVisible());
   await page.evaluate(()=>{audioProof.allow=true;audioProof.failChime=true;audioProof.calls=[];});
   await control.click();assert(await control.isVisible(),'Unlocking only one sound must not dismiss the control');
   await page.evaluate(()=>{audioProof.failChime=false;audioProof.calls=[];});
   if(name==='family')await page.mouse.click(10,10);else{await control.focus();await page.keyboard.press('Enter');}
   await control.waitFor({state:'hidden'});
   const calls=await page.evaluate(()=>audioProof.calls);
   const unlocks=calls.filter(c=>/split-flap|chime/i.test(c.src));
   assert(unlocks.length>=2,'Both audio elements receive activation');
   assert(unlocks.every(c=>c.gesture),'Both play requests start synchronously inside the same gesture');
   await page.evaluate(()=>{audioProof.calls=[];});
   await page.mouse.click(10,10);
   assert.equal((await page.evaluate(()=>audioProof.calls)).length,0,'Later taps do not interrupt already enabled sounds');
   await settled(name);await page.close();console.log(name+': compact control, retry, shared gesture and dismissal passed');
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
