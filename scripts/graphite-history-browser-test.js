"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/graphite-history");
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
const outbound=[{latitude:41.97689,longitude:-87.89888},{latitude:41.4,longitude:-86.1},{latitude:40.7,longitude:-84.1},{latitude:40.001358,longitude:-82.875122}];
state.sequenceHistory={...state.sequenceHistory,currentEventKey:'current',legs:[
 {eventKey:'one',origin:'ORD',destination:'CMH',completed:true,track:outbound},
 {eventKey:'two',origin:'CMH',destination:'ORD',completed:true,track:outbound.slice().reverse()},
 {eventKey:'three',origin:'BWI',destination:'ORD',completed:true,track:[{latitude:39.1754,longitude:-76.6683},{latitude:40.4,longitude:-80.5},{latitude:41.3,longitude:-84.7},outbound[0]]},
 {eventKey:'current',origin:'ORD',destination:'AVL',completed:false,track:outbound}
]};
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
 await page.waitForSelector('.map-sequence-history-airport',{state:'attached'});
 await page.waitForTimeout(200);
 const result=await page.evaluate(()=>{
  const layer=document.querySelector('.map-sequence-history-layer');
  return {opacity:getComputedStyle(layer).opacity,
   paths:[...layer.querySelectorAll('.map-sequence-history-leg')].map(n=>{const s=getComputedStyle(n);return {d:n.getAttribute('d'),fill:s.fill,stroke:s.stroke,width:parseFloat(s.strokeWidth),dashes:s.strokeDasharray,opacity:s.opacity,effect:s.vectorEffect};}),
   circles:[...layer.querySelectorAll('.map-sequence-history-airport')].map(n=>({code:n.dataset.airport,width:n.getBoundingClientRect().width,r:n.getAttribute('r'),scale:n.getScreenCTM()?.a,fill:getComputedStyle(n).fill})),
   active:getComputedStyle(document.querySelector('.map-route-line')).stroke,
   horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 assert.equal(result.paths.length,3,'Only prior recorded legs are shown');
 assert.equal(result.opacity,'0.62','Opacity belongs to the group, so crossings have uniform density');
 for(const p of result.paths){
  assert.equal(p.fill,'none','A recorded track never fills its enclosed area');
  assert.equal(p.opacity,'1','Each track is opaque inside the shared ink layer');
  assert.equal(p.stroke,'rgb(81, 79, 72)');assert(p.width<=1.2&&p.width>=1);
  assert.notEqual(p.dashes,'none');assert.equal(p.effect,'non-scaling-stroke');
 }
 assert.deepEqual(result.circles.map(c=>c.code).sort(),['BWI','CMH','ORD']);
 for(const c of result.circles){assert.equal(c.fill,'none');assert(Math.abs(c.width-6)<.3,'Airport reference diameter remains six screen pixels: '+JSON.stringify({name,c}));}
 assert.equal(result.active,'rgb(145, 59, 43)','Active route retains its red ink');
 assert(!result.horizontalOverflow);
 await page.locator('.route-map-shell').screenshot({path:path.join(output,name+'.png')});
 return {name,...result};
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 const results=[];
 try{
  for(const [name,width,height,url] of [['kiosk',1920,1080,'/'],['family',844,390,'/mobile/full?layout=full'],['compact',390,844,'/mobile?layout=compact']]) {
   const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
   const settled=observeBrowserErrors(page);
   page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
   await page.goto(origin+url,{waitUntil:'load'});if(name!=='compact')await page.waitForSelector('#dashboard:not([hidden])');await page.waitForTimeout(750);
   results.push(await inspect(page,name));
   const paths=results[results.length-1].paths.map(p=>p.d);
   // Resize triggers asynchronous route-camera changes after the state event.
   await page.setViewportSize({width:name==='kiosk'?1440:height,height:name==='kiosk'?900:width});
   await page.waitForTimeout(400);
   const resized=await inspect(page,name+'-resized');results.push(resized);
   assert.deepEqual(resized.paths.map(p=>p.d),paths,'Resizing preserves the geographic track geometry');
   await settled(name);assert.deepEqual(errors,[]);console.log(name+': historical ink, airport markers and resize passed');await page.close();
  }
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
