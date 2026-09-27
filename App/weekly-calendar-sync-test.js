"use strict";
const assert = require("node:assert/strict");
const {fetchUpcomingSchedule} = require("./weekly-ticker");

async function run() {
  assert.equal(typeof fetchUpcomingSchedule,"function","The wheel schedule read must be bounded.");
  let aborted=false;
  const stalled={
    AbortController, setTimeout, clearTimeout,
    fetch(_url,{signal}) {return new Promise((_resolve,reject)=>{
      signal.addEventListener("abort",()=>{aborted=true;reject(new Error("aborted"));},{once:true});
    });}
  };
  await assert.rejects(fetchUpcomingSchedule(stalled,10),/aborted/);
  assert.equal(aborted,true,"A stuck display request is aborted so a later poll can proceed.");
  let calls=0;
  const recovered={AbortController,setTimeout,clearTimeout,async fetch(_url,{cache}){
    calls++; assert.equal(cache,"no-store");
    return {ok:true,async json(){return {events:[{id:"fresh-rap"}]};}};
  }};
  const data=await fetchUpcomingSchedule(recovered,10);
  assert.equal(calls,1);
  assert.deepEqual(data.events,[{id:"fresh-rap"}],"The next poll can load an updated schedule.");
  console.log("Weekly calendar sync tests passed: stalled request recovery and fresh schedule.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
