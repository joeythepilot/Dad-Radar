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
module.exports={checkMobileInstrumentPlates};
