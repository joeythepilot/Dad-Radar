"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const visual=require("./display-power.js");
const snapshot=(state,progress)=>({state,progress,elapsed:(state==="starting"?progress:1-progress)*(state==="starting"?5000:2400),duration:state==="starting"?5000:2400,reducedMotion:false});
// The lamp must be fully visible BEFORE the mechanism starts, and remain
// visible while blanking. Otherwise genuine native flips are merely a fade.
assert.equal(visual.moduleLight(snapshot("starting",.30),"flaps"),1,"Flap illumination precedes indexing");
assert.equal(visual.moduleLight(snapshot("stopping",.30),"flaps"),1,"Blanking is visible before extinction");
assert.equal(visual.moduleLight(snapshot("starting",.28),"clocks"),1,"Clock lamp precedes drum roll");
assert.equal(visual.moduleLight(snapshot("starting",.40),"weekly",0),1,"Weekly material lit before wheel movement");
const source=fs.readFileSync(require.resolve("./display-power.js"),"utf8");
assert(source.includes('createElementNS(ns,"use")'),"CRT picture is a live optical projection rather than a crop/reveal");
assert(source.includes('projection.style.transform'),"Only the optical projection compresses, never the measured live map");
assert(source.includes('`0 0 ${shell.clientWidth} ${shell.clientHeight}`'),"Optical viewport must not apply the geographic camera twice");
const startup=visual.crtPresentation(snapshot("starting",.25));
assert.equal(startup.x,1,"Startup picture stays full width");
assert.equal(startup.y,1,"Startup picture stays full height");
assert.equal(startup.dot,0,"Startup does not grow a picture from a pinpoint");
assert(startup.light>0 && startup.light<1,"Full-size phosphor brightness warms gradually");
for(let p=.01;p<1;p+=.01){const v=visual.crtPresentation(snapshot("starting",p));assert.equal(v.x,1);assert.equal(v.y,1);assert.equal(v.dot,0);}
const shutdown=visual.crtPresentation(snapshot("stopping",.22));
assert(shutdown.y<.05&&shutdown.x>.5,"Vertical deflection collapses into a horizontal line first");
assert(visual.crtPresentation(snapshot("stopping",.1)).dot>0,"Phosphor dot persists after collapse");
console.log("Realism choreography: visible mechanisms, optical compression and phosphor staging passed.");
