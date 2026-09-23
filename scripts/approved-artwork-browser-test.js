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
   await page.locator('.daily-schedule-card-art').evaluate(image=>image.decode());
   const dutyProof=await page.locator('.daily-schedule-panel').evaluate(panel=>{
     const box=panel.getBoundingClientRect();
     const rows=[...panel.querySelectorAll('.daily-schedule-entry')];
     const fields=[...panel.querySelectorAll('.daily-schedule-time span')];
     return {zone:panel.querySelector('.daily-schedule-time-zone').textContent,
       labels:fields.map(n=>n.textContent),
       contained:fields.every(n=>{const r=n.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&n.scrollWidth<=n.clientWidth+1;}),
       headings:[...panel.querySelectorAll('.daily-schedule-column-headings span')].map(n=>n.textContent),
       separated:rows.every(n=>{
         const fields=[n.querySelector('.daily-schedule-flight'),n.querySelector('.daily-schedule-label'),...n.querySelectorAll('.daily-schedule-time span')].filter(f=>getComputedStyle(f).display!=='none');
         const rects=fields.map(f=>f.getBoundingClientRect());
         return fields.every((f,i)=>f.scrollWidth<=f.clientWidth+1 && (!i || rects[i-1].right<=rects[i].left+1)) && Math.abs(rects.at(-2).top-rects.at(-1).top)<1;
       }),
       adjacent:rows.every((n,i)=>!i || rows[i-1].getBoundingClientRect().bottom<=n.getBoundingClientRect().top+1),
       slots:rows.map(n=>n.style.gridRow),
       boxes:rows.map(n=>({row:n.getBoundingClientRect().toJSON(),route:n.querySelector('.daily-schedule-label').getBoundingClientRect().toJSON(),time:n.querySelector('.daily-schedule-time').getBoundingClientRect().toJSON(),grid:getComputedStyle(n).gridTemplateRows})),
       stampClear:rows.every(n=>{
         const s=n.querySelector('.daily-schedule-operational-stamp');
         if(!s)return true;
         const a=s.getBoundingClientRect();
         return [n.querySelector('.daily-schedule-flight'),n.querySelector('.daily-schedule-label'),...n.querySelectorAll('.daily-schedule-time span')].every(f=>{
           const b=f.getBoundingClientRect();return a.right<=b.left || a.left>=b.right || a.bottom<=b.top || a.top>=b.bottom;
         });
       })};
   });
   assert.match(dutyProof.zone,/EASTERN TIME/);
   assert(dutyProof.labels.includes('11:23 AM') && dutyProof.labels.includes('1:40 PM'),`${name}: current flight has both times`);
   assert.deepEqual(dutyProof.headings,['FLIGHT','ROUTE','DEPART','ARRIVE']);
   assert(dutyProof.contained && dutyProof.separated && dutyProof.stampClear && dutyProof.adjacent,`${name}: duty times fit and clear neighboring rows/route/stamp: ${JSON.stringify(dutyProof)}`);
   assert.deepEqual(dutyProof.slots,['span 1','span 1','span 1'],'Each assignment occupies one ruled line');
   const leaders=await page.locator('.airport-marker-group:has(.airport-leader-fitting) .airport-leader').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).stroke));
   assert.deepEqual(leaders,['none','none'],'Physical pointers must not have a flat red connector painted behind them');
   await page.locator('.daily-schedule-panel').screenshot({path:path.join(output,`duty-${name}.png`)});
   assert.equal(await page.locator('.airspeed-range-ink').count(),1,'Airspeed has its painted range layer');
   const rangeProof=await page.locator('.airspeed-range-ink').evaluate(async image=>{
     await image.decode();
     const canvas=document.createElement('canvas');canvas.width=1254;canvas.height=1254;
     const context=canvas.getContext('2d');context.drawImage(image,0,0,1254,1254);
     const pixel=(x,y)=>Array.from(context.getImageData(x,y,1,1).data);
     return {red:pixel(982,324),yellow:pixel(993,348),green:pixel(1087,627),
       white:pixel(1032,459),cruise:pixel(462,1024),center:pixel(627,627),
       z:Number(getComputedStyle(image).zIndex),
       needleZ:Number(getComputedStyle(document.querySelector('.airspeed-needle-layer')).zIndex)};
   });
   assert(rangeProof.red[0]>rangeProof.red[1]*1.4 && rangeProof.red[3]>100,'Low-speed red radial is visible at 110');
   assert(rangeProof.yellow[0]>rangeProof.yellow[2]*1.5 && rangeProof.yellow[3]>100,'Yellow caution paint is visible between 110 and 125');
   assert(rangeProof.green[1]>rangeProof.green[0]*1.15 && rangeProof.green[3]>100,'Normal-range green paint follows the scale');
   assert(rangeProof.white[0]>150 && rangeProof.white[3]>100,'Separate ivory flap-range paint is visible');
   assert.equal(rangeProof.cruise[3],0,'No high-speed warning paint beyond the illustrative range');
   assert.equal(rangeProof.center[3],0,'Ink leaves the instrument center clear');
   assert(rangeProof.z<rangeProof.needleZ,'Needle remains above the painted ranges');
   const headingProof=await page.locator('.heading-glass-overlay').evaluate(async image=>{
     await image.decode();
     const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
     const context=canvas.getContext('2d');context.drawImage(image,0,0);
     const pixels=context.getImageData(0,0,1024,1024).data;
     const pixel=(x,y)=>Array.from(pixels.slice((y*1024+x)*4,(y*1024+x)*4+4));
     const original=new Image();original.src='/assets/instruments/heading/heading-airplane-glass-overlay.png';await original.decode();
     context.clearRect(0,0,1024,1024);context.drawImage(original,0,0);
     const baseline=context.getImageData(0,0,1024,1024).data;
     let changedOutsidePointer=0,opaqueOutsideCircle=0;
     for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
       const i=(y*1024+x)*4;
       if((x-512)**2+(y-512)**2>440**2 && pixels[i+3])opaqueOutsideCircle++;
       if(x<345||x>679||y<305||y>725){
         if(pixels[i+3]!==baseline[i+3] || (pixels[i+3] && [0,1,2].some(c=>pixels[i+c]!==baseline[i+c])))changedOutsidePointer++;
       }
     }
     return {width:image.naturalWidth,height:image.naturalHeight,nose:pixel(512,330),center:pixel(512,505),empty:pixel(100,512),changedOutsidePointer,opaqueOutsideCircle};
   });
   assert.deepEqual([headingProof.width,headingProof.height],[1024,1024],'Heading overlay retains its original registered canvas');
   assert(headingProof.nose[3]>240,'Approved longer nose is visible above the old short pointer');
   assert(headingProof.center[0]<140 && headingProof.center[3]>240,'Dark pointer remains centered on the gauge pivot');
   assert.equal(headingProof.empty[3],0,'Real transparency leaves the compass card visible');
   assert.equal(headingProof.opaqueOutsideCircle,0,'Canvas outside the circular glass aperture is transparent');
   assert.equal(headingProof.changedOutsidePointer,0,'Original index arrow and upper-right reflection are preserved pixel-for-pixel');
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
   if(name==='kiosk')await page.locator('.heading-instrument').screenshot({path:path.join(output,'heading-detail.png')});
   if(name==='kiosk')await page.locator('.airspeed-instrument').screenshot({path:path.join(output,'airspeed-detail.png')});
   for(const tile of geometry.tiles)assert(tile.left>=geometry.board.left-1&&tile.right<=geometry.board.right+1,'Split-flap tiles remain inside board');
   for (const eta of ['7:42 PM','--:--','DELAYED','ARRIVED','AWAITING UPDATED ARRIVAL TIME']) {
     // Exercise the existing render function; the artwork must consume its output.
     await page.evaluate(value=>updateDashboard({...dadRadarVisualState,flight:{...dadRadarVisualState.flight,eta:value}}),eta);
     await page.waitForTimeout(30);
     const ink=await page.locator('#eta-value').evaluate(n=>({box:((r)=>({x:r.x,y:r.y,width:r.width,height:r.height}))(n.getBBox()),text:n.textContent}));
     assert.equal(ink.text,eta);assert(ink.box.x>=360&&ink.box.x+ink.box.width<=1415,'ETA remains within parchment width');
     assert(ink.box.y>=535&&ink.box.y+ink.box.height<=715,'ETA avoids plaques/frame');
     const printed=await page.locator('[data-clock-print="eta-value"]').evaluate(n=>{
       const b=n.getBBox(),t=n.transform.baseVal.consolidate().matrix;
       return {text:n.getAttribute('data-printed-ink'),x:b.x+t.e,y:b.y+t.f,width:b.width,height:b.height};
     });
     assert.equal(printed.text,eta,'Printed arrival lettering follows the authoritative live value');
     assert(printed.width>0&&printed.x>=360&&printed.x+printed.width<=1415&&printed.y>=535&&printed.y+printed.height<=715,
       'Actual printed glyphs fit the clock aperture, including long arrival messages');
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
     if(Math.abs(transform.a-1.4)>.001) throw new Error("Approved plaques must be enlarged for room viewing");
     const x=transform.e+66*transform.a,y=transform.f+36*transform.a,d=Math.hypot(x,y);
     const edge=Math.min(63.5*transform.a/Math.abs(x/d),19.4*transform.a/Math.abs(y/d));
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
   const legibility=await page.evaluate(()=>({
     detailSize:parseFloat(getComputedStyle(document.querySelector('.sequence-mileage-detail')).fontSize),
     plaque:[...document.querySelectorAll('.airport-placard')].map(p=>{
       const role=p.querySelector('.airport-placard-role').getBBox();
       const code=p.querySelector('.airport-code').getBBox();
       const city=p.querySelector('.airport-city').getBBox();
       return {bounds:[role.y,role.height,code.y,code.height,city.y,city.height],separate:Number(p.querySelector(".airport-code").getAttribute("y"))-Number(p.querySelector(".airport-placard-role").getAttribute("y"))>=12 && Number(p.querySelector(".airport-city").getAttribute("y"))-Number(p.querySelector(".airport-code").getAttribute("y"))>=10,
         citySize:parseFloat(getComputedStyle(p.querySelector('.airport-city')).fontSize)};
     })
   }));
   assert(legibility.detailSize>=11,`${name}: scheduled leg count remains readable`);
   assert(legibility.plaque.every(p=>p.separate&&p.citySize>=8.5),`${name}: enlarged plaque lines stay separate ${JSON.stringify(legibility)}`);

   await require("./instrument-wheels-browser-proof").checkInstrumentWheels(page,name);
   await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true});
   await assertBrowserSettled(name);
   assert.deepEqual(errors,[],`${name}: no missing asset errors`);
   const fiveFlightState={...state,dailySchedule:{...state.dailySchedule,entries:Array.from({length:5},(_,i)=>({kind:'flight',flightNumber:String(3637+i),tag:i===0?'COMMUTE':`FLT ${3637+i}`,label:'SPI → ORD',departureTime:'11:23 AM',arrivalTime:'12:59 PM',status:i===2?'current':'upcoming'}))}};
   await page.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:s}})),fiveFlightState);
   await page.waitForFunction(()=>document.querySelectorAll('.daily-schedule-entry.has-flight-times').length===5);
   const fiveProof=await page.locator('.daily-schedule-list').evaluate(list=>{
     const rows=[...list.children],bounds=list.getBoundingClientRect();
     return {count:rows.length,commute:rows[0].title,flight:rows[0].querySelector('.daily-schedule-flight').textContent,
       fits:rows.every((row,i)=>{const r=row.getBoundingClientRect();return r.bottom<=bounds.bottom+1 && (!i||rows[i-1].getBoundingClientRect().bottom<=r.top+1) && [...row.querySelectorAll('.daily-schedule-flight,.daily-schedule-label,.daily-schedule-time span')].every(f=>f.scrollWidth<=f.clientWidth+1);})};
   });
   assert.equal(fiveProof.count,5);assert(fiveProof.fits,`${name}: five complete flight rows fit the paper`);
   assert.equal(fiveProof.flight,'3637');assert.match(fiveProof.commute,/COMMUTE/);
   await page.locator('.daily-schedule-panel').screenshot({path:path.join(output,`duty-five-${name}.png`)});
   if(name==='kiosk') {
     await require('./printed-ink-browser-proof').checkPrintedInk(page);
     await page.setViewportSize({width:1366,height:768});
     await assertBrowserSettled('kiosk after resize');
     const centered=await page.locator('#eta-value').evaluate(n=>{
       const box=n.getBBox(),matrix=n.getScreenCTM();
       return {anchor:+n.getAttribute('x'),align:getComputedStyle(n).textAnchor,
         pixelError:Math.abs(box.x+box.width/2-887)*Math.abs(matrix.a)};
     });
     // SVG ink bearings differ across platform fonts. Compare visible pixels,
     // as the other geometry assertions do, while preserving the exact anchor.
     assert.equal(centered.anchor,887);assert.equal(centered.align,'middle');
     assert(centered.pixelError<1,`Live ETA remains centered after resize: ${JSON.stringify(centered)}`);
     await page.locator('.twin-clock-panel').evaluate(n=>n.style.display='none');
     await page.locator('#eta-value').evaluate(n=>n.textContent='AWAITING UPDATED ARRIVAL TIME');
     await page.waitForTimeout(30);
     await page.locator('.twin-clock-panel').evaluate(n=>n.style.removeProperty('display'));
     await page.waitForFunction(()=>document.querySelector('#eta-value').getComputedTextLength()<=1011);
   }
   results.push({name,geometry,assets});await page.close();
 }
 // Arrival retires a stale ETA even when early; the next active leg restores it.
 const arrivalPage=await browser.newPage({viewport:{width:1920,height:1080}});
 state.status='ARRIVED';state.flight.eta='7:56 AM';
 await arrivalPage.goto(`http://127.0.0.1:${server.address().port}/`);
 await arrivalPage.waitForSelector('#dashboard:not([hidden])');
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'ARRIVED','Confirmed arrival must retire the previous ETA');
 await arrivalPage.locator('.twin-clock-panel').screenshot({path:path.join(output,'clock-arrived.png')});
 state.status='BOARDING';state.flight.eta='11:21 AM';
 await arrivalPage.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state:s}})),state);
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'11:21 AM','Next active flight restores its own ETA');
 assert.equal(await arrivalPage.locator('#eta-value').getAttribute('aria-label'),'Estimated arrival');
 state.status='ARRIVED';state.flight.eta='11:59 PM';
 await arrivalPage.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state:s}})),state);
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'ARRIVED','Arrival immediately retires a future ETA without a page refresh');
 await arrivalPage.close();
 // A short predeparture leg must not be framed around yesterday's tracks.
 state.flight={number:"TEST",origin:"ORD",destination:"IND",destinationCity:"INDIANAPOLIS",
   altitude:null,airspeed:null,heading:null,progress:0,eta:"7:42 PM"};
 state.sequenceHistory={currentEventKey:"ord-ind",legs:[
   {eventKey:"past-west",origin:"SFO",destination:"ORD",track:[{latitude:37.62,longitude:-122.38},{latitude:41.97,longitude:-87.90}]},
   {eventKey:"past-south",origin:"MSY",destination:"ORD",track:[{latitude:29.99,longitude:-90.25},{latitude:41.97,longitude:-87.90}]}
 ]};
 for(const status of ['BOARDING','DELAYED']) {
   state.status=status;
   const page=await browser.newPage({viewport:{width:1920,height:1080}});
   const settled=observeBrowserErrors(page);
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   await page.waitForSelector('#dashboard:not([hidden])');
   await page.waitForFunction(()=>document.querySelector('#destination-poster').naturalWidth>0);
   await page.waitForFunction(()=>document.querySelector('#map-destination')?.textContent==='IND');
   const frame=await page.locator('#route-map-svg').getAttribute('viewBox');
   assert(Number(frame.split(/\s+/)[2])<100,`${status} ORD–IND stays route-focused with cross-country history: ${frame}`);
   assert(await page.locator('.map-sequence-history-leg').count()>0,'Historical paths are preserved, not deleted to fix zoom');
   await page.screenshot({path:path.join(output,`route-${status.toLowerCase()}.png`)});
   await settled(status+' route framing');
   await page.close();
 }
 console.log('Boarding and delayed ORD–IND browser framing passed with historical tracks retained.');
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
 console.log('Approved artwork browser checks passed: '+results.map(r=>r.name).join(', '));
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
