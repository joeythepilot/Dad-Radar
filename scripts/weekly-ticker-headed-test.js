"use strict";

// All schedule data in this browser proof is fictional.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium, webkit} = require("playwright");
const {checkWeeklyTicker} = require("./weekly-ticker-browser-proof");
const weeklyTicker = require("../App/weekly-ticker");
const airports = require("../data/airport-catalog");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/map-hardware");
fs.mkdirSync(output, {recursive: true});

const referenceNow = new Date();
const HOUR = 60 * 60 * 1000;
const at = hours => new Date(referenceNow.getTime() + hours * HOUR).toISOString();
const schedule = {events:[
  {id:"commute-out",kind:"flight",status:"confirmed",origin:"AVL",destination:"ORD",isCommute:true,times:{startUtc:at(24),endUtc:at(26)}},
  {id:"msn-flight",kind:"flight",status:"confirmed",origin:"ORD",destination:"MSN",times:{startUtc:at(27),endUtc:at(29)}},
  {id:"msn-night",kind:"layover",status:"confirmed",airport:"MSN",times:{startUtc:at(29),endUtc:at(44)}},
  {id:"hpn-flight",kind:"flight",status:"confirmed",origin:"MSN",destination:"HPN",times:{startUtc:at(46),endUtc:at(49)}},
  {id:"hpn-night",kind:"layover",status:"confirmed",airport:"HPN",times:{startUtc:at(49),endUtc:at(68)}},
  {id:"xna-flight",kind:"flight",status:"confirmed",origin:"HPN",destination:"XNA",times:{startUtc:at(70),endUtc:at(73)}},
  {id:"xna-night",kind:"layover",status:"confirmed",airport:"XNA",times:{startUtc:at(73),endUtc:at(92)}},
  {id:"home-flight",kind:"flight",status:"confirmed",origin:"XNA",destination:"AVL",isCommute:true,times:{startUtc:at(94),endUtc:at(97)}}
]};
const expectedModules = weeklyTicker.buildWeeklyOvernightModules(schedule, {
  now: referenceNow,
  homeAirport: "AVL",
  timeZone: "America/New_York"
});

const state = {
  status:"EN ROUTE", message:"DADDY IS FLYING TO COLUMBUS, OHIO", locationAirport:"CMH", flight:null,
  sequenceHistory:{totalDistanceNm:1468,completedLegCount:6,estimatedLegCount:6,legs:[]},
  dailySchedule:{
    dateLabel:"THU SEP 17",
    timeZoneLabel:"EASTERN TIME",
    context:"DADDY IS FLYING TO COLUMBUS, OHIO",
    entries:[
      {id:"duty-1",kind:"flight",status:"completed",time:"6:10 AM",label:"AVL → CLT",tag:"FLT 4101"},
      {id:"duty-2",kind:"flight",status:"current",time:"8:05 AM",label:"CLT → CMH",tag:"FLT 4102"},
      {id:"duty-3",kind:"flight",status:"upcoming",time:"10:45 AM",label:"CMH → ORD",tag:"FLT 4103"},
      {id:"duty-4",kind:"flight",status:"upcoming",time:"1:20 PM",label:"ORD → GRB",tag:"FLT 4104"},
      {id:"duty-5",kind:"flight",status:"upcoming",time:"4:15 PM",label:"GRB → AVL",tag:"COMMUTE"}
    ]
  }
};
const stamp = new Date().toISOString();
const payload = {ok:true,revision:1,publishedAt:stamp,calendarOk:true,liveOk:true,calendarAt:stamp,liveAt:stamp,resolved:{mode:"HOME",state,event:null}};
const displayHtml = fs.readFileSync(path.join(root,"index.html"),"utf8");
const serverCode = fs.readFileSync(path.join(root,"server/index.js"),"utf8");
const expression = serverCode.match(/const familyHtml = ([\s\S]*?);\n  response/)[1];
const fullHtml = new Function("displayHtml", `return ${expression};`)(displayHtml);
const types = {".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};

const server = http.createServer((request,response) => {
  const url = new URL(request.url,"http://localhost");
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/weather")) { response.writeHead(204); response.end(); return; }
    response.setHeader("Content-Type","application/json");
    if (url.pathname === "/api/calendar/upcoming") { response.end(JSON.stringify({ok:true,...schedule})); return; }
    response.end(JSON.stringify(url.pathname.includes("/surface") ? {pending:true,retryAfterMs:3600000} : payload));
    return;
  }
  if (url.pathname === "/mobile/full") { response.setHeader("Content-Type","text/html"); response.end(fullHtml); return; }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname === "/mobile" ? "/Mobile/index.html" : url.pathname;
  const file = path.resolve(root,"." + requested);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  response.setHeader("Content-Type",types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  try {
    for (const [engine,type] of [["chromium",chromium],["webkit",webkit]]) {
      const browser = await type.launch({headless:true});
      try {
        for (const [name,width,height,compact] of [
          ["desktop",1920,1080,false],
          ["full-landscape",844,390,false],
          ["full-portrait",390,844,false],
          ["full-tablet",1024,768,false],
          ["compact",390,844,true]
        ]) {
          const page = await browser.newPage({
            viewport:{width,height},
            serviceWorkers:"block",
            hasTouch:name !== "desktop"
          });
          const errors = [];
          page.on("pageerror", error => errors.push(error.message));
          await page.route("**/*", route => route.request().url().startsWith(origin) || route.request().url().startsWith("blob:") ? route.continue() : route.abort());
          const url = name === "desktop" ? "/" : compact ? "/mobile?layout=compact" : "/mobile/full?layout=full";
          await page.goto(origin + url,{waitUntil:"load"});
          // The product intentionally keeps its normal 3s startup sequence. A
          // loaded WebKit runner can take several extra seconds to paint that
          // transition, so this proof waits for readiness without changing the
          // startup delay itself.
          if (!compact) await page.waitForSelector("#dashboard:not([hidden])",{timeout:12000});
          const label = `${engine}-ticker-${name}`;
          const evidence = await checkWeeklyTicker(page,compact,label,output,expectedModules);
          assert.deepEqual(errors,[],`${label}: browser errors`);
          results.push({label,passed:true,evidence});
          await page.close();
          console.log(`${label}: weekly overnight bank and physical duty card passed`);
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
    fs.writeFileSync(path.join(output,"weekly-ticker-results.json"),JSON.stringify(results,null,2));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});