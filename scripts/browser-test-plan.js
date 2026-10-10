'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const SUITES=[
  {suite:'power',file:'scripts/display-power-browser-test.js',engines:['chromium','webkit']},
  {suite:'weekly',file:'scripts/weekly-ticker-headed-test.js',engines:['chromium','webkit']},
  {suite:'airline-logo',file:'scripts/airline-logo-browser-test.js',engines:['chromium']},
  {suite:'split-flap',file:'scripts/split-flap-headed-test.js',engines:['chromium','webkit']},
  {suite:'map',file:'scripts/map-hardware-headed-test.js',engines:['chromium','webkit']},
  {suite:'artwork',file:'scripts/approved-artwork-browser-test.js',engines:['chromium']},
  {suite:'deployment',file:'scripts/deployment-refresh-browser-test.js',engines:['chromium']},
  {suite:'audio',file:'scripts/audio-control-browser-test.js',engines:['chromium']},
  {suite:'clocks',file:'scripts/approved-artwork-browser-test.js',engines:['chromium','webkit'],focus:'clocks'},
  {suite:'duty',file:'scripts/component-browser-test.js',engines:['chromium','webkit'],focus:'duty'},
  {suite:'posters',file:'scripts/component-browser-test.js',engines:['chromium','webkit'],focus:'posters'},
  {suite:'family',file:'scripts/component-browser-test.js',engines:['chromium','webkit'],focus:'family'}
];
const fullMatrix=()=>SUITES.flatMap(s=>s.engines.map(engine=>({suite:s.suite,engine})));
const known=new Map();
function own(files,suites,windowsFull=false){for(const file of files)known.set(file,{suites,windowsFull});}
function pairs(directory,names){return names.flatMap(n=>[`${directory}/${n}.js`,`${directory}/${n}-test.js`]);}
own(pairs('App',['clock-drums']),['clocks']);
own(['assets/hardware/clock-drum-mechanism.png','assets/hardware/clock-drum-lighting.png'],['clocks']);
own(pairs('App',['weekly-ticker']),['weekly','duty']);
own(['App/weekly-calendar-sync-test.js','App/weekly-overnight-update-test.js','UI/weekly-ticker-layout.css','scripts/weekly-ticker-headed-test.js','scripts/weekly-ticker-browser-proof.js'],['weekly','duty']);
own(pairs('App',['daily-duty-card','daily-schedule-layout']),['duty']);
own(['UI/daily-duty-card.css','scripts/daily-duty-card-style-test.js','scripts/family-duty-browser-proof.js','assets/ui/today-duty-card-weekly-paper.png'],['duty']);
own(pairs('App',['split-flap-state']),['split-flap']);
own(['UI/split-flap-matte.css','scripts/split-flap-headed-test.js','scripts/split-flap-visual-style-test.js','assets/split-flap/split-flap-tile.png'],['split-flap']);
own(pairs('App',['map-cartography','route-map','descent-camera','map-roll-transition','airport-surface-map','sequence-history-map']),['map']);
own(['App/map-roll-lifecycle-test.js','UI/map.css','UI/map-paper-chart.css','UI/map-roll-transition.css','UI/sequence-history.css','scripts/map-hardware-headed-test.js','scripts/map-hardware-browser-test.js','scripts/map-hardware-diagnostics.js','scripts/map-startup-mobile-browser-proof.js','scripts/expanded-map-test.js'],['map']);
own(pairs('App',['deployment-refresh']),['deployment']);
own(['server/deployment-version.js','server/deployment-version-test.js','scripts/deployment-refresh-browser-test.js'],['deployment']);
own(pairs('App',['split-flap-audio']),['split-flap','audio']);
own(pairs('App',['map-roll-audio']),['map','audio']);
own(pairs('App',['altitude-chime','station-ident']),['audio']);
own(['scripts/audio-control-browser-test.js'],['audio']);
own(pairs('App',['poster-image-loader']),['posters']);
own(['config/posters.js','config/posters-test.js','data/poster-batch-manifest.json','data/approved-poster-inventory.json','scripts/validate-poster-batch.js'],['posters']);
own(pairs('App',['instrument-math','instrument-wheels','approved-map-artwork']),['artwork']);
own(['App/printed-glyphs.js'],['weekly','split-flap','artwork','clocks','duty']);
own(pairs('App',['printed-ink']),['weekly','split-flap','artwork','clocks','duty']);
own(['UI/instrument-wheels.css','UI/approved-map-artwork.css','scripts/instrument-wheels-browser-proof.js','scripts/printed-ink-browser-proof.js','scripts/physical-faceplate-browser-proof.js','scripts/clock-rods-browser-proof.js'],['artwork','clocks','duty']);
own(['scripts/approved-artwork-browser-test.js','scripts/approved-artwork-test.js'],['artwork','clocks']);
own(pairs('server',['family-password','mobile-access']),['family']);
own(pairs('Mobile',['view-model']),['family']);
own(['Mobile/family-auth.js','server/mobile-startup-test.js'],['family']);
// These adapters/models are exercised by the complete, inexpensive hosted regression.
// State/controller changes also check their rendered consumers; adapter-only changes do not.
own(pairs('server',['calendar-service','pilot-schedule-parser','adsb-lol-service','flightradar24-service','flightaware-operational-service','flightaware-route-service','live-flight-provider-service','weather-radar-service','live-flight-diagnostic','diagnostic-log']),[]);
own(pairs('server',['airport-surface-service']),['map']);
own(pairs('server',['master-state-service','sequence-history-service','flight-leg-guard']),['map','clocks','duty','family']);
own(['server/master-operational-enrichment-test.js','server/operational-polling-handoff-test.js','server/operational-arrival-precedence-test.js','server/provider-http-integration-test.js'],['map','clocks','duty','family']);
own(pairs('models',['schedule-state','operational-schedule-state','live-flight-state']),['weekly','map','clocks','duty','family']);
own(['models/overdue-commute-retention-test.js','models/states.js'],['weekly','map','clocks','duty','family']);
own(pairs('services',['calendar-state-controller','live-flight-api-service','live-refresh-schedule','calendar-api-service']),['weekly','map','clocks','duty','family']);
own(['services/master-display-test.js'],['map','clocks','duty','family']);
own(pairs('scripts',['beta-address','family-beta-check']),[],true);
own(pairs('scripts',['windows-display','windows-autostart','family-beta-host']),[],true);
own(['scripts/windows-display-host.js','scripts/mobile-setup.js'],[],true);
function selectPlan(files,{full=false,uncertain=false}={}) {
  const paths=files.filter(p=>p&&!/\.md$/i.test(p)&&p!=='ops/home-control/verified-baseline.json');
  full=full||uncertain;
  let windowsFull=full;
  const selected=new Set();
  for(const p of paths){
    const rule=known.get(p);
    if(rule){rule.suites.forEach(s=>selected.add(s));windowsFull=windowsFull||rule.windowsFull;}
    else if(/^assets\/destinations\/[^/]+\.png$/.test(p))selected.add('posters');
    else if(/^assets\/maps\/[^/]+\.(svg|jpg|png)$/.test(p))selected.add('map');
    else if(p==='assets/hardware/approved-map-artwork.json')selected.add('artwork');
    else {full=true;windowsFull=true;}
  }
  const matrix=full?fullMatrix():fullMatrix().filter(j=>selected.has(j.suite));
  const workers=['chromium','webkit'].map(engine=>({engine,suites:matrix.filter(j=>j.engine===engine).map(j=>j.suite).join(',')})).filter(j=>j.suites);
  return {regression:full||paths.length>0,full,windowsFull:windowsFull||full,matrix,workers,files};
}
function needsWindowsContract(files,{uncertain=false}={}) {
  return uncertain||files.some(p=>p!=='ops/home-control/verified-baseline.json'&&(/^(ops\/home-control\/|package\.json$|\.github\/workflows\/home-control-contract\.yml$)/.test(p)));
}
function changedPaths(base,target='HEAD') {
  if(!/^[a-f0-9]{40}$/.test(base||'')||/^0+$/.test(base))return {files:[],uncertain:true};
  try {
    try {execFileSync('git',['cat-file','-e',base],{stdio:'ignore'});}
    catch {execFileSync('git',['fetch','--depth=1','origin',base],{stdio:'ignore'});}
    execFileSync('git',['merge-base','--is-ancestor',base,target],{stdio:'ignore'});
    return {files:execFileSync('git',['diff','--name-only','--no-renames',base,target],{encoding:'utf8'}).trim().split('\n').filter(Boolean),uncertain:false};
  } catch {return {files:[],uncertain:true};}
}
function assertReleaseResults(plan,results){
  for(const [name,required] of [['plan',true],['regression',plan.regression],['browser',plan.matrix.length>0]]){
    const expected=required?'success':'skipped';
    if(results[name]!==expected)throw new Error(`${name}: required ${expected}, received ${results[name]}`);
  }
}
if(require.main===module){
  const full=process.env.DADRADAR_TEST_MODE==='full';
  let base=process.env.DADRADAR_DIFF_BASE;
  if(!base){try {base=JSON.parse(fs.readFileSync('ops/home-control/verified-baseline.json','utf8')).sha;}catch{}}
  const {files,uncertain}=changedPaths(base);
  const plan={...selectPlan(files,{full,uncertain}),base:base||null,sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
  console.log(JSON.stringify(plan,null,2));
  if(process.env.DADRADAR_PLAN_PATH)fs.writeFileSync(process.env.DADRADAR_PLAN_PATH,JSON.stringify(plan,null,2));
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`regression=${plan.regression}\nfull=${plan.full}\nbase=${/^[a-f0-9]{40}$/.test(base||'')?base:'unknown'}\nhas_browser=${plan.workers.length>0}\nmatrix=${JSON.stringify({include:plan.workers})}\n`);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Coverage plan\nSHA: ${plan.sha}\nBaseline: ${base||'unknown'}\nMode: ${plan.full?'full fallback':'scoped release'}\n\nChanged files:\n${files.map(p=>'- '+p).join('\n')||'(none or unavailable)'}\n\nBrowser cases:\n${plan.matrix.map(j=>'- '+j.suite+' / '+j.engine).join('\n')||'(none)'}\nWindows: ${plan.windowsFull?'full platform verification':'deployment smoke'}\n`);
}
module.exports={SUITES,selectPlan,fullMatrix,changedPaths,assertReleaseResults,needsWindowsContract};
