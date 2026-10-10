"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const file=require("node:path").join(__dirname,"display-power-audio.js");
const api=fs.existsSync(file)?require(file):{};
assert.equal(typeof api.createPowerAudio,"function","Cancellable primary power audio must exist");
const snapshot=(state,generation=1,elapsed=0)=>({state,generation,elapsed,duration:state==="starting"?5000:2400,progress:state==="off"?0:1});
function audioFixture(){
  const nodes=[];let resumes=0;
  const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const context={state:"running",currentTime:0,destination:{},resume(){resumes++;return Promise.resolve();},close(){return Promise.resolve();},
    createGain(){return {gain:param(),connect(){},disconnect(){}};},
    createOscillator(){const node={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(time){this.stopped=true;(this.stops??=[]).push(time);}};nodes.push(node);return node;}};
  return {context,nodes,get resumes(){return resumes;}};
}
async function run(){
  const f=audioFixture();let enabled=true;
  const controller=api.createPowerAudio({audioContextFactory:()=>f.context,volume:.3,isEnabled:()=>enabled});
  controller.apply(snapshot("on",0));assert.equal(f.nodes.length,0,"Ordinary load is silent");
  assert.equal(await controller.unlock(),true);
  assert.equal(typeof controller.mechanicalCue,"function","Physical indexing must have synchronized detent audio");
  controller.apply(snapshot("stopping"));assert(f.nodes.some(n=>n.started),"Intentional transition starts audition envelope");
  const beforeDetent=f.nodes.length;controller.mechanicalCue("clock");
  assert(f.nodes.length>beforeDetent,"Clock motion produces a physical detent, not only a power blip");
  const count=f.nodes.length;controller.apply(snapshot("stopping",1,100));assert.equal(f.nodes.length,count,"Frames do not restart sounds");
  controller.apply(snapshot("starting",2));assert(f.nodes.slice(0,count).every(n=>n.stopped),"Reversal cancels old envelope");
  const reversedCount=f.nodes.length;
  f.context.state="suspended";
  controller.apply(snapshot("off",2,60000));assert(f.nodes.every(n=>n.stops.includes(undefined)&&n.disconnected),"Same-generation terminal state cancels suspended audio immediately");
  enabled=false;controller.apply(snapshot("starting",4));assert.equal(f.nodes.length,reversedCount,"Disabled sound has no new source");
  controller.destroy();assert.equal(await controller.unlock(),false);
  const failing=api.createPowerAudio({audioContextFactory(){throw Error("Audio unavailable");}});
  assert.equal(await failing.unlock(),false);assert.doesNotThrow(()=>failing.apply(snapshot("starting")));
  const slow=audioFixture();let resolveResume;slow.context.state="suspended";
  slow.context.resume=()=>new Promise(resolve=>{resolveResume=resolve;});
  const stale=api.createPowerAudio({audioContextFactory:()=>slow.context});
  const unlocking=stale.unlock();stale.apply(snapshot("stopping"));stale.apply(snapshot("off",2));
  resolveResume();await unlocking;assert.equal(slow.nodes.length,0,"Late unlock never replays cancelled power cue");
  const resumed=audioFixture();const again=api.createPowerAudio({audioContextFactory:()=>resumed.context});
  await again.unlock();resumed.context.state="suspended";
  resumed.context.resume=()=>new Promise(resolve=>{resolveResume=resolve;});
  const secondUnlock=again.unlock();again.apply(snapshot("starting",5));
  assert.equal(resumed.nodes.length,0,"A previously unlocked suspended context cannot schedule a new cue");
  again.apply(snapshot("on",5,60000));resumed.context.state="running";resolveResume();await secondUnlock;
  again.apply(snapshot("on",5,60000));assert.equal(resumed.nodes.length,0,"Late resume after completion remains silent");
  console.log("Power audio envelopes: cancellation, disabled/failing audio and stale unlock passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
