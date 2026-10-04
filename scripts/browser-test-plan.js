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
  const known={
    clocks:['App/clock-drums.js','App/clock-drums-test.js','assets/hardware/clock-drum-mechanism.png','assets/hardware/clock-drum-lighting.png'],
    weekly:['App/weekly-ticker.js','App/weekly-ticker-test.js','App/weekly-calendar-sync-test.js','App/weekly-overnight-update-test.js','scripts/weekly-ticker-headed-test.js','scripts/weekly-ticker-browser-proof.js'],
    'split-flap':['App/split-flap-state.js','App/split-flap-state-test.js','UI/split-flap-matte.css','scripts/split-flap-headed-test.js','scripts/split-flap-visual-style-test.js','assets/split-flap/split-flap-tile.png'],
    map:['App/map-cartography.js','App/map-cartography-test.js','App/route-map.js','App/route-map-test.js','App/descent-camera.js','App/descent-camera-test.js','App/map-roll-transition.js','App/map-roll-transition-test.js','App/map-roll-lifecycle-test.js','scripts/map-hardware-headed-test.js','scripts/map-hardware-browser-test.js','scripts/map-hardware-diagnostics.js','scripts/map-startup-mobile-browser-proof.js'],
    deployment:['App/deployment-refresh.js','App/deployment-refresh-test.js','scripts/deployment-refresh-browser-test.js'],
    audio:['scripts/audio-control-browser-test.js']
  };
  for(const p of paths) {
    const component=Object.keys(known).find(s=>known[s].includes(p));
    if(component) {
      selected.add(component);
      if(['weekly','split-flap','map'].includes(component))selected.add('artwork');
    } else if(['App/split-flap-audio.js','App/split-flap-audio-test.js'].includes(p)) {
      ['split-flap','artwork','audio'].forEach(s=>selected.add(s));
    } else if(['App/map-roll-audio.js','App/map-roll-audio-test.js'].includes(p)) {
      ['map','artwork','audio'].forEach(s=>selected.add(s));
    } else if(p==='scripts/approved-artwork-browser-test.js') {
      ['artwork','clocks'].forEach(s=>selected.add(s));
    } else full=true; // Shared consumers, new files and unknown dependencies are broad by default.
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
