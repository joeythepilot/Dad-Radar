'use strict';
const assert=require('node:assert/strict');
async function checkMobileWalnutOverlay(page){
 const image=page.locator('picture.family-walnut img');
 assert.equal(await image.count(),1,'The finished walnut PNG is mounted as one image');
 await image.evaluate(n=>n.decode());
 const actual=await image.evaluate(n=>{
  const c=document.createElement('canvas');c.width=n.naturalWidth;c.height=n.naturalHeight;
  const context=c.getContext('2d');context.drawImage(n,0,0);const pixels=context.getImageData(0,0,c.width,c.height).data;
  let visible=0,clear=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>=128)visible++;if(pixels[i]===0)clear++;}
  return {src:n.currentSrc,width:n.naturalWidth,height:n.naturalHeight,visible,clear,
   portrait:innerHeight>innerWidth,
   image:n.getBoundingClientRect().toJSON(),dashboard:document.getElementById('dashboard').getBoundingClientRect().toJSON(),
   pointerEvents:getComputedStyle(n.parentElement).pointerEvents};
 });
 assert(actual.width>0&&actual.height>0,'The finished photograph decoded');
 assert(actual.src.includes('HomingBeacon_Walnut_Overlay_'+(actual.portrait?'Portrait':'Landscape')+'_v1.png'),'The correct complete overlay asset is used');
 assert(actual.visible>actual.width*actual.height*.01,'The mounted photograph is not an empty transparent image');
 for(const key of ['x','y','width','height'])assert(Math.abs(actual.image[key]-actual.dashboard[key])<1,'The PNG covers the dashboard: '+key);
 assert.equal(actual.pointerEvents,'none','Artwork does not intercept display controls');
 return actual;
}
module.exports={checkMobileWalnutOverlay};
