'use strict';
const assert=require('node:assert/strict');
// Catches legacy housing decoration returning over/around the real materials.
async function checkMobileFrames(page){
 const evidence=await page.evaluate(()=>{
  const style=(n,pseudo)=>{const s=getComputedStyle(n,pseudo);return{shadow:s.boxShadow,borders:[s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.borderLeftColor],background:s.backgroundImage,content:s.content,display:s.display};};
  return{
   housings:[...document.querySelectorAll('.module,.flight-board,.destination-stage,.route-map-shell')].map(n=>({name:n.className,style:style(n)})),
   overlays:[['.flight-strip-module','::before'],['.flight-strip-module','::after'],['.flight-board','::before'],['.flight-board','::after'],['.destination-panel','::after'],['.destination-stage','::after'],['.daily-schedule-panel','::after'],['.vintage-map-panel','::after'],['.route-map-shell','::after']].map(([selector,pseudo])=>({selector,pseudo,style:style(document.querySelector(selector),pseudo)})),
   flapShadow:getComputedStyle(document.querySelector('.flap-character')).boxShadow,
   mapPaper:getComputedStyle(document.querySelector('.route-map-shell')).backgroundColor,
   drums:document.querySelectorAll('.drum-clock-mechanism').length
  };
 });
 for(const h of evidence.housings){
  assert.equal(h.style.shadow,'none',h.name+': no synthetic housing shadow');
  assert(h.style.borders.every(c=>c==='rgba(0, 0, 0, 0)'),h.name+': decorative border is invisible without changing its dimensions');
  if(!h.name.includes('route-map-shell'))assert.equal(h.style.background,'none',h.name+': no synthetic housing gradient');
 }
 for(const o of evidence.overlays)assert(o.style.display==='none'||o.style.content==='none',o.selector+o.pseudo+': no synthetic housing overlay');
 assert.notEqual(evidence.flapShadow,'none','Working flap depth is preserved');
 assert.notEqual(evidence.mapPaper,'rgba(0, 0, 0, 0)','Printed map paper remains');
 assert.equal(evidence.drums,10,'Four number drums and the AM/PM mechanism remain in each clock');
 return evidence;
}
module.exports={checkMobileFrames};
