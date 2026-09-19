"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/approved-artwork");
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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,
   ...(process.env.DADRADAR_BROWSER_EXECUTABLE ? {executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']} : {})});
 try {
 const results=[];
 for (const [name,width,height,route] of [
   ['kiosk',1920,1080,'/'],['desktop',1440,900,'/'],['tablet',1024,768,'/'],
   ['family-landscape',844,390,'/mobile/full?layout=full'],['family-portrait',390,844,'/mobile/full?layout=full']
 ]) {
   console.log('Checking '+name);
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   const assertBrowserSettled = observeBrowserErrors(page);
   page.on('response',r=>{
     if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);
   });
   await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
   await page.waitForSelector('#dashboard:not([hidden])').catch(async e=>{console.log(await page.evaluate(()=>({url:location.href,boot:document.querySelector('.status-message')?.textContent,html:document.documentElement.outerHTML.slice(0,700)})));throw e;});
   await page.waitForFunction(()=>document.querySelector('#eta-value').textContent==='7:42 PM');
   await page.waitForFunction(()=>document.querySelector('#destination-poster').naturalWidth>0);
   assert.equal(await page.locator('.destination-stage').evaluate(node=>getComputedStyle(node).backgroundImage), 'none',
     'The loaded poster must have one foreground rendering path.');
   assert.equal(await page.locator('.twin-clock-panel').count(),1,'Approved single twin-clock housing must exist');
   assert.equal(await page.locator('.clock-block,.eta-block,.clock-support-rod').count(),0,'Old housings and mounts removed');
   const geometry=await page.evaluate(()=>{
     const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
     const clock=document.querySelector('.twin-clock-art');
     const ink=[...clock.querySelectorAll('text')].map(n=>({id:n.id,box:((r)=>({x:r.x,y:r.y,width:r.width,height:r.height}))(n.getBBox()),text:n.textContent}));
     return {panel:box('.twin-clock-panel'),strip:box('.flight-strip-module'),rail:box('.instrument-rail'),
       ink,artHeight:824*clock.getScreenCTM().d,artWidth:1418*clock.getScreenCTM().a,scale:clock.getScreenCTM().toString(),weekly:document.querySelectorAll('.weekly-overnight-bay').length,
       gauge:document.querySelectorAll('.instrument-slot').length,
       board:box('.flight-board'),tiles:[...document.querySelectorAll('.flap-character')].map(n=>n.getBoundingClientRect().toJSON())};
   });
   assert(Math.abs(geometry.panel.left-geometry.rail.left)<1,'Clock aligns with rail left');
   assert(Math.abs(geometry.panel.right-geometry.rail.right)<1,'Clock aligns with rail right');
   assert(Math.abs(geometry.panel.height-geometry.strip.height)<1,'Clock bay matches split-flap height');
   assert(Math.abs(geometry.artHeight-geometry.strip.height)<2,'Visible clock housing matches split-flap height');
   assert(Math.abs(geometry.artWidth-geometry.rail.width)<2,'Visible clock housing matches rail width');
   assert.equal(geometry.weekly,7);assert.equal(geometry.gauge,3);
   for(const tile of geometry.tiles)assert(tile.left>=geometry.board.left-1&&tile.right<=geometry.board.right+1,'Split-flap tiles remain inside board');
   for (const eta of ['7:42 PM','--:--','DELAYED','ARRIVED','AWAITING UPDATED ARRIVAL TIME']) {
     // Exercise the existing render function; the artwork must consume its output.
     await page.evaluate(value=>updateDashboard({...dadRadarVisualState,flight:{...dadRadarVisualState.flight,eta:value}}),eta);
     await page.waitForTimeout(30);
     const ink=await page.locator('#eta-value').evaluate(n=>({box:((r)=>({x:r.x,y:r.y,width:r.width,height:r.height}))(n.getBBox()),text:n.textContent}));
     assert.equal(ink.text,eta);assert(ink.box.x>=360&&ink.box.x+ink.box.width<=1415,'ETA remains within parchment width');
     assert(ink.box.y>=535&&ink.box.y+ink.box.height<=715,'ETA avoids plaques/frame');
   }
   await page.evaluate(()=>updateDashboard(dadRadarVisualState));
   const timeBefore=await page.locator('#clock-value').textContent();
   await page.waitForFunction(before=>document.querySelector('#clock-value').textContent!==before,timeBefore);
   const clockInk=await page.locator('#clock-value').evaluate(n=>((r)=>({x:r.x,y:r.y,width:r.width,height:r.height}))(n.getBBox()));
   assert(clockInk.x>=360&&clockInk.x+clockInk.width<=1415&&clockInk.y>=155&&clockInk.y+clockInk.height<=340,'Clock remains within upper parchment');
   await page.waitForFunction(()=>[...document.querySelectorAll('.sequence-housing-art image')].length===1);
   const assets=await page.evaluate(async()=>{
     const paths=[...document.querySelectorAll('image,img')].map(n=>n.getAttribute('href')||n.getAttribute('src')).filter(s=>s&&/assets\/hardware\/(airport-|instrument-)/.test(s));
     return Promise.all([...new Set(paths)].map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({src,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>resolve({src,w:0});i.src=src;})));
   });
   assert.equal(assets.length,7);assert(assets.every(a=>a.w>0),'Approved map and wheel PNGs decode');
   const fitting=await page.locator('.airport-leader-fitting').first().getAttribute('transform');
   assert.match(fitting,/translate\(.+\) rotate\(/,'End fitting follows positioned leader');
   const edgeError=await page.locator('.airport-leader-fitting').first().evaluate(n=>{
     const leader=n.parentElement.querySelector('.airport-leader');
     const transform=n.parentElement.querySelector('.airport-placard').transform.baseVal.consolidate().matrix;
     const x=transform.e+66,y=transform.f+36,d=Math.hypot(x,y);
     const edge=Math.min(63.5/Math.abs(x/d),19.4/Math.abs(y/d));
     return Math.abs(Math.hypot(+leader.getAttribute('x2'),+leader.getAttribute('y2'))-(d-edge+1));
   });
   assert(edgeError<.2,'Fitting socket attaches to the new shallow plaque edge');
   const mount=await page.locator('.sequence-mileage-badge').evaluate(n=>{
     const r=n.getBoundingClientRect(),map=n.parentElement.getBoundingClientRect();
     return {left:r.left+r.width*.0333-map.left,bottom:map.bottom-(r.bottom-r.height*.0573)};
   });
   assert(mount.left>=0&&mount.left<=2,`${name}: leg tracker anchors to map left edge`);
   assert(mount.bottom>=0&&mount.bottom<=2,`${name}: leg tracker meets lower bezel`);
   assert.equal(await page.locator('.sequence-support-rod').count(),0,`${name}: no brass leg beneath tracker`);
   const sequenceInk=await page.locator('.sequence-mileage-detail').evaluate(n=>{
     const range=document.createRange();range.selectNodeContents(n);
     const r=range.getBoundingClientRect(),w=n.getBoundingClientRect();
     return {text:n.textContent,contained:r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1};
   });
   assert(sequenceInk.contained,`${name}: sequence detail stays within its metal footer: ${sequenceInk.text}`);
   await require("./instrument-wheels-browser-proof").checkInstrumentWheels(page,name);
   await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true});
   await assertBrowserSettled(name);
   assert.deepEqual(errors,[],`${name}: no missing asset errors`);
   if(name==='kiosk') {
     await page.setViewportSize({width:1366,height:768});
     await page.waitForTimeout(100);
     const centered=await page.locator('#eta-value').evaluate(n=>Math.abs(n.getBBox().x+n.getBBox().width/2-887)<1);
     assert(centered,'Live ETA remains centered on an existing page after resize');
     await page.locator('.twin-clock-panel').evaluate(n=>n.style.display='none');
     await page.locator('#eta-value').evaluate(n=>n.textContent='AWAITING UPDATED ARRIVAL TIME');
     await page.waitForTimeout(30);
     await page.locator('.twin-clock-panel').evaluate(n=>n.style.removeProperty('display'));
     await page.waitForFunction(()=>document.querySelector('#eta-value').getComputedTextLength()<=1011);
   }
   results.push({name,geometry,assets});await page.close();
 }
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
 console.log('Approved artwork browser checks passed: '+results.map(r=>r.name).join(', '));
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
