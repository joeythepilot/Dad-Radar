'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const filename='HomingBeacon_Approved_Instrument_Plate_Transparent_v1.png';
const asset=fs.readFileSync(path.join(__dirname,'../assets/hardware',filename));
assert.equal(crypto.createHash('sha256').update(asset).digest('hex'),
 '1e2e79e546a0f39c78132429a8909440e04293105ba8abd826a7047918018fb8',
 'Use the exact approved photographic PNG without cropping or regeneration');

async function checkMobileInstrumentPlates(page){
 const plates=page.locator('.family-instrument-plate');
 assert.equal(await plates.count(),3,'Each of the three mobile instruments has one plate');
 await plates.evaluateAll(nodes=>Promise.all(nodes.map(node=>node.decode())));
 const evidence=await page.evaluate(()=>Array.from(document.querySelectorAll('.family-instrument-plate')).map(plate=>{
  const instrument=plate.parentElement,slot=instrument.closest('.instrument-slot');
  const p=plate.getBoundingClientRect(),i=instrument.getBoundingClientRect(),s=slot.getBoundingClientRect();
  const canvas=document.createElement('canvas');canvas.width=plate.naturalWidth;canvas.height=plate.naturalHeight;
  const context=canvas.getContext('2d');context.drawImage(plate,0,0);
  const alpha=(x,y)=>context.getImageData(x,y,1,1).data[3];
  return {src:plate.getAttribute('src'),size:[plate.naturalWidth,plate.naturalHeight],
   alpha:[alpha(0,0),alpha(1253,0),alpha(0,1253),alpha(1253,1253),alpha(627,627),alpha(100,627)],
   opening:{x:p.x+p.width*622.5/1254,y:p.y+p.height*615/1254},
   center:{x:i.x+i.width/2,y:i.y+i.height/2},
   // Visible photographic body bounds; the canvas has genuine exterior alpha.
   body:{left:p.x+p.width*50/1254,right:p.x+p.width*1195/1254,
    top:p.y+p.height*90/1254,bottom:p.y+p.height*1152/1254},
   slot:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},
   rear:getComputedStyle(plate).zIndex,decorative:plate.alt===''&&plate.getAttribute('aria-hidden')==='true',
   originalLayers:instrument.querySelectorAll('.airspeed-layer,.heading-layer,.altimeter-layer').length};
 }));
 for(const e of evidence){
  assert.equal(e.src,'/assets/hardware/'+filename,'All instruments reuse the approved image');
  assert.deepEqual(e.size,[1254,1254]);
  assert.deepEqual(e.alpha,[0,0,1,0,0,253],'Preserve the approved PNG alpha samples, including its transparent opening and exterior');
  assert(Math.abs(e.opening.x-e.center.x)<0.5&&Math.abs(e.opening.y-e.center.y)<0.5,
   'Photographic circular opening is centered on the original instrument assembly');
  assert(e.body.left>=e.slot.left-0.5&&e.body.right<=e.slot.right+0.5&&
   e.body.top>=e.slot.top-0.5&&e.body.bottom<=e.slot.bottom+0.5,'The plate body fits without clipping or overlap');
  assert.equal(e.rear,'-1','Plate stays behind the original bezel, face and mechanism');
  assert(e.decorative&&e.originalLayers>0,'Original instrument layers remain, with an inaccessible decorative rear plate');
 }
 return evidence;
}
const selectedHashes={
 SplitFlap_Landscape:'674ad8e60815d867c8f808f6952012021dbcebaf08ffe0180e4654fd3e3ea3c8',
 SplitFlap_Portrait:'040a6fd8fc8dee5227b934fd7b519c9edd033b582c07afc6646e1650aecedb03',
 Clock:'6430d7ce6dba54712679ece3e889c265cce314ee8a72cd6a4dfef5aa28b6227d'
};
async function checkMobileSplitFlapPlate(page){
 for(const [name,hash]of Object.entries(selectedHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Mobile_'+name+'_Source_v6.png'))).digest('hex'),hash,'Selected photograph bytes are unchanged');
 await page.waitForFunction(()=>document.querySelectorAll('canvas.family-photo-plate').length===2&&[...document.querySelectorAll('canvas.family-photo-plate')].every(n=>n._photoEvidence));
 const evidence=await page.evaluate(async()=>{
  const result=[];
  for(const canvas of document.querySelectorAll('canvas.family-photo-plate')){
   const e=canvas._photoEvidence,ctx=canvas.getContext('2d'),p=canvas.getBoundingClientRect(),f=e.fit;
   const im=new Image();im.src=e.source;await new Promise((ok,no)=>{if(im.complete&&im.naturalWidth)return ok();im.onload=ok;im.onerror=no;});
   const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
   const rc=reference.getContext('2d');rc.setTransform(e.dpr,0,0,e.dpr,0,3*e.dpr);rc.drawImage(im,f.x,f.y,im.naturalWidth*f.scale,im.naturalHeight*f.scale);
   const original=rc.getImageData(0,0,canvas.width,canvas.height).data,actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   const sourceHoles=e.profile==='SplitFlap_Landscape'?[[96,282,466,137],[638,282,271,137],[983,282,274,137],[1333,282,744,137]]:e.profile==='SplitFlap_Portrait'?[[121,370,365,119],[546,370,221,119],[829,370,218,119],[1109,370,598,119]]:[[106,233,1324,200],[106,629,1324,194]];
   const allowed=[...e.holes.map(t=>({x:t.x-5,y:t.y-5,w:t.width+10,h:t.height+10})),...sourceHoles.map(h=>({x:f.x+(h[0]-12)*f.scale,y:f.y+(h[1]-12)*f.scale,w:(h[2]+24)*f.scale,h:(h[3]+24)*f.scale}))];
   let changedOutside=0,compared=0,outsideSamples=[];
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const u=(x+.5)/e.dpr,v=(y+.5)/e.dpr-3;
    if(allowed.some(a=>u>=a.x&&u<=a.x+a.w&&v>=a.y&&v<=a.y+a.h))continue;
    compared++;const i=(y*canvas.width+x)*4;if(actual[i]!==original[i]||actual[i+1]!==original[i+1]||actual[i+2]!==original[i+2]||actual[i+3]!==original[i+3]){changedOutside++;if(outsideSamples.length<12)outsideSamples.push({x,y,u,v,actual:[...actual.slice(i,i+4)],original:[...original.slice(i,i+4)]});}
   }
   result.push({...e,rect:p.toJSON(),changedOutside,outsideSamples,compared,backingWidth:canvas.width,requiredWidth:Math.ceil(p.width*devicePixelRatio),alpha:e.holes.map(t=>ctx.getImageData(Math.floor((t.x+t.width/2)*e.dpr),Math.floor((t.y+t.height/2+3)*e.dpr),1,1).data[3])});
  }
  const ids=['flight-number','flight-origin','flight-destination','status-value'];
  return {plates:result,groups:ids.map(id=>{const ns=[...document.getElementById(id).querySelectorAll('.flap-character')],rs=ns.map(n=>n.getBoundingClientRect());return{count:ns.length,hinges:document.getElementById(id).querySelectorAll('.flap-fixed-hardware').length,left:rs[0].left,top:rs[0].top,right:rs.at(-1).right,bottom:rs[0].bottom}}),viewport:innerWidth,panelScale:parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1,module:document.querySelector('.flight-strip-module').getBoundingClientRect().toJSON(),clocks:[...document.querySelectorAll('.clock-wheel,.period-wheel')].map(n=>[n.getAttribute('x'),n.getAttribute('y'),n.getAttribute('width'),n.getAttribute('height')])};
 });
 assert.equal(evidence.plates.length,2,'One continuous split-flap and one twin-clock photograph');
 for(const e of evidence.plates){
  assert.equal(e.changedOutside,0,'Every pixel outside the local aperture bands matches the selected photograph: '+e.profile+' '+JSON.stringify(e.outsideSamples));
  assert(e.compared>500,'Meaningful unaffected photographic area was compared');
  assert(e.alpha.every(a=>a===(e.profile==='Clock'?255:0)),e.profile==='Clock'?'Clock recess blocks wood between the unchanged live drums':'Native split-flap windows retain genuine alpha transparency');
  assert(e.backingWidth>=e.requiredWidth,'Metal canvas resolves every displayed device pixel after panel scaling');
  assert.equal(e.fit.scaleX,e.fit.scaleY,'Whole photograph uses one scale');
  const f=e.fit,b=e.body,p=e.rect,s=evidence.panelScale;
  assert(p.left+(f.x+b[0]*f.scale)*s>=-0.5&&p.left+(f.x+b[2]*f.scale)*s<=evidence.viewport+0.5,'No photographed outer edge is clipped at a viewport side');
  assert(f.y+b[1]*f.scale>=-3.01&&f.y+b[3]*f.scale<=e.bay.height+3.01,'Photographed body stays within measured inter-module clearance');
 }
 const split=evidence.plates.find(e=>e.profile.startsWith('SplitFlap'));
 const viewport=page.viewportSize();
 const baseline=require('./fixtures/mobile-native-geometry.json').cases.find(c=>c.viewport.width===(viewport.height>viewport.width?390:1024)&&c.viewport.height===(viewport.height>viewport.width?844:768));
 if(baseline)evidence.groups.forEach((g,i)=>{const old=baseline.groups[i].aperture;for(const edge of ['left','top','right','bottom']){const horizontal=edge==='left'||edge==='right';const value=edge==='left'?old.x:edge==='top'?old.y:old[edge];const expected=(horizontal?evidence.module.x:evidence.module.y)+(value-(horizontal?baseline.module.x:baseline.module.y))*evidence.panelScale;assert(Math.abs(g[edge]-expected)<.5,'Rendered live geometry matches the independent pre-V5 approved layout');}});
 evidence.groups.forEach((g,i)=>{const t=split.holes[i],p=split.rect;assert.equal(g.count,[5,3,3,8][i]);assert.equal(g.hinges,g.count);for(const [actual,expected]of [[g.left,p.left+t.x*evidence.panelScale],[g.top,p.top+(3+t.y)*evidence.panelScale],[g.right,p.left+(t.x+t.width)*evidence.panelScale],[g.bottom,p.top+(3+t.y+t.height)*evidence.panelScale]])assert(Math.abs(actual-expected)<.03,'Cutout is registered to the unchanged live tile bounds');});
 assert.deepEqual(evidence.clocks,Array.from({length:10},(_,i)=>[String([220,480,820,1080,1350][i%5]),i<5?'130':'525','210','210']),'Clock apertures and original AM/PM rollers retain their geometry');
 return evidence;
}
module.exports={checkMobileInstrumentPlates,checkMobileSplitFlapPlate};
