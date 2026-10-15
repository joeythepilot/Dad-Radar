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
async function checkMobileSplitFlapPlate(page){
 const plate=page.locator('.family-splitflap-plate');
 await plate.waitFor({state:'attached'});
 assert.equal(await plate.count(),1,'One continuous approved plate surrounds all four mobile groups');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_SplitFlap_WideEnds_Transparent_v5.png'))).digest('hex'),
  '9c911775d1329cfbee04d3d46da1a9dc599f70cb75c6a4ef8690c6f9b3fcb246','Preserve exact approved split-flap photograph');
 await plate.evaluate(n=>n.decode());
 await page.locator('.family-splitflap-mounted').waitFor({state:'attached'});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_SplitFlap_Geometry_v5.json'),'utf8'));
 assert.deepEqual(manifest.windows.map(w=>[w.x,w.y,w.width,w.height,w.tiles]),
  [[175,68,452,137,5],[680,68,271,137,3],[1004,68,271,137,3],[1328,68,722,137,8]],'Use approved measured registration');
 const evidence=await page.evaluate(manifest=>{
  const plate=document.querySelector('.family-splitflap-plate'),p=plate.getBoundingClientRect();
  const canvas=document.createElement('canvas');canvas.width=2208;canvas.height=257;
  const ctx=canvas.getContext('2d');ctx.drawImage(plate,0,0);
  const ids=['flight-number','flight-origin','flight-destination','status-value'];
  return {size:[plate.naturalWidth,plate.naturalHeight],src:plate.getAttribute('src'),
   pointerEvents:getComputedStyle(plate).pointerEvents,
   groups:manifest.windows.map((w,i)=>{
    const group=document.getElementById(ids[i]),tiles=[...group.querySelectorAll('.flap-character')];
    const opening={left:p.left+w.x*p.width/2208,top:p.top+w.y*p.height/257,right:p.left+(w.x+w.width)*p.width/2208,bottom:p.top+(w.y+w.height)*p.height/257};
    const a=tiles[0].getBoundingClientRect(),b=tiles[tiles.length-1].getBoundingClientRect();
    return {label:w.label,count:tiles.length,opening,tiles:{left:a.left,top:a.top,right:b.right,bottom:b.bottom},
     alpha:ctx.getImageData(w.x+Math.floor(w.width/2),w.y+Math.floor(w.height/2),1,1).data[3],hinges:group.querySelectorAll('.flap-hinge').length};
   })};
 },manifest);
 assert.deepEqual(evidence.size,[2208,257]);
 assert.equal(evidence.src,'/assets/hardware/HomingBeacon_SplitFlap_WideEnds_Transparent_v5.png');
 assert.equal(evidence.pointerEvents,'none');
 assert(Math.abs((evidence.groups[0].opening.right-evidence.groups[0].opening.left)/452 - (evidence.groups[0].opening.bottom-evidence.groups[0].opening.top)/137)<0.001,'V5 plate is uniformly scaled');
 evidence.groups.forEach((g,i)=>{
  assert.equal(g.count,[5,3,3,8][i]);assert.equal(g.alpha,0,'Approved apertures are genuinely transparent');
  for(const edge of ['left','top','right','bottom'])assert(Math.abs(g.tiles[edge]-g.opening[edge])<1,`${g.label} ${edge}: tiles=${JSON.stringify(g.tiles)} opening=${JSON.stringify(g.opening)}`);
 });
 return evidence;
}
module.exports={checkMobileInstrumentPlates,checkMobileSplitFlapPlate};
