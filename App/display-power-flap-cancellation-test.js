"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"main.js"),"utf8");
const queue=source.slice(source.indexOf("function queueFlapAnimation("),source.indexOf("function prepareFlapContainer("));
async function run(){
  const pending=[];let finished=0;
  const cell={dataset:{value:" "},querySelectorAll:()=>[],querySelector:()=>({}),classList:{remove(){}}};
  const context={forcePowerFlapSettle:false,displayPowerSnapshot:null,
    beginSplitFlapAudio(){},finishSplitFlapAudio(){finished++;},setFlapHalfCharacter(){},wait:()=>Promise.resolve(),
    buildFlapSequence:()=>["A","B","C"],
    flipFlapOnce:(node,value)=>new Promise(resolve=>{
      const serial=node._presentationSerial||0;
      pending.push(()=>{if(serial===(node._presentationSerial||0))node.dataset.value=value;resolve();});
    })};
  vm.createContext(context);vm.runInContext(queue,context);
  context.queueFlapAnimation(cell,"C");assert.equal(pending.length,1);
  context.forcePowerFlapSettle=true;context.queueFlapAnimation(cell,"C");
  context.forcePowerFlapSettle=false;pending.shift()();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,0,"Settling cancels the whole old sequence, not just its current flip");
  assert.equal(cell.dataset.value,"C");assert.equal(cell._animationRunning,false);
  assert.equal(finished,1,"Cancelled queue releases operational audio bookkeeping");
  console.log("Power flap queue cancellation passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
