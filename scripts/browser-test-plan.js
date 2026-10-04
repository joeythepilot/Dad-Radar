'use strict';
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const SUITES=[
  {suite:'weekly',file:'scripts/weekly-ticker-headed-test.js',engines:['chromium','webkit']},
  {suite:'split-flap',file:'scripts/split-flap-headed-test.js',engines:['chromium','webkit']},
  {suite:'map',file:'scripts/map-hardware-headed-test.js',engines:['chromium','webkit']},
  {suite:'artwork',file:'scripts/approved-artwork-browser-test.js',engines:['chromium']},
  {suite:'deployment',file:'scripts/deployment-refresh-browser-test.js',engines:['chromium']},
  {suite:'audio',file:'scripts/audio-control-browser-test.js',engines:['chromium']},
  {suite:'clocks',file:'scripts/approved-artwork-browser-test.js',engines:['chromium','webkit'],focus:'clocks'}
];
const fullMatrix=()=>SUITES.flatMap(s=>s.engines.map(engine=>({suite:s.suite,engine})));
const docs=p=>/\.md$/i.test(p)||/^(Docs|docs)\//.test(p);
function selectPlan(files,{release=false,uncertain=false}={}) {
  const paths=files.filter(p=>p&&!docs(p));
  let full=release||uncertain;
  const selected=new Set();
  for(const p of paths) {
    if(/^(App\/clock-drums(?:-test)?\.js|assets\/hardware\/clock-drum-[^/]+\.png)$/.test(p))selected.add('clocks');
    else if(/^(App\/weekly-[^/]+\.js|UI\/weekly-ticker[^/]*\.css|scripts\/weekly-ticker[^/]*\.js)$/.test(p))['weekly','artwork'].forEach(s=>selected.add(s));
    else if(/^(App\/split-flap[^/]*\.js|UI\/split-flap[^/]*\.css|scripts\/split-flap[^/]*\.js|assets\/split-flap\/)/.test(p))['split-flap','artwork'].forEach(s=>selected.add(s));
    else if(/^(App\/(map-|route-map|descent-camera)|scripts\/(map-hardware|map-startup|maproll|graphite-history)|assets\/maps\/)/.test(p))['map','artwork'].forEach(s=>selected.add(s));
    else if(/^(App\/deployment-refresh|scripts\/deployment-refresh)/.test(p))selected.add('deployment');
    else if(/^scripts\/audio-control-browser-test\.js$/.test(p))selected.add('audio');
    else if(/^scripts\/approved-artwork-browser-test\.js$/.test(p))['artwork','clocks'].forEach(s=>selected.add(s));
    else full=true; // Shared consumers, new files and unknown dependencies are broad by default.
  }
  const matrix=full?fullMatrix():fullMatrix().filter(j=>selected.has(j.suite));
  return {regression:full||paths.length>0,full,matrix,files};
}
function changedPaths(base) {
  if(!/^[a-f0-9]{40}$/.test(base||'')||/^0+$/.test(base))return {files:[],uncertain:true};
  try {
    try {execFileSync('git',['cat-file','-e',base],{stdio:'ignore'});}
    catch {execFileSync('git',['fetch','--depth=1','origin',base],{stdio:'ignore'});}
    return {files:execFileSync('git',['diff','--name-only','--no-renames',base,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean),uncertain:false};
  } catch {return {files:[],uncertain:true};}
}
if(require.main===module) {
  const release=process.env.DADRADAR_TEST_MODE==='release';
  let base=process.env.DADRADAR_DIFF_BASE;
  if(!base && process.env.GITHUB_EVENT_NAME==='workflow_dispatch' && !release) {
    try {base=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();} catch {}
  }
  const {files,uncertain}=release?{files:[],uncertain:false}:changedPaths(base);
  const plan=selectPlan(files,{release,uncertain});
  console.log(JSON.stringify(plan,null,2));
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
    `regression=${plan.regression}\nfull=${plan.full}\nhas_browser=${plan.matrix.length>0}\nmatrix=${JSON.stringify({include:plan.matrix})}\n`);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Test selection\nSHA: ${process.env.GITHUB_SHA}\n\nMode: ${release?'release':plan.full?'conservative full coverage':'focused'}\n\nChanged files:\n${files.map(p=>'- '+p).join('\n')||'(release or unavailable diff)'}\n\nBrowser cases:\n${plan.matrix.map(j=>'- '+j.suite+' / '+j.engine).join('\n')||'(none)'}\n`);
}
module.exports={SUITES,selectPlan,fullMatrix,changedPaths};
