'use strict';
const assert=require('node:assert/strict');
async function checkMobileWood(page){
 assert.equal(await page.locator('canvas.family-walnut').count(),1,'Actual photographic walnut must be mounted independently');
 const e=await page.locator('canvas.family-walnut').evaluate(n=>{
  const c=n.getContext('2d'),e=n._woodEvidence,box=n.getBoundingClientRect(),dashboard=document.getElementById('dashboard').getBoundingClientRect();
  if(!e)return null;
  let covered=0,checked=0,woodPixels=0,signature=2166136261;const pixels=c.getImageData(0,0,n.width,n.height).data;
  e.protectedAreas.forEach(r=>{const left=Math.max(0,Math.ceil(r.x*e.dpr)),right=Math.min(n.width,Math.floor((r.x+r.width)*e.dpr)),top=Math.max(0,Math.ceil(r.y*e.dpr)),bottom=Math.min(n.height,Math.floor((r.y+r.height)*e.dpr));for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){checked++;if(pixels[(y*n.width+x)*4+3])covered++;}});
  for(let i=0;i<pixels.length;i++){signature=Math.imul(signature^pixels[i],16777619)>>>0;if(i%4===3&&pixels[i])woodPixels++;}
  return{...e,rect:box.toJSON(),dashboard:dashboard.toJSON(),covered,checked,woodPixels,signature};
 });
 assert(e&&e.pieces.length>0,'Mounted wood supplies real piece registration evidence');
 assert(e.infill&&e.infill.scale>0,'A broad photographic face fills instrument-column negative space, not stretched narrow trim');
 assert(Math.abs(e.rect.left-e.dashboard.left)<.01&&Math.abs(e.rect.top-e.dashboard.top)<.01,'Wood origin must match dashboard, not viewport');
 assert.equal(e.covered,0,'No original aperture/module/photographic metal body is covered by wood');
 assert(e.checked>1000&&e.woodPixels>500,'Meaningful original area and visible photographic wood were tested');
 for(const p of e.pieces){const l=p.vertical?p.height:p.width,t=p.vertical?p.width:p.height;assert(Math.abs(l/p.sw-t/p.sh)<1e-9,'No nonuniform photographic scaling');}
 assert(Math.abs(e.infill.height/e.infill.sw-e.infill.width/e.infill.sh)<1e-9,'Broad face is also uniformly scaled');
 const size=page.viewportSize(),baseline=require('./fixtures/mobile-wood-baseline.json').cases.find(c=>c.viewport.width===size.width&&c.viewport.height===size.height);
 if(baseline){
  const actual=await page.evaluate(selectors=>selectors.map(s=>({selector:s,nodes:[...document.querySelectorAll(s)].map(n=>({rect:n.getBoundingClientRect().toJSON(),x:n.getAttribute('x'),y:n.getAttribute('y'),width:n.getAttribute('width'),height:n.getAttribute('height')}))})),baseline.geometry.map(g=>g.selector));
  actual.forEach((g,i)=>{const old=baseline.geometry[i];assert.equal(g.nodes.length,old.nodes.length,g.selector+' count preserved');g.nodes.forEach((n,j)=>{assert.deepEqual([n.x,n.y,n.width,n.height],[old.nodes[j].x,old.nodes[j].y,old.nodes[j].width,old.nodes[j].height],g.selector+' native attributes');for(const key of ['x','y','width','height'])assert(Math.abs(n.rect[key]-old.nodes[j].rect[key])<.5,g.selector+' original '+key+' preserved');});});
 }
 return e;
}
module.exports={checkMobileWood};
