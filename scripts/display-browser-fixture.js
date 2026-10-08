"use strict";
// Fictional display state and production HTML; never contacts a provider.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
function createDisplayFixture(){
const root = path.resolve(__dirname, "..");
const state = {
  status:"EN ROUTE", message:"", locationAirport:"AVL", flight:{
    number:"3761",origin:"ORD",destination:"AVL",destinationCity:"ASHEVILLE",
    airspeed:438,heading:171,altitude:34000,progress:62,eta:"7:42 PM",
    latitude:37.3,longitude:-84.8
  },
  diagnostics:{shutterTestToken:"saved-command-before-page-load"},
  sequenceHistory:{scheduledLegCount:16,totalDistanceNm:1468, completedLegCount:6, estimatedLegCount:6, legs:Array.from({length:6}, () => ({origin:"ORD",destination:"AVL"}))},
  dailySchedule:{dateLabel:"SUN SEP 13",timeZoneLabel:"EASTERN TIME",context:"DADDY IS ON LAYOVER IN SPRINGFIELD, ILLINOIS",entries:[
    {time:"7:58 AM",departureTime:"7:58 AM",arrivalTime:"10:14 AM",label:"ORD → BWI",tag:"FLT 3761",status:"completed",kind:"flight"},
    {time:"11:23 AM",departureTime:"11:23 AM",arrivalTime:"1:40 PM",label:"BWI → ORD",tag:"FLT 3762",status:"current",kind:"flight",operationalStamp:{kind:"delay",label:"DELAYED",detail:"45 MINUTES"}},
    {time:"3:20 PM",label:"LAYOVER · Springfield",tag:"GROUND",status:"upcoming",kind:"layover"}
  ]}
};
const now = new Date().toISOString();
const payload = {ok:true,revision:1,publishedAt:now,calendarOk:true,liveOk:true,calendarAt:now,liveAt:now,resolved:{mode:"EN_ROUTE",state,event:null}};
const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
// Use the server's exact family HTML expression, not a second hand-copied layout.
const serverCode = fs.readFileSync(path.join(root,"server/index.js"),"utf8");
const expression = extractFamilyHtmlExpression(serverCode);
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
  if (["/mobile", "/mobile/full"].includes(url.pathname)) {res.setHeader("Content-Type","text/html");res.end(fullHtml);return;}
  const file = path.resolve(root,"." + (url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader("Content-Type",types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

return {root,state,payload,server};
}
module.exports={createDisplayFixture};
function extractFamilyHtmlExpression(source) {
  const match = source.match(/const familyHtml = ([\s\S]*?);\r?\n  response/);
  if (!match) throw new Error('Family HTML expression was not found in server/index.js');
  return match[1];
}
module.exports.extractFamilyHtmlExpression = extractFamilyHtmlExpression;
