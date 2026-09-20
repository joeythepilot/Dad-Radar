"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/paper-chart");
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
  if (url.pathname === "/api/airports/AVL/surface") {
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({map:{code:"AVL",fetchedAt:now,features:[
      {kind:"runway",label:"17/35",width:45,closed:false,points:[[-82.547,35.448],[-82.532,35.421]]},
      {kind:"taxiway",label:"A",width:17,closed:false,points:[[-82.55,35.449],[-82.547,35.435],[-82.535,35.42]]},
      {kind:"apron",closed:true,points:[[-82.548,35.44],[-82.545,35.432],[-82.55,35.431],[-82.553,35.439]]},
      {kind:"terminal",closed:true,points:[[-82.551,35.439],[-82.55,35.434],[-82.551,35.434],[-82.553,35.439]]}
    ]}})); return;
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


async function inspect(page,name) {
  await page.waitForFunction(()=>document.querySelectorAll('.chart-label').length>0);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(250);
  const proof=await page.evaluate(()=>{
    const svg=document.querySelector('.route-map-svg'),r=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
    const paper=document.querySelector('#map-aged-paper');
    return {rect:r.toJSON(),viewBox:{x:v.x,y:v.y,width:v.width,height:v.height},
      paper:Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(paper.getAttribute(k))])),
      title:!!document.querySelector('.chart-sheet-title'),
      compassFilter:getComputedStyle(document.querySelector('.map-compass-rose')).filter,
      labels:[...document.querySelectorAll('.chart-printed-lettering')].map(n=>({text:n.getAttribute('aria-label'),paths:n.querySelectorAll('path').length,rect:n.getBoundingClientRect().toJSON()})),
      home:!!document.querySelector('.chart-home'),
      hardware:[...document.querySelectorAll('.airport-placard,.map-compass-rose,.sequence-mileage-badge')].map(n=>n.getBoundingClientRect().toJSON()).filter(r=>r.width&&r.height),
      relief:getComputedStyle(document.querySelector('.map-terrain-relief')).opacity,
      paperOpacity:getComputedStyle(paper).opacity};
  });
  for(const key of ['x','y','width','height'])assert(Math.abs(proof.paper[key]-proof.viewBox[key])<.011,'Paper follows the live camera within its existing two-decimal viewBox rounding');
  assert(!proof.title,'Unwanted chart title is removed');
  assert.equal(proof.compassFilter,'none','Compass preserves crisp vector edges');
  assert(proof.labels.length>0&&proof.labels.every(l=>l.paths>0),'All geographic lettering uses actual outlines');
  if(/midwest|home|returned/.test(name))assert(proof.home,'Asheville remains marked independently of the current flight');
  assert.equal(proof.relief,'0.48');assert.equal(proof.paperOpacity,'0.48');
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  for(const [i,label] of proof.labels.entries()) {
    const r=label.rect,v=proof.rect;
    assert(r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1,name+': label clipped: '+label.text);
    for(const other of proof.labels.slice(i+1))assert(!overlaps(r,other.rect),name+': overlapping '+label.text+' / '+other.text);
    for(const hardware of proof.hardware)assert(!overlaps(r,hardware),name+': label under hardware: '+label.text);
  }
  await page.locator('.route-map-shell').screenshot({path:path.join(output,name+'.png')});
  console.log(name+': '+proof.labels.length+' readable labels; paper and fonts verified');
  return {name,...proof};
}
async function showState(page,next) {
  await page.evaluate(state=>window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state}})),next);
  await page.waitForTimeout(650);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 const results=[];
 try {
  for(const [name,width,height,url] of [['kiosk',1920,1080,'/'],['family',844,390,'/mobile/full?layout=full'],['compact',390,844,'/mobile?layout=compact']]) {
   const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
   const settled=observeBrowserErrors(page),failed=[];
   page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
   await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
   await page.goto(origin+url,{waitUntil:'load'});
   await page.waitForTimeout(1200);
   results.push(await inspect(page,name+'-midwest'));
   if(name==='kiosk') {
    for(const [region,from,to,latitude,longitude] of [['west','SEA','LAX',40,-121],['canada','YVR','YYZ',51,-108],['mexico','DFW','MEX',25,-101],['caribbean','MIA','SJU',21,-73],['continental','JFK','LAX',40,-103]]) {
     await showState(page,{...state,flight:{...state.flight,origin:from,destination:to,latitude,longitude}});
     results.push(await inspect(page,region));
    }
    await showState(page,{status:'HOME',locationAirport:'AVL',flight:null});
    results.push(await inspect(page,'home'));
    const ground={...state,flight:{...state.flight,latitude:35.436,longitude:-82.541,altitude:2100,surfacePosition:{latitude:35.436,longitude:-82.541,onGround:true,source:'adsb_lol',recordedAt:new Date().toISOString(),heading:170}}};
    await showState(page,ground);
    await page.waitForSelector('.route-map-shell.is-surface-registered',{timeout:7000});
    const surface=await page.locator('.airport-surface-layer').evaluate(n=>({paper:getComputedStyle(n,'::before').backgroundImage,runway:getComputedStyle(n.querySelector('.airport-surface-runway')).fill,taxiway:getComputedStyle(n.querySelector('.airport-surface-taxiway')).fill,font:getComputedStyle(n.querySelector('.airport-surface-label')).fontFamily}));
    assert.match(surface.paper,/aged-chart-paper/);assert.equal(surface.runway,'none');assert.equal(surface.taxiway,'none');assert.match(surface.font,/DadRadar Chart Antique/);
    await page.locator('.route-map-shell').screenshot({path:path.join(output,'airport.png')});
    await showState(page,{...state,flight:{...state.flight,surfacePosition:{...ground.flight.surfacePosition,onGround:false}}});
    await page.waitForFunction(()=>!document.querySelector('.route-map-shell').className.match(/is-surface-registered|map-roll-to-/),null,{timeout:7000});
    results.push(await inspect(page,'returned-regional'));
   }
   await page.setViewportSize({width:name==='kiosk'?1440:height,height:name==='kiosk'?900:width});
   await page.waitForTimeout(500);
   results.push(await inspect(page,name+'-resized'));
   await settled(name);assert.deepEqual(failed,[],name+': local assets load');await page.close();
  }
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
  console.log('Paper-chart Chromium checks passed: regional coverage, resize, font/label fitting and actual airport roll.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
