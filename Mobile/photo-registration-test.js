'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Inspect actual asset pixels, not a canvas size or a self-reported fit.
for(const [profile,width,height] of [['Landscape',6578,893],['Portrait',2118,536]]){
 const bytes=fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Mobile_SplitFlap_'+profile+'_Native_v8.png'));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
 assert.equal(bytes[25],6,'Finished metalwork has a genuine alpha channel');
}
console.log('Native split-flap asset dimensions and RGBA format passed; live aperture and mechanism geometry are checked in the browser.');
