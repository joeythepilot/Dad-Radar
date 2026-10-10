"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"main.js"),"utf8");
const queue=source.slice(source.indexOf("function queueFlapAnimation("),source.indexOf("function prepareFlapContainer("));
const sequenceSource=source.slice(source.indexOf("function buildPowerIndexSequence("),source.indexOf("function flipFlapOnce("));
const sequenceContext={FLAP_CHARACTER_SET:" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./"};
vm.createContext(sequenceContext);vm.runInContext(sequenceSource,sequenceContext);
assert.deepEqual(Array.from(sequenceContext.buildPowerIndexSequence(" "," ",true)),[" "," "],"Unknown airline tile never flashes alphabetic characters during its indexing check");
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
  cell._powerIndexPending=true;
  context.forcePowerFlapSettle=true;context.queueFlapAnimation(cell,"C");
  assert(!cell._powerIndexPending,"Forced settlement clears any pending power indexing");
  context.forcePowerFlapSettle=false;pending.shift()();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,0,"Settling cancels the whole old sequence, not just its current flip");
  assert.equal(cell.dataset.value,"C");assert.equal(cell._animationRunning,false);
  assert.equal(finished,1,"Cancelled queue releases operational audio bookkeeping");
  cell._powerIndexPending=true;cell.dataset.value="C";
  context.buildPowerIndexSequence=()=>["D","E","C"];
  context.queueFlapAnimation(cell,"C");
  assert.equal(pending.length,1,"An unchanged flap must perform the requested startup indexing check");
  while(pending.length){pending.shift()();await new Promise(resolve=>setImmediate(resolve));}
  assert.equal(cell.dataset.value,"C","Startup indexing lands on the current target");
  context.queueFlapAnimation(cell,"D");
  context.forcePowerFlapSettle=true;context.queueFlapAnimation(cell,"C");context.forcePowerFlapSettle=false;
  cell._powerIndexPending=true;context.queueFlapAnimation(cell,"C");
  pending.shift()();await new Promise(resolve=>setImmediate(resolve));
  assert(pending.length>0,"A restarted unchanged flap indexes after the cancelled queue unwinds");
  while(pending.length){pending.shift()();await new Promise(resolve=>setImmediate(resolve));}
  console.log("Power flap queue cancellation passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
