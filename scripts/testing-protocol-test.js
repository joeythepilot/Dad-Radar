'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
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
console.log('Testing protocol selection and independent failure collection passed.');
