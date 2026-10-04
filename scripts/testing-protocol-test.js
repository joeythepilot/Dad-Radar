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
assert.deepEqual(suites(['App/weekly-ticker.js']),['weekly','artwork'],'Weekly consumers include the artwork integration');
for(const file of ['index.html','Mobile/layout.css','scripts/build-browser.js','package-lock.json','App/new-shared-code.js','.github/workflows/map-hardware-beta.yml']) {
  assert.equal(selectPlan([file]).full,true,`${file}: shared/unknown code needs broad coverage`);
  assert.deepEqual(selectPlan([file]).matrix,fullMatrix());
}
for(const file of ['UI/weekly-ticker-layout.css','App/map-new-shared.js','App/weekly-new-shared.js']) {
  assert.equal(selectPlan([file]).full,true,`${file}: unverified/shared dependencies receive full coverage`);
}
assert(suites(['App/split-flap-audio.js']).includes('audio'),'Split-flap audio changes include the shared unlock consumer');
assert.equal(selectPlan([], {release:true}).full,true,'A release always tests the whole candidate');
assert.equal(selectPlan([], {uncertain:true}).full,true,'Unknown diffs never silently skip coverage');
assert.deepEqual(suites(['App/clock-drums.js','UI/physical-faceplate-v3.css']),['weekly','split-flap','map','artwork','deployment','audio','clocks']);
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
  assert.equal(result.regression,false,'Manual focused verification must compare the previous commit rather than always running everything');
  assert.deepEqual(result.files,['README.md']);
} finally {fs.rmSync(repo,{recursive:true,force:true});}
console.log('Testing protocol selection and independent failure collection passed.');
