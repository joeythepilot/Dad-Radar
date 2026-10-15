'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const filename=path.join(__dirname,'photo-registration.js');
assert(fs.existsSync(filename),'Measured photo mounting must exist without repositioning live mechanisms');
const {fitBody,registerEdges}=require(filename);
const body=[14,205,2158,493],bay={width:551.046875,height:70.296875};
const fit=fitBody(body,bay,3);
assert.equal(fit.scaleX,fit.scaleY,'The photograph uses one scale, never texture stretching');
assert(Math.abs(fit.x+body[0]*fit.scale)<1e-9);
assert(Math.abs(fit.x+body[2]*fit.scale-bay.width)<1e-9);
assert(fit.y+body[1]*fit.scale>=-3&&fit.y+body[3]*fit.scale<=bay.height+3,'Body fits available inter-module clearance');
for(const width of [220,264.71875,551.046875,822.1875,1540]){
 const bay={width,height:Math.max(61,width*70.296875/551.046875)};
 const f=fitBody(body,bay,3);
 assert(f.x+body[0]*f.scale>=-1e-9&&f.x+body[2]*f.scale<=width+1e-9);
 assert(f.y+body[1]*f.scale>=-3-1e-9&&f.y+body[3]*f.scale<=bay.height+3+1e-9);
}
const source=[96,282,466,137],target={x:18.65625,y:15.6875,width:121.828125,height:38.90625};
const result=registerEdges(source,target,6);
assert.deepEqual(result.hole,target,'Recut follows measured native aperture, not a fitted replacement mechanism');
assert.deepEqual(source,[96,282,466,137]);
for(const edge of result.edges)assert(Math.abs(edge.dw/edge.sw-edge.dh/edge.sh)<1e-9,'Every photographed edge strip scales uniformly');
assert.throws(()=>fitBody(body,{width:0,height:61},3),/size/);
console.log('Photographic body containment, isotropic registration and exact native cutout plans passed.');
