'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync,execFileSync}=require('node:child_process');
const {SUITES,fullMatrix}=require('./browser-test-plan');
function runCases(cases,{artifactRoot=path.resolve('artifacts/browser'),quiet=false}={}) {
  const results=[];
  for(const job of cases) {
    const artifactDirectory=path.join(artifactRoot,job.suite+'-'+job.engine);
    fs.mkdirSync(artifactDirectory,{recursive:true});
    if(!quiet)console.log(`Checking ${job.suite} / ${job.engine}`);
    const started=Date.now();
    const child=spawnSync(process.execPath,[job.file],{stdio:quiet?'ignore':'inherit',env:{...process.env,
      DADRADAR_BROWSER_ENGINE:job.engine,DADRADAR_BROWSER_FOCUS:job.focus||'',DADRADAR_ARTIFACT_ROOT:artifactDirectory}});
    const status=child.status===null?1:child.status;
    results.push({suite:job.suite,engine:job.engine,status,elapsedMs:Date.now()-started,artifactDirectory,error:child.error?.message,signal:child.signal});
  }
  let sha=null;try {sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch {}
  fs.mkdirSync(artifactRoot,{recursive:true});
  fs.writeFileSync(path.join(artifactRoot,'results.json'),JSON.stringify({sha,results},null,2));
  return {exitCode:results.some(r=>r.status!==0)?1:0,results};
}
if(require.main===module) {
  const args=process.argv.slice(2);let suite,engine;
  for(let i=0;i<args.length;i+=2) {
    if(args[i]==='--suite')suite=args[i+1];else if(args[i]==='--engine')engine=args[i+1];else throw new Error('Unknown browser option: '+args[i]);
    if(!args[i+1])throw new Error('Missing browser option value');
  }
  if(suite&&!SUITES.some(s=>s.suite===suite))throw new Error('Unknown browser suite: '+suite);
  if(engine&&!['chromium','webkit'].includes(engine))throw new Error('Unknown browser engine: '+engine);
  const cases=fullMatrix().filter(j=>(!suite||j.suite===suite)&&(!engine||j.engine===engine)).map(j=>({...j,...SUITES.find(s=>s.suite===j.suite),engine:j.engine}));
  if(!cases.length)throw new Error('No supported browser cases selected');
  const result=runCases(cases);console.log(JSON.stringify(result,null,2));process.exitCode=result.exitCode;
}
module.exports={runCases};
