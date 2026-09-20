"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/scheduled-leg-count");
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
state.sequenceHistory={scheduledLegCount:9,totalDistanceNm:1468,completedLegCount:7,estimatedLegCount:7,legs:Array.from({length:7},()=>({origin:'ORD',destination:'AVL',completed:true}))};
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


async function checkText(page,compact,expected) {
 const node=page.locator(compact?'#sequence-mileage':'.sequence-mileage-detail');
 await page.waitForSelector(compact?'#sequence-mileage':'.sequence-mileage-detail',{state:'attached'});
 assert.equal((await node.textContent()).trim(),expected);
 if(!compact){
  const fits=await node.evaluate(n=>{const range=document.createRange();range.selectNodeContents(n);const ink=range.getBoundingClientRect(),box=n.getBoundingClientRect();return ink.left>=box.left-1&&ink.right<=box.right+1&&ink.top>=box.top-1&&ink.bottom<=box.bottom+1;});
  assert(fits,'Scheduled and completed counts fit the existing hardware footer');
 }
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 try{
  for(const [name,width,height,url,compact] of [['kiosk',1920,1080,'/',false],['family',844,390,'/mobile/full?layout=full',false],['compact',390,844,'/mobile?layout=compact',true]]) {
   const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),failed=[];
   const settled=observeBrowserErrors(page);
   page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
   await page.goto(origin+url,{waitUntil:'load'});
   if(!compact)await page.waitForSelector('#dashboard:not([hidden])');
   await checkText(page,compact,compact?'TRIP 1,468 NM · 9 LEGS · 7 DONE':'9 LEGS · 7 COMPLETE · 7 EST');
   await page.locator(compact?'.freshness':'.sequence-mileage-badge').screenshot({path:path.join(output,name+'.png')});
   for(const [history,full,mobile] of [
    [{...state.sequenceHistory,scheduledLegCount:8},'8 LEGS · 7 COMPLETE · 7 EST','TRIP 1,468 NM · 8 LEGS · 7 DONE'],
    [{scheduledLegCount:1,totalDistanceNm:0,completedLegCount:0,estimatedLegCount:0,legs:[]},'1 LEG · 0 COMPLETE','TRIP 0 NM · 1 LEG · 0 DONE'],
    [{...state.sequenceHistory,scheduledLegCount:null},'7 RECORDED · 7 COMPLETE · 7 EST','TRIP 1,468 NM · 7 RECORDED · 7 DONE']
   ]) {
    await page.evaluate(({state,compact})=>window.dispatchEvent(new CustomEvent(compact?'dad-radar:state-change':'dad-radar:visual-state-change',{detail:{state,mode:'EN_ROUTE'}})),{state:{...state,sequenceHistory:history},compact});
    await checkText(page,compact,compact?mobile:full);
   }
   await page.evaluate(({state,compact})=>window.dispatchEvent(new CustomEvent(compact?'dad-radar:state-change':'dad-radar:visual-state-change',{detail:{state,mode:'EN_ROUTE'}})),{state:{...state,sequenceHistory:{scheduledLegCount:0,completedLegCount:0,legs:[]}},compact});
   if(compact)assert(await page.locator('#sequence-mileage').isHidden());else await checkText(page,false,'NO RECORDED LEGS');
   await settled(name);assert.deepEqual(failed,[]);console.log(name+': scheduled total, completed count, edits and footer fitting passed');await page.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
