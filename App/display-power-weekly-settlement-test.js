"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"weekly-ticker.js"),"utf8");
const method=source.slice(source.indexOf("setPowerPresentation(snapshot){"),source.indexOf("clearPowerPresentation(){"));
const calls=[];let stopped=0;
const context={powerPresentation:null,powerSignature:"",liveModules:[{}],
  root:{dadRadarDisplayPowerState:require("./display-power-state")},
  stopLocalSound(){stopped++;},setModules(modules,options){calls.push(options);}};
vm.createContext(context);vm.runInContext(`controller={${method}}`,context);
context.controller.setPowerPresentation({state:"off",progress:0});
context.controller.setPowerPresentation({state:"on",progress:1});
assert.equal(calls.at(-1).animate,false,"Skipped reveal thresholds must settle weekly paint at the deadline");
context.controller.setPowerPresentation({state:"starting",progress:.9});
context.controller.setPowerPresentation({state:"on",progress:1});
assert.equal(calls.at(-1).animate,false,"Terminal state must settle even if all bays were already visible");
assert(stopped>0);console.log("Power weekly terminal settlement passed.");
