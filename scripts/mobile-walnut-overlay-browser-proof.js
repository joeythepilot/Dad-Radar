'use strict';
const assert=require('node:assert/strict');
async function checkMobileWalnutOverlay(page){
 const image=page.locator('picture.family-walnut img');
 assert.equal(await image.count(),1,'The finished walnut PNG is mounted as one image');
 await image.evaluate(n=>n.decode());
 const actual=await image.evaluate(n=>{
  const c=document.createElement('canvas');c.width=n.naturalWidth;c.height=n.naturalHeight;
  const context=c.getContext('2d');context.drawImage(n,0,0);const pixels=context.getImageData(0,0,c.width,c.height).data;
  const box=n.getBoundingClientRect();
  const sample=(x,y)=>context.getImageData(Math.max(0,Math.min(c.width-1,Math.floor((x-box.x)/box.width*c.width))),Math.max(0,Math.min(c.height-1,Math.floor((y-box.y)/box.height*c.height))),1,1).data[3];
  const scale=parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1;
  const openings=['.destination-stage','.daily-schedule-panel','.route-map-shell','.weekly-overnight-bank'].map(selector=>{
   const r=document.querySelector(selector).getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2,delta=2*scale;
   return {selector,inside:[[r.left+delta,cy],[r.right-delta,cy],[cx,r.top+delta],[cx,r.bottom-delta],[cx,cy]].map(([x,y])=>sample(x,y)),outside:[[r.left-delta,cy],[r.right+delta,cy],[cx,r.top-delta],[cx,r.bottom+delta]].map(([x,y])=>sample(x,y))};
  });
  let visible=0,clear=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>=128)visible++;if(pixels[i]===0)clear++;}
  return {openings,src:n.currentSrc,width:n.naturalWidth,height:n.naturalHeight,visible,clear,
   portrait:innerHeight>innerWidth,
   image:n.getBoundingClientRect().toJSON(),dashboard:document.getElementById('dashboard').getBoundingClientRect().toJSON(),
   pointerEvents:getComputedStyle(n.parentElement).pointerEvents,
   woodZ:+getComputedStyle(n.parentElement).zIndex,metalZ:+getComputedStyle(document.querySelector('.instrument-rail')).zIndex};
 });
 assert(actual.width>0&&actual.height>0,'The finished photograph decoded');
 assert(actual.src.includes('HomingBeacon_Walnut_Overlay_'+(actual.portrait?'Portrait':'Landscape')+'_v2.png'),'The correct complete overlay asset is used');
 assert(actual.visible>actual.width*actual.height*.01,'The mounted photograph is not an empty transparent image');
 for(const key of ['x','y','width','height'])assert(Math.abs(actual.image[key]-actual.dashboard[key])<1,'The PNG covers the dashboard: '+key);
 assert.equal(actual.pointerEvents,'none','Artwork does not intercept display controls');
 assert(actual.woodZ>0,'Wooden frames sit above the live display');
 assert(actual.metalZ>actual.woodZ,'Complete metal instrument assemblies sit above wood');
 for(const o of actual.openings){assert(o.inside.every(a=>a===0),o.selector+': actual visible content is clear through the PNG');assert(o.outside.every(a=>a>=254),o.selector+': wooden frame is registered immediately outside all four module edges');}
 return actual;
}
module.exports={checkMobileWalnutOverlay};
