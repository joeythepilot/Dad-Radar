'use strict';
// Focused one-tile proof using the unchanged production fixture and flip function.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');

const {observeBrowserErrors}=require('./browser-error-proof');
const output=process.env.DADRADAR_ARTIFACT_ROOT||path.join(__dirname,'../artifacts/flap-experiment');
const baseline=process.argv.includes('--baseline');
if(baseline)assert(process.env.DADRADAR_BASELINE_REPO,'Baseline capture requires an unchanged source checkout');
const {createDisplayFixture}=require(path.join(baseline?process.env.DADRADAR_BASELINE_REPO:path.join(__dirname,'..'),'scripts/display-browser-fixture'));
fs.mkdirSync(output,{recursive:true});
(async()=>{const {server}=createDisplayFixture();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,timezoneId:'America/New_York',serviceWorkers:'block'});
 const errors=observeBrowserErrors(page);await page.clock.setFixedTime(new Date('2026-10-09T02:35:00Z'));
 await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
 await page.goto(origin);await page.waitForSelector('#dashboard:not([hidden])');
 await page.waitForFunction(()=>document.querySelector('#flight-number')?.dataset.currentText==='3761'||[...document.querySelectorAll('#flight-number>.flap-character')].map(n=>n.dataset.value).join('')==='3761');
 await page.waitForFunction(()=>[...document.querySelectorAll('.flap-character')].every(n=>!n._animationRunning&&!n.classList.contains('is-flipping')));
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})));});
 await page.waitForTimeout(700);
 const geometry=await page.evaluate(()=>[...document.querySelectorAll('.flap-character,#flight-number,#origin-code,#destination-code,#flight-status,.destination-panel,.daily-schedule-panel,.vintage-map-panel,#route-map-shell,.sequence-mileage-badge,.weekly-overnight-bank,.weekly-overnight-bay,.instrument-slot,.twin-clock-art,.clock-wheel,.period-wheel')].map(n=>({tag:n.className,id:n.id,rect:JSON.parse(JSON.stringify(n.getBoundingClientRect()))})));
 const cell=page.locator('#flight-number>.flap-character').first();
 const stem=baseline?'before':'experimental-rest';await page.screenshot({path:path.join(output,stem+'.png'),fullPage:true});await cell.screenshot({path:path.join(output,stem+'-tile.png')});
 if(baseline){fs.writeFileSync(path.join(output,'baseline-geometry.json'),JSON.stringify(geometry,null,2));return;}
 assert.deepEqual(geometry,JSON.parse(fs.readFileSync(path.join(output,'baseline-geometry.json'))),'All module and tile rectangles must be identical');
 const styles=await cell.evaluate(n=>({fixed:getComputedStyle(n,'::before').backgroundImage,transform:getComputedStyle(n,'::before').transform,halves:[...n.querySelectorAll('.flap-half')].map(h=>getComputedStyle(h).backgroundImage)}));
 assert.match(styles.fixed,/experimental-v2.*experimental-fixed/,'The first flight-number tile must have stationary experimental hardware');assert.equal(styles.transform,'none');
 assert(styles.halves.every(s=>/experimental-v2.*experimental-surface/.test(s)));
 assert.match(await cell.evaluate(n=>getComputedStyle(n,'::after').backgroundImage),/experimental-v2.*warm-lighting\.svg/,'Warm light must be independently controllable');
 const untouched=await page.locator('.flap-character').evaluateAll(ns=>ns.slice(1).map(n=>getComputedStyle(n).backgroundImage));assert(untouched.every(s=>/split-flap-tile\.png/.test(s)),'Every remaining tile uses the original artwork');
 const motion=await cell.evaluate(n=>{window.flapExperimentPromise=flipFlapOnce(n,'4');const animations=n.getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains('flap-moving'));animations.forEach(a=>{a.pause();a.currentTime=100;});return animations.map(a=>({name:a.animationName,time:a.currentTime,duration:a.effect.getTiming().duration,delay:a.effect.getTiming().delay,transform:getComputedStyle(a.effect.target).transform,ink:a.effect.target.querySelector('[data-printed-ink]')?.getAttribute('data-printed-ink')}));});
 assert.equal(motion.length,2);assert.equal(motion[0].duration,190);assert.equal(motion[1].delay,185);assert(motion.some(m=>m.transform!=='none'));assert.deepEqual(motion.map(m=>m.ink),['3','4']);
 assert.deepEqual(await cell.evaluate(n=>[...n.querySelectorAll('.flap-moving')].map(h=>getComputedStyle(h).backgroundImage)),styles.halves);
 assert.equal(await cell.evaluate(n=>getComputedStyle(n,'::before').transform),'none');
 assert.equal(await cell.locator('.flap-moving').count(),2);
 await page.screenshot({path:path.join(output,'experimental-indexing.png'),fullPage:true});
 await cell.evaluate(n=>n.getAnimations({subtree:true}).forEach(a=>a.play()));await page.evaluate(()=>window.flapExperimentPromise);
 assert.equal(await cell.getAttribute('data-value'),'4');assert.equal(await cell.locator('.flap-moving').count(),0);
 await cell.evaluate(n=>flipFlapOnce(n,'3'));assert.equal(await cell.getAttribute('data-value'),'3');
 await cell.evaluate(n=>flipFlapOnce(n,' '));await page.waitForTimeout(220);assert.equal(await cell.evaluate(n=>getComputedStyle(n,'::after').opacity),'0');await page.screenshot({path:path.join(output,'experimental-blank-lamp-off.png'),clip:await cell.boundingBox()});await cell.evaluate(n=>flipFlapOnce(n,'3'));
 await errors('Experimental flap proof');
 await page.goto(origin+'/mobile/full');await page.waitForSelector('.flap-character');assert((await page.locator('#flight-number>.flap-character').first().evaluate(n=>getComputedStyle(n).backgroundImage)).includes('split-flap-tile.png'),'Mobile retains original artwork');
 fs.writeFileSync(path.join(output,'animation-results.json'),JSON.stringify({viewport:[1920,1080],dpr:1,browser:browser.version(),fixedTime:'2026-10-09T02:35:00Z',fixture:'Fictional EN ROUTE ORD-AVL 3761',styles,motion,allGeometryUnchanged:true,otherTilesOriginal:true,mobileArtworkOriginal:true,blankLampOpacity:0,settlesAndRestores:true,browserErrors:false,capture:'Indexing CSS animations paused at 100ms; native durations and flip function unchanged'},null,2));
 console.log('Experimental flap: geometry, one-tile isolation, fixed hardware, native motion/ink, settle, blank lamp and mobile exclusion passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
