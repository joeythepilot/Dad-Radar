"use strict";
const assert=require("node:assert/strict");
async function checkPrintedInk(page){
  const proof=await page.evaluate(async()=>{
    const api=window.dadRadarPrintedInk;
    const options={height:100,cellWidth:80,seed:"texture-proof",ink:"#e4d4ae",material:"wheel"};
    const canvas=document.createElement("canvas");canvas.width=400;canvas.height=400;
    const c=canvas.getContext("2d");c.scale(3,3);
    api.draw(c,"8",65,65,options);const a=canvas.toDataURL();
    c.clearRect(0,0,134,134);api.draw(c,"8",65,65,options);const b=canvas.toDataURL();
    c.clearRect(0,0,134,134);api.draw(c,"8",65,65,{...options,seed:"another-wheel"});const different=canvas.toDataURL();
    async function raster(worn){
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("width","240");svg.setAttribute("height","330");svg.setAttribute("viewBox","0 -5 80 110");
      svg.appendChild(api.svg(document,"8",options).element);
      if(!worn)svg.querySelectorAll("path[mask]").forEach(p=>p.removeAttribute("mask"));
      const image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(svg));await image.decode();
      const surface=document.createElement("canvas");surface.width=240;surface.height=330;
      const context=surface.getContext("2d");context.drawImage(image,0,0);
      return context.getImageData(0,0,240,330).data;
    }
    const worn=await raster(true),plain=await raster(false);
    let changed=0,solid=0;
    for(let i=3;i<plain.length;i+=4){if(plain[i]>180){solid++;if(plain[i]-worn[i]>12)changed++;}}
    return {stable:a===b,individual:a!==different,changed,solid};
  });
  assert(proof.stable,"The same printed face is pixel-identical on repaint");
  assert(proof.individual,"Different physical wheels have visibly different fixed ink wear");
  assert(proof.changed>100 && proof.changed<proof.solid*.4,"SVG masks visibly break up the ink while preserving most of the letter");
}
module.exports={checkPrintedInk};
