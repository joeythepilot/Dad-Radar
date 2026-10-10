"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("./weekly-ticker"),"utf8");
const method=source.slice(source.indexOf("function setModules("),source.indexOf("async function refreshSchedule("));
const modules=Array.from({length:7},()=>({day:"MON",code:"HOME",characters:["H","O","M","E"]}));
const bays=modules.map(m=>({day:m.day,characters:m.characters.slice(),dayAnimation:null,wheelAnimations:[null,null,null,null],element:{dataset:{},setAttribute(){}}}));
let time=12500;
const context={bays,currentModules:modules,liveModules:modules,powerPresentation:{state:"starting",progress:time/24000,generation:2},
  OVERNIGHT_MODULE_COUNT:7,UNKNOWN_OVERNIGHT_CODE:"UNKN",WHEEL_ALPHABET:" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
  DAY_ANIMATION_MS:360,WHEEL_ANIMATION_MS:760,WHEEL_STAGGER_MS:55,ROLLOVER_BAY_STAGGER_MS:58,
  powerModules:require("./weekly-ticker").powerModules,root:{performance:{now:()=>time},dadRadarDisplayPowerState:require("./display-power-state")},
  bank:{dataset:{}},drawBay(){},playDetent(){},playMotor(){},requestAnimationRender(){},forwardWheelSequence:require("./weekly-ticker").forwardWheelSequence};
vm.createContext(context);vm.runInContext(method,context);
context.setModules(modules,{powerReplay:true});
const firstWheel=bays[0].wheelAnimations[0],firstDay=bays[0].dayAnimation;
assert.equal(firstWheel.duration,3200);
time=13400;context.powerPresentation={state:"starting",progress:time/24000,generation:2};
context.setModules(modules,{powerReplay:true});
assert.equal(bays[0].wheelAnimations[0],firstWheel,"Later bay reveal must not truncate an earlier wheel cycle");
assert.equal(bays[0].dayAnimation,firstDay,"Later bay reveal must not truncate an earlier day roll");
assert.equal(bays[1].wheelAnimations[0].start,time,"Next bay starts on its own threshold");
console.log("Staggered weekly indexing preserves earlier motion.");
