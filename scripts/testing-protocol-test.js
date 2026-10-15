'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {selectPlan,fullMatrix}=require('./browser-test-plan');
const workerCases=plan=>plan.workers.flatMap(w=>w.suites.split(',').map(s=>`${w.engine}/${s}`)).sort();
for(const files of [['Mobile/layout.css'],['models/schedule-state.js'],['App/clock-drums.js'],['README.md']]){
  const plan=selectPlan(files);
  assert.deepEqual(workerCases(plan),plan.matrix.map(j=>`${j.engine}/${j.suite}`).sort(),
    'Worker distribution runs every selected suite/engine exactly once');
  assert.equal(new Set(plan.workers.map(w=>w.id)).size,plan.workers.length,'Workers have unique artifact/retry identities');
  assert(plan.workers.length<=5,'Browser parallelism remains bounded');
}
const broad=selectPlan(['index.html']);
assert.equal(broad.workers.filter(w=>w.engine==='webkit').length,3,'Broad WebKit coverage is balanced across three independently retryable workers');
assert.equal(broad.workers.filter(w=>w.engine==='chromium').length,2);
assert(broad.workers.every(w=>w.estimatedSeconds<=340),'No broad worker retains the former full serial runtime');
// Replay actual clean run 38739031060 timings; this is deterministic scheduler
// coverage, not a wall-clock deadline imposed on a loaded hosted runner.
const observedWebkitMs={power:281884,weekly:81053,'split-flap':25831,map:150933,clocks:51843,duty:88944,posters:33055,family:248949};
const replay=broad.workers.filter(w=>w.engine==='webkit').map(w=>w.suites.split(',').reduce((sum,suite)=>sum+observedWebkitMs[suite],0));
assert(Math.max(...replay)<=360000,'Known slow family proof must not share an overloaded worker with map/posters');
assert.equal(selectPlan(['App/clock-drums.js']).workers.length,2,'Small clock scope still reuses one installed engine per worker');
for(const engine of ['chromium','webkit'])assert(fullMatrix().some(j=>j.suite==='power'&&j.engine===engine),`Full release must verify display power in ${engine}`);
const suites=files=>[...new Set(selectPlan(files).matrix.map(j=>j.suite))];
assert.deepEqual(suites(['App/clock-drums.js']),['clocks'],'A clock edit selects clocks, not map transport');
assert.deepEqual(suites(['assets/hardware/clock-drum-lighting.png']),['clocks']);
assert.deepEqual(suites(['README.md','Docs/Family-beta-guide.md']),[],'Docs do not start app tests');
assert.equal(selectPlan(['README.md']).regression,false);
assert.equal(selectPlan(['App/clock-drums-test.js']).regression,true);
assert.deepEqual(suites(['App/weekly-ticker.js']),['weekly','duty'],'Weekly edits select their duty integration without unrelated artwork scenarios');
for(const file of ['index.html','scripts/build-browser.js','package-lock.json','App/new-shared-code.js','.github/workflows/map-hardware-beta.yml']) {
  assert.equal(selectPlan([file]).full,true,`${file}: shared/unknown code needs broad coverage`);
  assert.deepEqual(selectPlan([file]).matrix,fullMatrix());
}
for(const file of ['App/map-new-shared.js','App/weekly-new-shared.js']) {
  assert.equal(selectPlan([file]).full,true,`${file}: unverified/shared dependencies receive full coverage`);
}
assert(suites(['App/split-flap-audio.js']).includes('audio'),'Split-flap audio changes include the shared unlock consumer');
assert.equal(selectPlan(['App/clock-drums.js'], {release:true}).full,false,'A scoped release is valid when its complete baseline diff is known');
assert.deepEqual(suites(['App/map-cartography.js']),['map']);
assert.deepEqual(suites(['config/posters.js']),['posters']);
assert.deepEqual(suites(['App/daily-duty-card.js']),['duty']);
assert.deepEqual(suites(['server/calendar-service.js']),[],'Calendar adapter behavior is covered by the fast deterministic pass');
assert.deepEqual(suites(['server/family-password.js']),['family']);
// A future unknown Mobile file must still broaden. These are reviewed owners,
// not a blanket exemption for a directory that can introduce shared behavior.
assert.equal(selectPlan(['Mobile/new-shared-code.js']).full,true);
for(const file of ['Mobile/photo-registration.js','Mobile/photo-registration-test.js','scripts/mobile-instrument-plate-browser-proof.js']) {
  const plan=selectPlan([file]);
  assert.equal(plan.full,false,file+': photo mounting has known rendered consumers');
  assert.equal(plan.windowsFull,false,file+': artwork mounting does not change the Windows host');
  assert.deepEqual([...new Set(plan.matrix.map(j=>j.suite))],['split-flap','clocks','family']);
}
for(const file of ['Mobile/layout.js','Mobile/layout.css','Mobile/layout-test.js']) {
  const plan=selectPlan([file]);
  assert.equal(plan.full,false,file+': family layout does not change primary power/audio/refresh controllers');
  assert.equal(plan.windowsFull,false);
  assert.deepEqual([...new Set(plan.matrix.map(j=>j.suite))],['weekly','airline-logo','split-flap','map','artwork','clocks','duty','posters','family']);
}
const actualGraphicsChange=selectPlan(['Mobile/layout.js','Mobile/photo-registration.js','scripts/component-browser-test.js','scripts/mobile-instrument-plate-browser-proof.js','Docs/Mobile-photographic-plates-v6.md']);
assert.equal(actualGraphicsChange.full,false,'Replay the actual clock/raster correction, including its proof files');
assert.equal(actualGraphicsChange.windowsFull,false,'The actual graphics release runs Windows startup smoke');
assert(!actualGraphicsChange.matrix.some(j=>['power','audio','deployment'].includes(j.suite)),'No unrelated primary power/audio/refresh scenarios');
for(const file of ['assets/hardware/HomingBeacon_Walnut_Overlay_Landscape_v2.png','assets/hardware/HomingBeacon_Walnut_Overlay_Portrait_v2.png','assets/hardware/HomingBeacon_Approved_Instrument_Plate_Transparent_v1.png']) {
  assert.deepEqual(suites([file]),['family'],file+': approved mobile-only PNG runs its actual mounting proof');
  assert.equal(selectPlan([file]).windowsFull,false);
}
assert.equal(selectPlan(['assets/hardware/new-unreviewed-plate.png']).full,true,'A new asset needs its consumers reviewed');
assert.deepEqual(suites(['assets/hardware/HomingBeacon_Walnut_Overlay_Landscape_v3.png']),['family'],'A new version of a reviewed mobile-only asset retains its owner');
assert.deepEqual(suites(['assets/hardware/HomingBeacon_Mobile_Clock_Source_v7.png']),['split-flap','clocks','family'],'New photographic asset versions do not fall back to an unrelated full audit');
assert.equal(selectPlan(['App/clock-drums.js']).windowsFull,false);
assert.equal(selectPlan(['scripts/windows-display.js']).windowsFull,true);
assert.equal(selectPlan([], {uncertain:true}).full,true,'Unknown diffs never silently skip coverage');
assert.equal(selectPlan(['App/clock-drums.js','UI/physical-faceplate-v3.css']).full,true);
const {runCases}=require('./run-browser-tests');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dad-radar-protocol-'));
try {
  const failed=path.join(tmp,'fail.js'),later=path.join(tmp,'later.js'),marker=path.join(tmp,'marker');
  fs.writeFileSync(failed,'process.exit(7)');
  fs.writeFileSync(later,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'ran')`);
  const events=[],log=console.log;
  let result;
  try {
    console.log=message=>events.push({message,laterRan:fs.existsSync(marker)});
    result=runCases([{suite:'failure',engine:'chromium',file:failed},{suite:'later',engine:'chromium',file:later}],{artifactRoot:path.join(tmp,'artifacts')});
  } finally {console.log=log;}
  assert.equal(result.exitCode,1,'Any failed suite makes the overall result fail');
  assert.equal(result.results[0].status,7);
  assert.equal(result.results[1].status,0);
  assert.equal(fs.readFileSync(marker,'utf8'),'ran','Later independent suites must run after failure');
  assert.notEqual(result.results[0].artifactDirectory,result.results[1].artifactDirectory,'Evidence is isolated per suite/engine');
  const reports=events.filter(e=>e.message.startsWith('BROWSER_CASE_RESULT '));
  assert.equal(reports.length,2,'Each completed case reports its result immediately');
  assert.equal(reports[0].laterRan,false,'First failure is reported before later cases execute');
  assert.deepEqual(reports.map(e=>JSON.parse(e.message.slice('BROWSER_CASE_RESULT '.length)).status),[7,0]);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
const repo=fs.mkdtempSync(path.join(os.tmpdir(),'dad-radar-diff-'));
try {
  const git=(...args)=>execFileSync('git',args,{cwd:repo,stdio:'pipe'});
  git('init');
  for(const text of ['before','after']) {
    fs.writeFileSync(path.join(repo,'README.md'),text);git('add','README.md');
    git('-c','user.name=Protocol Test','-c','user.email=protocol@example.invalid','commit','-m',text);
  }
  const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'browser-test-plan.js')],{cwd:repo,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:'',GITHUB_STEP_SUMMARY:'',GITHUB_EVENT_NAME:'workflow_dispatch',DADRADAR_TEST_MODE:'focused',DADRADAR_DIFF_BASE:''}}));
  assert.equal(result.full,true,'Missing verified baseline must broaden, never silently compare HEAD parent');
  const first=git('rev-parse','HEAD^').toString().trim();
  fs.writeFileSync(path.join(repo,'App.js'),'new');git('add','App.js');git('-c','user.name=Protocol Test','-c','user.email=protocol@example.invalid','commit','-m','third');
  const range=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'browser-test-plan.js')],{cwd:repo,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:'',GITHUB_STEP_SUMMARY:'',DADRADAR_DIFF_BASE:first}}));
  assert.deepEqual(range.files.sort(),['App.js','README.md'],'Baseline selection includes all intervening commits');
  // Exercise the real CLI over real git history and a real production PNG,
  // including a version increment and multiple commits since the baseline.
  const graphicsBase=git('rev-parse','HEAD').toString().trim();
  const actualAsset='assets/hardware/HomingBeacon_Walnut_Overlay_Landscape_v2.png';
  const nextAsset='assets/hardware/HomingBeacon_Walnut_Overlay_Landscape_v3.png';
  fs.mkdirSync(path.join(repo,'assets/hardware'),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'..',actualAsset),path.join(repo,nextAsset));
  git('add',nextAsset);git('-c','user.name=Protocol Test','-c','user.email=protocol@example.invalid','commit','-m','Replace mobile frame photo');
  const cliPlan=()=>JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'browser-test-plan.js')],{cwd:repo,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:'',GITHUB_STEP_SUMMARY:'',DADRADAR_TEST_MODE:'scoped',DADRADAR_DIFF_BASE:graphicsBase}}));
  const imagePlan=cliPlan();
  assert.deepEqual(imagePlan.files,[nextAsset]);
  assert.equal(imagePlan.full,false);assert.equal(imagePlan.windowsFull,false);
  assert.deepEqual(imagePlan.matrix,[{suite:'family',engine:'chromium'},{suite:'family',engine:'webkit'}],'Actual PNG version update runs its mounting cases on both engines');
  fs.mkdirSync(path.join(repo,'Mobile'));
  fs.copyFileSync(path.join(__dirname,'../Mobile/photo-registration.js'),path.join(repo,'Mobile/photo-registration.js'));
  git('add','Mobile/photo-registration.js');git('-c','user.name=Protocol Test','-c','user.email=protocol@example.invalid','commit','-m','Correct photographic mounting');
  const mountingPlan=cliPlan();
  assert.deepEqual(mountingPlan.files.sort(),['Mobile/photo-registration.js',nextAsset]);
  assert.equal(mountingPlan.full,false);assert.equal(mountingPlan.windowsFull,false);
  assert.deepEqual([...new Set(mountingPlan.matrix.map(j=>j.suite))],['split-flap','clocks','family'],'Second commit retains every consumer from the complete baseline diff');
  fs.writeFileSync(path.join(repo,'Mobile/new-shared-code.js'),'// unreviewed dependency');
  git('add','Mobile/new-shared-code.js');git('-c','user.name=Protocol Test','-c','user.email=protocol@example.invalid','commit','-m','Add unknown dependency');
  assert.equal(cliPlan().full,true,'Unknown code in a later commit still requires broad verification');
} finally {fs.rmSync(repo,{recursive:true,force:true});}
console.log('Testing protocol selection and independent failure collection passed.');
const {assertReleaseResults}=require('./browser-test-plan');
assert.equal(typeof assertReleaseResults,'function','A scoped release must enforce the required result set');
assertReleaseResults(selectPlan(['App/clock-drums.js']),{plan:'success',regression:'success',browser:'success'});
assert.throws(()=>assertReleaseResults(selectPlan(['App/clock-drums.js']),{plan:'success',regression:'success',browser:'skipped'}));
assertReleaseResults(selectPlan(['server/calendar-service.js']),{plan:'success',regression:'success',browser:'skipped'});
for(const result of ['failure','cancelled','skipped'])assert.throws(()=>assertReleaseResults(selectPlan(['App/clock-drums.js']),{plan:'success',regression:result,browser:'success'}));

const {deploymentCommands}=require('./deployment-tests');
assert.deepEqual(deploymentCommands(selectPlan(['package-lock.json'])),[['test']]);
assert(!deploymentCommands(selectPlan(['App/clock-drums.js'])).some(c=>Array.isArray(c)&&c[0]==='test'),'Clock deployment runs smoke, not full replay');
assert(deploymentCommands(selectPlan(['server/calendar-service.js'])).some(c=>c.file==='server/mobile-startup-test.js'),'Deployment retains actual host/gateway startup');

assert.deepEqual(suites(['App/printed-glyphs.js']),['weekly','split-flap','artwork','clocks','duty'],'Glyph changes check every printed consumer');
const {needsWindowsContract}=require('./browser-test-plan');
assert(needsWindowsContract(['ops/home-control/DadRadarRemote.ps1','App/clock-drums.js']));
assert(!needsWindowsContract(['App/clock-drums.js']));
assert(!needsWindowsContract(['ops/home-control/verified-baseline.json']));
assert(needsWindowsContract([], {uncertain:true}));

// This test utility must delay delivery, not execution: browser animations
// continue normally while an already-captured driver response is in transit.
(async()=>{
  const {withDelayedEvaluationResponse}=require('./browser-response-delay');
  let calls=0;
  const page={evaluate:async(fn,arg)=>{calls++;return fn(arg);}};
  const original=page.evaluate;
  const result=await withDelayedEvaluationResponse(page,async()=>{
    const at=process.hrtime.bigint();
    const sample=await page.evaluate(value=>({value}), 'captured');
    assert(Number(process.hrtime.bigint()-at)/1e6>=15,'Response is actually delayed, not just labeled');
    assert.equal(page.evaluate,original,'Only the first evaluation response is delayed');
    return sample;
  },20);
  assert.deepEqual(result,{value:'captured'},'Delay preserves the sampled payload');
  assert.equal(calls,1,'Delay never retries or re-executes the browser action');
  assert.equal(page.evaluate,original);
  const failure=new Error('real browser failure');
  await assert.rejects(withDelayedEvaluationResponse(page,()=>page.evaluate(()=>{throw failure;}),1),error=>error===failure);
  assert.equal(page.evaluate,original,'Browser failure restores the original evaluator');
  await assert.rejects(withDelayedEvaluationResponse(page,async()=>{throw failure;},1),error=>error===failure);
  assert.equal(page.evaluate,original,'Action failure before evaluation also restores it');
  console.log('Delayed browser-response regression utility passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
