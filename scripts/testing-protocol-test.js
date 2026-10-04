'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {selectPlan,fullMatrix}=require('./browser-test-plan');
const suites=files=>[...new Set(selectPlan(files).matrix.map(j=>j.suite))];
assert.deepEqual(suites(['App/clock-drums.js']),['clocks'],'A clock edit selects clocks, not map transport');
assert.deepEqual(suites(['assets/hardware/clock-drum-lighting.png']),['clocks']);
assert.deepEqual(suites(['README.md','Docs/Family-beta-guide.md']),[],'Docs do not start app tests');
assert.equal(selectPlan(['README.md']).regression,false);
assert.equal(selectPlan(['App/clock-drums-test.js']).regression,true);
assert.deepEqual(suites(['App/weekly-ticker.js']),['weekly','duty'],'Weekly edits select their duty integration without unrelated artwork scenarios');
for(const file of ['index.html','Mobile/layout.css','scripts/build-browser.js','package-lock.json','App/new-shared-code.js','.github/workflows/map-hardware-beta.yml']) {
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
  const result=runCases([{suite:'failure',engine:'chromium',file:failed},{suite:'later',engine:'chromium',file:later}],{artifactRoot:path.join(tmp,'artifacts'),quiet:true});
  assert.equal(result.exitCode,1,'Any failed suite makes the overall result fail');
  assert.equal(result.results[0].status,7);
  assert.equal(result.results[1].status,0);
  assert.equal(fs.readFileSync(marker,'utf8'),'ran','Later independent suites must run after failure');
  assert.notEqual(result.results[0].artifactDirectory,result.results[1].artifactDirectory,'Evidence is isolated per suite/engine');
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
