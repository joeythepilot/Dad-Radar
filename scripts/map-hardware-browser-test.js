"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium, webkit} = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/map-hardware");
fs.mkdirSync(output, {recursive: true});
const state = {
  status:"HOME", message:"DADDY IS HOME", locationAirport:"AVL", flight:null,
  sequenceHistory:{totalDistanceNm:1468, completedLegCount:6, legs:Array.from({length:6}, () => ({origin:"ORD",destination:"AVL"}))},
  dailySchedule:{dateLabel:"SUN SEP 13",timeZoneLabel:"EASTERN TIME",context:"DADDY IS HOME TODAY",entries:[
    {time:"7:58 AM",label:"ORD → BWI",tag:"FLT 3761",status:"completed",kind:"flight"},
    {time:"11:23 AM",label:"BWI → ORD",tag:"FLT 3762",status:"completed",kind:"flight"},
    {time:"3:00 PM",label:"ORD → AVL",tag:"COMMUTE",status:"completed",kind:"flight"}
  ]}
};
const now = new Date().toISOString();
const payload = {ok:true,revision:1,publishedAt:now,calendarOk:true,liveOk:true,calendarAt:now,liveAt:now,resolved:{mode:"HOME",state,event:null}};
const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
// Use the server's exact family HTML expression, not a second hand-copied layout.
const serverCode = fs.readFileSync(path.join(root,"server/index.js"),"utf8");
const expression = serverCode.match(/const familyHtml = ([\s\S]*?);\n  response/)[1];
const fullHtml = new Function("displayHtml", `return ${expression};`)(html);
const types = {".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
const server = http.createServer((req,res) => {
  const url = new URL(req.url,"http://localhost");
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
const report = [];
function audioProbe() {
  let api;
  window.mapProofSounds = [];
  Object.defineProperty(window,"dadRadarMapRollAudio",{configurable:true,get:()=>api,set(value) {
    api = {...value,createController:()=>Object.fromEntries(["playMotor","stopMotor","playRegisterClack","playDetentClack","unlock"].map(name=>[name,()=>{
      const shell=document.querySelector('.route-map-shell'),roll=document.querySelector('.map-roll-transport');
      window.mapProofSounds.push({name,at:performance.now(),moving:!!shell?.className.match(/map-roll-to-/),transform:roll?getComputedStyle(roll).transform:null});
      return Promise.resolve(true);
    }]))};
  }});
}
async function geometry(page, compact) {
  return page.evaluate(isCompact => {
    const rect = n => {const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const shell=document.querySelector('.route-map-shell');
    const nodes = isCompact ? ['.freshness','.arrival'] : ['.clock-block','.eta-block','.sequence-mileage-badge'];
    const hardware=nodes.map(selector=>({selector,node:document.querySelector(selector)})).filter(x=>x.node && !x.node.hidden).map(({selector,node})=>({selector,rect:rect(node),shadow:getComputedStyle(node).boxShadow,mount:getComputedStyle(node,'::before').content,text:[...node.querySelectorAll(isCompact?'span,strong':'.small-label,.clock-value,.eta-value,.eta-zone,.sequence-mileage-value')].filter(n=>!n.hidden).map(n=>({text:n.textContent.trim(),width:n.clientWidth,scroll:n.scrollWidth}))}));
    return {map:rect(shell),hardware,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  },compact);
}
function checkGeometry(data) {
  assert(data.map.width >= 240 && data.map.height >= 140,"map retains usable dimensions");
  assert(data.pageWidth <= data.viewport+1,"no horizontal page overflow");
  for (const hardware of data.hardware) {
    const r=hardware.rect,m=data.map;
    assert(r.left>=m.left-1 && r.right<=m.right+1 && r.top>=m.top-1 && r.bottom<=m.bottom+1,`${hardware.selector} fits chart aperture: ${JSON.stringify(data)}`);
    assert.notEqual(hardware.shadow,"none",`${hardware.selector} has a cast shadow`);
    assert.notEqual(hardware.mount,"none",`${hardware.selector} has a mechanical attachment`);
    for (const text of hardware.text) assert(text.scroll<=text.width+1,`clipped text: ${JSON.stringify(text)}`);
  }
  for(let i=0;i<data.hardware.length;i++)for(let j=i+1;j<data.hardware.length;j++) {
    const a=data.hardware[i].rect,b=data.hardware[j].rect;
    assert(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top,"hardware does not overlap");
  }
}
async function installSurface(page) {
  await page.evaluate(() => {
    if(document.querySelector('.airport-surface-layer'))return;
    const node=document.createElement('div');node.className='airport-surface-layer';node.hidden=true;
    node.innerHTML='<svg class="airport-surface-svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#d3bd8d"/><path d="M80 100L690 510" stroke="#635e4f" stroke-width="30"/><text x="40" y="65" fill="#493823">FICTIONAL AIRPORT CHART: TRANSPORT TEST</text></svg>';
    document.querySelector('.route-map-shell').appendChild(node);
  });
  await page.waitForSelector('.map-roll-surface-sheet .airport-surface-layer',{state:'attached'});
}
async function transportProof(page, label) {
  await installSurface(page);
  await page.evaluate(() => {
    window.mapProofFrames=[];window.mapProofSampling=true;
    const sample=()=> {
      if(!window.mapProofSampling)return;
      const shell=document.querySelector('.route-map-shell'),r=document.querySelector('.map-roll-regional-sheet').getBoundingClientRect(),s=document.querySelector('.map-roll-surface-sheet').getBoundingClientRect(),map=shell.getBoundingClientRect();
      const clock=document.querySelector('.clock-block')?.getBoundingClientRect();
      window.mapProofFrames.push({at:performance.now(),moving:!!shell.className.match(/map-roll-to-/),gap:s.top-r.bottom,coverTop:Math.min(r.top,s.top)-map.top,coverBottom:Math.max(r.bottom,s.bottom)-map.bottom,clockTop:clock?.top,svgHidden:getComputedStyle(document.querySelector('.route-map-svg')).visibility==='hidden'});
      requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  });
  for(const next of [true,false,true,false]) {
    await page.evaluate(value=>document.querySelector('.route-map-shell').dadRadarMapRoll.setSurfaceVisible(value),next);
    await page.waitForFunction(value=>{
      const shell=document.querySelector('.route-map-shell');return !shell.className.match(/map-roll-to-/)&&shell.classList.contains('is-surface-registered')===value;
    },next,{timeout:5000});
    await page.waitForTimeout(300);
  }
  const evidence=await page.evaluate(()=>{window.mapProofSampling=false;return {frames:window.mapProofFrames,sounds:window.mapProofSounds};});
  const motion=evidence.frames.filter(x=>x.moving);
  assert(motion.length>30,'capture real animated frames');
  for(const frame of motion) {
    assert(Math.abs(frame.gap)<1,'adjacent sheets never separate');
    assert(frame.coverTop<=1 && frame.coverBottom>=-1,'map roll covers entire aperture, including top edge');
    assert(!frame.svgHidden,'regional renderer must not hide outgoing sheet');
    if(frame.clockTop!==undefined)assert(Math.abs(frame.clockTop-motion[0].clockTop)<1,'hardware stays stationary');
  }
  const clacks=evidence.sounds.filter(x=>/Clack/.test(x.name));
  assert.equal(clacks.length,8,'exactly two registration clacks per completed move');
  assert(clacks.every(x=>!x.moving),'no registration sound while transport is moving');
  fs.writeFileSync(path.join(output,`${label}-transport.json`),JSON.stringify(evidence,null,2));
  await page.screenshot({path:path.join(output,`${label}-returned.png`)});
  // Queue several reversals; only the latest request should be applied.
  await page.evaluate(()=>{const roll=document.querySelector('.route-map-shell').dadRadarMapRoll;roll.setSurfaceVisible(true);setTimeout(()=>roll.setSurfaceVisible(false),120);setTimeout(()=>roll.setSurfaceVisible(true),240);});
  await page.waitForTimeout(3400);
  assert(await page.locator('.route-map-shell').evaluate(n=>n.classList.contains('is-surface-registered')));
  await page.emulateMedia({reducedMotion:'reduce'});
  const count=await page.evaluate(()=>mapProofSounds.length);
  await page.evaluate(()=>document.querySelector('.route-map-shell').dadRadarMapRoll.setSurfaceVisible(false));
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>mapProofSounds.length),count,'reduced motion switches instantly without motor or clacks');
  assert(await page.locator('.route-map-shell').evaluate(n=>!n.className.match(/map-roll-to-|is-surface-registered/)));
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]) {
      const browser=await type.launch({headless:true});
      try {
        for(const [name,width,height,compact] of [
          ['desktop',1920,1080,false],['full-landscape',844,390,false],['full-tablet',1024,768,false],
          ['full-portrait',390,844,false],['full-tablet-portrait',768,1024,false],
          ['compact-landscape',844,390,true],['compact-portrait',390,844,true]
        ]) {
          const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
          const errors=[];page.on('pageerror',error=>errors.push(error.message));
          await page.addInitScript(audioProbe);
          await page.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('blob:')?route.continue():route.abort());
          const url=name==='desktop'?'/':compact?'/mobile?layout=compact':'/mobile/full?layout=full';
          await page.goto(origin+url,{waitUntil:'load'});
          if(!compact)await page.waitForSelector('#dashboard:not([hidden])');
          await page.waitForSelector('.map-roll-transport',{state:'attached'});
          await page.waitForTimeout(500);
          // Longest normal clock string must fit, not just the current hour.
          if(!compact)await page.locator('#clock-value').evaluate(n=>n.textContent='12:59:59 PM');
          const measured=await geometry(page,compact);checkGeometry(measured);
          const label=`${engine}-${name}`;
          await page.screenshot({path:path.join(output,`${label}.png`),fullPage:true});
          if(name==='desktop'||name==='compact-portrait')await transportProof(page,label);
          assert.deepEqual(errors,[],`${label}: browser errors`);
          report.push({label,passed:true,geometry:measured});
          await page.close();console.log(`${label}: geometry and ${name==='desktop'||name==='compact-portrait'?'transport':'layout'} passed`);
        }
      } finally {await browser.close();}
    }
  } finally {
    server.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
