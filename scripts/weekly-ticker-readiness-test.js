"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm");
const {weeklyArtworkReady}=require("./weekly-ticker-browser-proof");
const good=()=>({complete:true,naturalWidth:1192,naturalHeight:976});
const ready=arts=>vm.runInNewContext("("+weeklyArtworkReady.toString()+")()",{
  document:{querySelectorAll(selector){
    assert.equal(selector,"#weekly-overnight-bank .weekly-overnight-module-art");
    return arts;
  }},
  // Performance history must never be consulted for actual image readiness.
  performance:{getEntriesByType(){throw Error("incidental timing history consulted");}}
});
assert.equal(ready(Array.from({length:7},good)),true,"Seven decoded original-size images are ready without timing history");
for(const count of [0,1,6,8])assert.equal(ready(Array.from({length:count},good)),false,"Exactly seven images are required");
for(let index=0;index<7;index++){
  for(const bad of [{complete:false},{naturalWidth:0},{naturalWidth:1191},{naturalHeight:975}]){
    const arts=Array.from({length:7},good);
    Object.assign(arts[index],bad);
    assert.equal(ready(arts),false,`Image ${index} cannot pass with ${JSON.stringify(bad)}`);
  }
}
console.log("Weekly image readiness rejects any missing, undecoded or wrong-sized bay without relying on request history");
