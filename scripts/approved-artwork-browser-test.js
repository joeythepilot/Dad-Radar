"use strict";
// All flight data is fictional. No credentials, provider calls, or deployment.
const {observeBrowserErrors} = require("./browser-error-proof");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {chromium,webkit} = require("playwright");
const clockFocus=process.env.DADRADAR_BROWSER_FOCUS==='clocks';
const engine=process.env.DADRADAR_BROWSER_ENGINE||'chromium';
if(!['chromium','webkit'].includes(engine))throw new Error('Unknown artwork browser engine');

const {root,state,payload,server}=require('./display-browser-fixture').createDisplayFixture();
const output = path.join(process.env.DADRADAR_ARTIFACT_ROOT || path.join(root,"artifacts"),"approved-artwork");
fs.mkdirSync(output, {recursive: true});


(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await ({chromium,webkit})[engine].launch({headless:true,
   ...(engine==='chromium' && process.env.DADRADAR_BROWSER_EXECUTABLE ? {executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']} : {})});
 try {
 const results=[];
 for (const [name,width,height,route] of [
   ['kiosk',1920,1080,'/'],['desktop',1440,900,'/'],['tablet',1024,768,'/'],
   ['family-landscape',844,390,'/mobile/full?layout=full'],['family-portrait',390,844,'/mobile/full?layout=full']
 ]) {
   if(clockFocus&&!['kiosk','family-portrait'].includes(name))continue;
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
   if (!clockFocus && name === 'kiosk') {
     const arrivalInstruments = await page.evaluate(() => {
       const arrived = {...dadRadarVisualState, status:'ARRIVED', flight:{
         ...dadRadarVisualState.flight, airspeed:null, groundSpeed:11,
         heading:239, altitude:null
       }};
       const readings = () => ({
         speed:document.querySelector('#airspeed-value').textContent,
         heading:document.querySelector('#heading-value').textContent,
         altitude:document.querySelector('#altitude-value').textContent,
         speedNeedle:document.querySelector('#airspeed-needle').style.transform,
         headingCard:document.querySelector('#heading-card').style.transform
       });
       updateDashboard(arrived);
       const full = readings();
       updateDashboardTelemetry(arrived);
       const telemetry = readings();
       // Restore through the production event path so the physical duty-card
       // renderer also replaces the temporary legacy rows made by this probe.
       window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state:dadRadarVisualState}}));
       return {full, telemetry};
     });
     for (const readings of Object.values(arrivalInstruments)) {
       assert.equal(readings.speed,'---','Arrival clears the last taxi speed');
       assert.equal(readings.heading,'---','Arrival clears the last taxi heading');
       assert.equal(readings.altitude,'-----','Arrival clears altitude');
       assert.equal(readings.speedNeedle,'rotate(0deg)');
       assert.equal(readings.headingCard,'rotate(0deg)');
     }
   }
   if(!clockFocus) {
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
   }
    assert.equal(await page.locator('.twin-clock-panel').count(),1,'The primary twin clocks keep their faceplate opening');
   assert.equal(await page.locator('.clock-block,.eta-block,.clock-support-rod').count(),0,'Old housings and mounts removed');
    assert.equal(await page.locator('.twin-clock-art > image,.period-window-art').count(),0,'The photographed housing and small period frames are absent');
    assert.equal(await page.locator('.drum-clock').count(),2,'Current and ETA each have a mechanical clock row');
    assert.equal(await page.locator('.clock-wheel').count(),8,'Each row has four numeral wheels');
    assert.equal(await page.locator('.period-wheel').count(),2,'Each row has a full-size period wheel');
   assert.equal(await page.locator('.drum-lamp').count(),8,'Each physical drum has a restrained, independently gated lamp');
   assert.equal(await page.locator('.drum-clock-lighting').count(),0,'The blown-out lighting PNG is retained on disk but no longer composited over the clock');
   const geometry=await page.evaluate(()=>{
     const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
     const clock=document.querySelector('.twin-clock-art');
     const ink=[...clock.querySelectorAll('text')].map(n=>({id:n.id,box:((r)=>({x:r.x,y:r.y,width:r.width,height:r.height}))(n.getBBox()),text:n.textContent}));
     return {panel:box('.twin-clock-panel'),strip:box('.flight-strip-module'),rail:box('.instrument-rail'),
        ink,artHeight:824*clock.getScreenCTM().d,artWidth:1418*clock.getScreenCTM().a,scale:clock.getScreenCTM().toString(),weekly:document.querySelectorAll('.weekly-overnight-bay').length,
       gauge:document.querySelectorAll('.instrument-slot').length,
       board:box('.flight-board'),tiles:[...document.querySelectorAll('.flap-character')].map(n=>n.getBoundingClientRect().toJSON())};
   });
   if(name.startsWith('family-')) {
   assert(Math.abs(geometry.panel.left-geometry.rail.left)<1,'Clock aligns with rail left');
   assert(Math.abs(geometry.panel.right-geometry.rail.right)<1,'Clock aligns with rail right');
   assert(Math.abs(geometry.panel.height-geometry.strip.height)<1,'Clock bay matches split-flap height');
    assert(Math.abs(geometry.artHeight-geometry.strip.height)<2,'Clock art keeps the split-flap bay height');
    assert(Math.abs(geometry.artWidth-geometry.rail.width)<2,'Clock art keeps the instrument rail width');
   } else { await require('./physical-faceplate-browser-proof').checkPhysicalFaceplate(page,name); }
   assert.equal(geometry.weekly,7);assert.equal(geometry.gauge,3);
   if(!clockFocus&&name==='kiosk')await page.locator('.heading-instrument').screenshot({path:path.join(output,'heading-detail.png')});
   if(!clockFocus&&name==='kiosk')await page.locator('.airspeed-instrument').screenshot({path:path.join(output,'airspeed-detail.png')});
   if(name.startsWith('family-'))for(const tile of geometry.tiles)assert(tile.left>=geometry.board.left-1&&tile.right<=geometry.board.right+1,'Split-flap tiles remain inside board');
   if(clockFocus) {
   for (const eta of ['7:42 PM','--:--','DELAYED','ARRIVED','AWAITING UPDATED ARRIVAL TIME']) {
     // Exercise the existing render function; the artwork must consume its output.
     await page.evaluate(value=>updateDashboard({...dadRadarVisualState,flight:{...dadRadarVisualState.flight,eta:value}}),eta);
     await page.waitForFunction(value=>document.querySelector('#eta-value').textContent===value,eta);
     const expected=eta==='7:42 PM' ? ['', '7', '4', '2'] : ['', '', '', ''];
     await page.waitForFunction(digits=>[...document.querySelectorAll('[data-clock="eta"] [data-drum]')]
       .every((drum,index)=>drum.getAttribute('data-digit')===digits[index]),expected);
     const physical=await page.locator('[data-clock="eta"]').evaluate(n=>({
       lit:n.classList.contains('is-lit'),prints:[...n.querySelectorAll('.drum-print:not(.drum-exit) [data-printed-ink]')].map(ink=>ink.getAttribute('data-printed-ink')),
       browserText:n.querySelectorAll('text').length,
       period:n.parentNode.querySelector('[data-period="eta"] .period-ink').getAttribute('data-period-value'),
       periodPrint:n.parentNode.querySelector('[data-period="eta"] .period-ink [data-printed-ink]')?.getAttribute('data-printed-ink')||''
     }));
     assert.deepEqual(physical.prints,expected.filter(Boolean),'Only physical wheel positions carry printed numeral outlines');
     assert.equal(physical.browserText,0,'No browser text floats above the drums');
     assert.equal(physical.lit,eta==='7:42 PM','The ETA lighting fades when no readable ETA exists');
     assert.equal(physical.period,eta==='7:42 PM'?'PM':'','The period roller follows a valid ETA and blanks with the drums');
     assert.equal(physical.periodPrint,physical.period,'Period ink is a physical outline, not browser text');
   }
   await page.evaluate(()=>updateDashboard(dadRadarVisualState));
   const timeBefore=await page.locator('#clock-value').textContent();
   await page.waitForFunction(before=>document.querySelector('#clock-value').textContent!==before,timeBefore);
   assert.equal(await page.locator('[data-clock="current"] [data-drum]').count(),4,'Current time uses four mechanical drums');
   const currentPeriod=await page.evaluate(()=>({
     label:document.querySelector('#clock-value').textContent,
     physical:document.querySelector('[data-period="current"] .period-ink').getAttribute('data-period-value')
   }));
   assert.equal(currentPeriod.physical,currentPeriod.label.match(/\b(?:AM|PM)\b/)?.[0],
     'The current Eastern clock shows the correct physical AM/PM position');
   }
   await page.waitForFunction(()=>[...document.querySelectorAll('.sequence-housing-art image')].length===1);
   const assets=await page.evaluate(async(clockOnly)=>{
     const paths=[...document.querySelectorAll('image,img')].map(n=>n.getAttribute('href')||n.getAttribute('src')).filter(s=>s&&(clockOnly?/assets\/hardware\/(clock-drum-|clock-period-)/:/assets\/hardware\/(airport-|instrument-|clock-drum-|clock-period-)/).test(s));
     return Promise.all([...new Set(paths)].map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({src,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>resolve({src,w:0});i.src=src;})));
   },clockFocus);
   for(const name of ['clock-drum-mechanism.png']) {
     const asset=assets.find(item=>item.src.endsWith(name));
     assert.deepEqual([asset?.w,asset?.h],[1825,460],`${name}: approved registered clock layer loads at production dimensions`);
   }
    assert(!assets.some(item=>/instrument-twin-clock-panel-final|clock-period-window/.test(item.src)),
      'Removed housing assets are not composited');
    assert.equal(assets.length,clockFocus?1:7);assert(assets.every(a=>a.w>0),'Approved map, wheel and clock PNGs decode');
   if(!clockFocus) {
   const fitting=await page.locator('.airport-leader-fitting').first().getAttribute('transform');
   assert.match(fitting,/translate\(.+\) rotate\(/,'End fitting follows positioned leader');
   assert.match(fitting,/scale\(0\.75\)/,'Pointer shrinks with the plaque');
   const edgeError=await page.locator('.airport-leader-fitting').first().evaluate(n=>{
     const leader=n.parentElement.querySelector('.airport-leader');
     const transform=n.parentElement.querySelector('.airport-placard').transform.baseVal.consolidate().matrix;
     if(Math.abs(transform.a-1.05)>.001) throw new Error("Approved plaques must use the reduced code-only size");
     const x=transform.e+55*transform.a,y=transform.f+36*transform.a,d=Math.hypot(x,y);
     const edge=Math.min(52.5*transform.a/Math.abs(x/d),19.4*transform.a/Math.abs(y/d));
     return Math.abs(Math.hypot(+leader.getAttribute('x2'),+leader.getAttribute('y2'))-(d-edge+1));
   });
   assert(edgeError<.2,'Fitting socket attaches to the new shallow plaque edge');
   const mount=await page.locator('.sequence-mileage-badge').evaluate(n=>{
     const r=n.getBoundingClientRect(),map=n.parentElement.getBoundingClientRect();
     return {left:r.left+r.width*.0333-map.left,bottom:map.bottom-(r.bottom-r.height*.0573)};
   });
   assert(mount.left>=-.1&&mount.left<=2,`${name}: leg tracker anchors to map left edge ${JSON.stringify(mount)}`);
   assert(mount.bottom>=-.1&&mount.bottom<=2,`${name}: leg tracker meets lower bezel ${JSON.stringify(mount)}`);
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
       const code=p.querySelector('.airport-code').getBBox();
       return {codeOnly:['.airport-placard-role','.airport-city'].every(s=>getComputedStyle(p.querySelector(s)).display==='none'),
         centered:Math.abs(code.x+code.width/2-55)<3 && Math.abs(code.y+code.height/2-36)<3,
         contained:code.x>=8 && code.x+code.width<=102 && code.y>=16 && code.y+code.height<=57,
         codeSize:parseFloat(getComputedStyle(p.querySelector('.airport-code')).fontSize)};
     })
   }));
   assert(legibility.detailSize>=11,`${name}: scheduled leg count remains readable`);
   assert(legibility.plaque.every(p=>p.codeOnly&&p.centered&&p.contained&&p.codeSize>=26),`${name}: only a large centered code is printed inside the plaque ${JSON.stringify(legibility)}`);

   await require("./instrument-wheels-browser-proof").checkInstrumentWheels(page,name);
   }
   await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true});
   await assertBrowserSettled(name);
   assert.deepEqual(errors,[],`${name}: no missing asset errors`);
   if(name==='kiosk'&&!clockFocus)await require('./printed-ink-browser-proof').checkPrintedInk(page);
   if(name==='kiosk'&&clockFocus) {
     await page.setViewportSize({width:1366,height:768});
     await assertBrowserSettled('kiosk after resize');
      const rows=await page.locator('.drum-clock').evaluateAll(nodes=>nodes.map(n=>{
        const panel=n.closest('.twin-clock-panel').getBoundingClientRect();
        const wheels=[...n.querySelectorAll('.clock-wheel')];
        const period=n.querySelector('.period-wheel');
        const boxes=[...wheels,period].map(w=>w.getBoundingClientRect().toJSON());
        return {panel:panel.toJSON(),boxes,caption:n.querySelector('.clock-caption')?.getAttribute('data-label'),
          captionInk:n.querySelector('.clock-caption [data-printed-ink]')?.getAttribute('data-printed-ink')};
      }));
      assert.deepEqual(rows.map(row=>row.caption),['CURRENT TIME','ESTIMATED ARRIVAL']);
      assert(rows.every(row=>row.captionInk===row.caption),'Both labels use printed outline ink');
      for(const row of rows){
        assert.equal(row.boxes.length,5,'Four numerals and one period wheel remain visible');
        const [first,...rest]=row.boxes;
        assert(rest.every(b=>Math.abs(b.width-first.width)<1 && Math.abs(b.height-first.height)<1),
          'AM/PM wheel matches the numeral wheel dimensions');
        assert(row.boxes.every(b=>b.left>=row.panel.left-1 && b.right<=row.panel.right+1 &&
          b.top>=row.panel.top-1 && b.bottom<=row.panel.bottom+1),
          'Every wheel stays within the unchanged physical opening after resize');
        assert(row.boxes.every((b,i)=>!i || b.left>=row.boxes[i-1].right-1),
          'Adjacent wheel windows do not overlap');
      }
   }
   results.push({name,geometry,assets});await page.close();
 }
 if(clockFocus) {
 // Arrival retires a stale ETA even when early; the next active leg restores it.
 const arrivalPage=await browser.newPage({viewport:{width:1920,height:1080}});
 state.status='ARRIVED';state.flight.eta='7:56 AM';
 await arrivalPage.goto(`http://127.0.0.1:${server.address().port}/`);
 await arrivalPage.waitForSelector('#dashboard:not([hidden])');
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'ARRIVED','Confirmed arrival must retire the previous ETA');
 assert.deepEqual(await arrivalPage.locator('[data-clock="eta"] [data-drum]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-digit'))),
   ['', '', '', ''],'Confirmed arrival blanks all four physical drums');
 await arrivalPage.waitForFunction(()=>[...document.querySelectorAll('[data-clock="eta"] .drum-lamp')]
   .every(n=>getComputedStyle(n).opacity==='0'));
 assert.equal(await arrivalPage.locator('[data-period="eta"] .period-ink').getAttribute('data-period-value'),'',
   'Arrival blanks the physical AM/PM position too');
 await arrivalPage.locator('.twin-clock-panel').screenshot({path:path.join(output,'clock-arrived.png')});
 state.status='BOARDING';state.flight.eta='11:21 AM';
 await arrivalPage.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state:s}})),state);
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'11:21 AM','Next active flight restores its own ETA');
 await arrivalPage.waitForFunction(()=>[...document.querySelectorAll('[data-clock="eta"] [data-drum]')]
   .map(n=>n.getAttribute('data-digit')).join('')==='1121');
 assert.equal(await arrivalPage.locator('#eta-value').getAttribute('aria-label'),'Estimated arrival');
 state.status='ARRIVED';state.flight.eta='11:59 PM';
 await arrivalPage.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:{state:s}})),state);
 assert.equal(await arrivalPage.locator('#eta-value').textContent(),'ARRIVED','Arrival immediately retires a future ETA without a page refresh');
 await arrivalPage.waitForFunction(()=>[...document.querySelectorAll('[data-clock="eta"] [data-drum]')]
   .every(n=>n.getAttribute('data-digit')===''));
 await arrivalPage.close();
 }
 if(!clockFocus) {
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
 }
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
 console.log((clockFocus?'Focused clock':'Approved artwork')+' browser checks passed: '+results.map(r=>r.name).join(', '));
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

