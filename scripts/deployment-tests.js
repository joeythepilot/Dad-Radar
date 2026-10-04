'use strict';
const {execFileSync,spawnSync}=require('node:child_process');
const {changedPaths,selectPlan}=require('./browser-test-plan');
const SMOKE=['server/deployment-version-test.js','scripts/family-beta-host-test.js','server/mobile-startup-test.js','scripts/boot-diagnostic-test.js'];
function deploymentCommands(plan){return plan.windowsFull?[['test']]:[['run','build:browser'],...SMOKE.map(file=>({file}))];}
if(require.main===module){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--base'||!/^[a-f0-9]{40}$/.test(args[1]))throw new Error('Deployment verification requires --base <40-character SHA>');
  const diff=changedPaths(args[1]);const plan=selectPlan(diff.files,{uncertain:diff.uncertain});
  console.log(JSON.stringify({sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base:args[1],files:diff.files,windowsFull:plan.windowsFull,commands:deploymentCommands(plan)},null,2));
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  for(const command of deploymentCommands(plan)){
    const started=Date.now();
    const r=command.file?spawnSync(process.execPath,[command.file],{stdio:'inherit'}):spawnSync(npm,command,{stdio:'inherit',shell:process.platform==='win32'});
    console.log(`Deployment check ${command.file||command.join(' ')}: ${Date.now()-started}ms`);
    if(r.error||r.status!==0){if(r.error)console.error(r.error.message);process.exit(r.status||1);}
  }
}
module.exports={deploymentCommands,SMOKE};
