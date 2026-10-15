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
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Mobile_SplitFlap_Landscape_Source_v7.png'))).digest('hex'),'6af4980855bce11b0f57f41b945168aa163f6b06329b29dd710345b94306d8f1','Preserve the finer landscape source photograph');
 await page.waitForFunction(()=>{const p=document.querySelector('img.family-splitflap-plate');return p?.complete&&p.naturalWidth>0&&!p.hidden&&p.getBoundingClientRect().width>0&&document.querySelector('.twin-clock-art .family-clock-plate image');});
 await checkMobileClock(page);
 const evidence=await page.evaluate(()=>{
  const plate=document.querySelector('img.family-splitflap-plate'),p=plate.getBoundingClientRect();
  const canvas=document.createElement('canvas');canvas.width=plate.naturalWidth;canvas.height=plate.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(plate,0,0);
  const alpha=(x,y)=>ctx.getImageData(Math.round((x-p.left)/p.width*canvas.width),Math.round((y-p.top)/p.height*canvas.height),1,1).data[3];
  const groups=['flight-number','flight-origin','flight-destination','status-value'].map(id=>{
   const nodes=[...document.getElementById(id).querySelectorAll('.flap-character')],rs=nodes.map(n=>n.getBoundingClientRect());
   const r={left:rs[0].left,top:rs[0].top,right:rs.at(-1).right,bottom:rs[0].bottom};
   // Sample the actual source alpha on both sides of every aperture edge.
   const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,pad=.75*(parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1);
   return {...r,count:nodes.length,hinges:document.getElementById(id).querySelectorAll('.flap-fixed-hardware').length,
    clear:[alpha(r.left+pad,cy),alpha(r.right-pad,cy),alpha(cx,r.top+pad),alpha(cx,r.bottom-pad),alpha(cx,cy)],
    metal:[alpha(r.left-pad,cy),alpha(r.right+pad,cy),alpha(cx,r.top-pad),alpha(cx,r.bottom+pad)]};
  });
  return {src:plate.getAttribute('src'),size:[plate.naturalWidth,plate.naturalHeight],rect:p.toJSON(),groups,
   requiredPixels:p.width*devicePixelRatio,scale:parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1,
   module:document.querySelector('.flight-strip-module').getBoundingClientRect().toJSON(),
   canvases:document.querySelectorAll('canvas.family-photo-plate').length};
 });
 const viewport=page.viewportSize(),portrait=viewport.height>viewport.width;
 assert.equal(evidence.src,'/assets/hardware/HomingBeacon_Mobile_SplitFlap_'+(portrait?'Portrait':'Landscape')+'_Native_v8.png');
 assert.equal(evidence.canvases,0,'Finished metalwork mounts as one PNG without runtime texture manipulation');
 assert(evidence.size[0]>=evidence.requiredPixels,'Source detail, rather than just a canvas backing store, resolves displayed device pixels');
 assert(evidence.size[0]/(evidence.module.width/evidence.scale)>7.9,'Native plate contains eight source pixels per original CSS pixel');
 const baseline=require('./fixtures/mobile-native-geometry.json').cases.find(c=>c.viewport.width===(portrait?390:1024)&&c.viewport.height===(portrait?844:768));
 evidence.groups.forEach((g,i)=>{
  assert.equal(g.count,[5,3,3,8][i]);assert.equal(g.hinges,g.count);
  assert(g.clear.every(a=>a===0),'Every aperture is transparent through its full registered width and height');
  assert(g.metal.every(a=>a>=250),'Metal ends at each unchanged mechanism boundary without oversized cutouts');
  const old=baseline.groups[i].aperture;
  for(const edge of ['left','top','right','bottom']){
   const horizontal=edge==='left'||edge==='right',value=edge==='left'?old.x:edge==='top'?old.y:old[edge];
   const expected=(horizontal?evidence.module.x:evidence.module.y)+(value-(horizontal?baseline.module.x:baseline.module.y))*evidence.scale;
   assert(Math.abs(g[edge]-expected)<.5,'Rendered mechanisms retain the independent pre-V5 approved geometry');
  }
 });
 return evidence;
}
async function checkMobileClock(page){
 const result=await page.evaluate(async()=>{
  const art=document.querySelector('.twin-clock-art'),ns='http://www.w3.org/2000/svg';
  const rect=(parent,x,y,w,h)=>{const n=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x,y,width:w,height:h,opacity:0}))n.setAttribute(k,v);parent.appendChild(n);return n;};
  const bounds=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  const wheels=[...art.querySelectorAll('.clock-wheel,.period-wheel')].map((wheel,i)=>{
   const vb=wheel.viewBox.baseVal;
   const actual=rect(wheel,vb.x,vb.y+(vb.height-vb.width)/2,vb.width,vb.width);
   const expected=rect(art,[220,480,820,1080,1350][i%5],i<5?130:525,210,210);
   const result={actual:bounds(actual),expected:bounds(expected)};actual.remove();expected.remove();return result;
  });
  // Legacy Safari can omit ancestor CSS transforms from this API. The actual
  // rendered SVG probes above remain the independent geometry reference.
  const original=art.getScreenCTM;
  art.getScreenCTM=()=>({a:1,d:1,e:0,f:0});
  let registration;
  try{
   window.DadRadarMobilePhotos.fit();
   const c=document.querySelector('canvas.family-clock-plate');
   if(c){const e=c._photoEvidence,r=c.getBoundingClientRect(),s=r.width/e.bay.width,t=e.holes[0];registration={x:r.left+t.x*s,y:r.top+(3+t.y)*s,width:t.width*s,height:t.height*s};}
  }finally{art.getScreenCTM=original;window.DadRadarMobilePhotos.fit();}
  const plate=art.querySelector('.family-clock-plate');
  if(!plate)return{wheels,registration,nativePlate:false};
  // Rasterize only the real plate group: every point inside either complete
  // opening must be a dark recess, including spaces between the live drums.
  const copy=document.createElementNS(ns,'svg');copy.setAttribute('xmlns',ns);copy.setAttribute('viewBox','178 2 1418 824');copy.setAttribute('width',1418);copy.setAttribute('height',824);copy.appendChild(plate.cloneNode(true));
  const im=copy.querySelector('image'),url=im.getAttribute('href');
  const blob=await(await fetch(url)).blob();const data=await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(blob);});im.setAttribute('href',data);
  const raster=new Image();raster.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));await raster.decode();
  const c=document.createElement('canvas');c.width=1418;c.height=824;const ctx=c.getContext('2d');ctx.drawImage(raster,0,0);
  const recess=[];for(const y of [131,235,339,526,630,734])for(const x of [221,455,710,785,1055,1320,1559])recess.push([...ctx.getImageData(x-178,y-2,1,1).data]);
  return{wheels,registration,nativePlate:true,source:url,recess};
 });
 for(const w of result.wheels)for(const key of ['x','y','width','height'])assert(Math.abs(w.actual[key]-w.expected[key])<.03,'Rendered clock drum '+key+' matches the approved position and spacing');
 if(result.registration){const r=result.registration,a=result.wheels[0].expected;assert(Math.abs(r.x-a.x)<.5&&Math.abs(r.y-a.y)<.5,'Clock opening stays registered when legacy Safari returns an untransformed screen matrix');}
 assert(result.nativePlate,'Clock photograph shares the original mechanism SVG coordinates');
 assert.equal(result.source,'/assets/hardware/HomingBeacon_Mobile_Clock_Source_v6.png','Restore the approved clock photograph');
 assert(result.recess.every(p=>p[3]===255&&p.slice(0,3).every(c=>c<20)),'Complete clock openings remain dark behind the original drums, with no wood or metal strips between them');
 return result;
}
module.exports={checkMobileInstrumentPlates,checkMobileSplitFlapPlate,checkMobileClock};
