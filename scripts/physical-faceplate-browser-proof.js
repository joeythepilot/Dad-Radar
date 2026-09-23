"use strict";
const assert=require("node:assert/strict");
const openings=[[".destination-panel",0.5,2.35,4.4,5.0285714286],[".daily-schedule-panel",0.5,7.8785714286,4.4,2.8589285714],[".vintage-map-panel",5.525,2.35,10.1875,6.5375],[".weekly-overnight-bank",5.525,9.3875,10.1875,1.35],[".twin-clock-panel",16.2125,0.375,3.35,1.8],["#flight-number",0.5,0.5,3.0460694444444445,1.35],["#flight-origin",4.046069444444445,0.5,2.27675,1.35],["#flight-destination",6.822819444444445,0.5,2.27675,1.35],["#status-value",9.599569444444445,0.5,6.112930555555555,1.35],[".instrument-slot:nth-child(1)",16.6375,2.746875,2.5,2.5],[".instrument-slot:nth-child(2)",16.6375,5.61875,2.5,2.5],[".instrument-slot:nth-child(3)",16.6375,8.490625,2.5,2.5]];
async function checkPhysicalFaceplate(page,name){
 const checkedOpenings=[...openings,['.route-map-shell',5.525,2.35,10.1875,6.5375]];
 await page.screenshot({path:require('node:path').join(__dirname,'../artifacts/approved-artwork/physical-'+name+'.png'),fullPage:true});
 const proof=await page.evaluate(specs=>{
  const d=document.querySelector('.dashboard').getBoundingClientRect();
  return {
   dialFill:[['.airspeed-instrument',.76],['.heading-instrument',.73],['.altimeter-instrument',.74]].map(([selector,fraction])=>{
    const instrument=document.querySelector(selector),dial=instrument.getBoundingClientRect();
    const opening=instrument.closest('.instrument-slot').getBoundingClientRect();
    return {selector,fill:dial.width*fraction/opening.width};
   }),
   speedInkInside:(()=>{
    const ink=document.querySelector('.airspeed-range-ink').getBoundingClientRect();
    const opening=document.querySelector('.airspeed-instrument').closest('.instrument-slot').getBoundingClientRect();
    // The red radial is the outermost paint, reaching radius 481.51 on a 1254px canvas.
    return ink.width*481.51/1254<opening.width/2;
   })(),
   openings:specs.map(([s,x,y,w,h])=>{
    const r=document.querySelector(s).getBoundingClientRect();
    return {s,actual:[(r.left-d.left)/d.width*20.0625,(r.top-d.top)/d.height*11.3125,r.width/d.width*20.0625,r.height/d.height*11.3125],expected:[x,y,w,h]};
   }),
   wheels:[...document.querySelectorAll('.instrument-wheel-face')].map(n=>{
    const r=n.getBoundingClientRect(),g=n.closest('.instrument-slot').getBoundingClientRect();
    const cx=g.left+g.width/2,cy=g.top+g.height/2;
    return [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>((x-cx)/(g.width/2))**2+((y-cy)/(g.height/2))**2<=1.01);
   }),
   tiles:[...document.querySelectorAll('.flap-character')].every(n=>{
    const r=n.getBoundingClientRect(),g=n.closest('.flap-cell').getBoundingClientRect();
    return r.left>=g.left-1&&r.right<=g.right+1&&r.top>=g.top-1&&r.bottom<=g.bottom+1;
   })
  };
 },checkedOpenings);
 for(const p of proof.openings)p.actual.forEach((v,i)=>assert(Math.abs(v-p.expected[i])<.012,name+' physical opening '+p.s+' '+JSON.stringify(p)));
 assert(proof.wheels.every(Boolean),name+': number wheels remain inside round cutouts '+JSON.stringify(proof.wheels));
 for(const dial of proof.dialFill)assert(Math.abs(dial.fill-1)<.01,name+': inner dial fills the circular opening '+JSON.stringify(dial));
 assert(proof.speedInkInside,name+': airspeed range paint stays inside its circular opening');
 assert(proof.tiles,name+': split-flap characters fit individual physical openings');
 return proof;
}
module.exports={checkPhysicalFaceplate};
