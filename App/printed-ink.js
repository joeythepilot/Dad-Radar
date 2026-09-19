/* Fixed screen-print wear shared by the weekly drums, gauge drums and clocks. */
(function(root){
  "use strict";
  const glyphs=typeof module==="object" && module.exports ? require("./printed-glyphs") : root.dadRadarPrintedGlyphs;
  const ns="http://www.w3.org/2000/svg";
  const cache=new Map();
  function randomFor(key){
    let state=2166136261;
    for(const ch of key)state=Math.imul(state^ch.charCodeAt(0),16777619);
    return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  }
  function layout(text,{height=100,cellWidth=70,maxWidth=Infinity,seed="ink",material="wheel"}={}){
    const characters=Array.from(String(text).toUpperCase());
    const fit=Math.min(1,maxWidth/Math.max(1,characters.length*cellWidth));
    const scale=height*fit/100;
    return {width:characters.length*cellWidth*fit,height:height*fit,material,glyphs:characters.map((character,index)=>{
      const source=glyphs[character] || {width:0,path:""};
      const scaleX=scale*Math.min(1,cellWidth/height*90/Math.max(1,source.width));
      const random=randomFor(`${seed}:${index}:${character}`);
      const marks=Array.from({length:62},(_,i)=>({
        x:random()*source.width,y:random()*103-1.5,
        rx:i<12 ? 1.4+random()*2.2 : .32+random()*.65,
        ry:i<12 ? 1+random()*1.6 : .28+random()*.7,
        opacity:i<12 ? .08+random()*.15 : .42+random()*.42
      }));
      return {character,path:source.path,width:source.width,scale,scaleX,
        x:index*cellWidth*fit+(cellWidth*fit-source.width*scaleX)/2,
        y:(random()-.5)*.6*scale,angle:(random()-.5)*.32,marks};
    })};
  }
  function node(document,tag,attrs){
    const n=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs||{}))n.setAttribute(key,String(value));
    return n;
  }
  function svg(document,text,options={}){
    const plan=layout(text,options);
    const group=node(document,"g",{"data-printed-ink":String(text),"aria-hidden":"true"});
    const defs=node(document,"defs");group.appendChild(defs);
    plan.glyphs.forEach((glyph,index)=>{
      if(!glyph.path)return;
      const id=`ink-${String(options.seed||"ink").replace(/[^a-z0-9-]/gi,"-")}-${index}-${glyph.character.charCodeAt(0)}`;
      const mask=node(document,"mask",{id,maskUnits:"userSpaceOnUse",x:-4,y:-4,width:glyph.width+8,height:110,"mask-type":"luminance"});
      mask.appendChild(node(document,"rect",{x:-4,y:-4,width:glyph.width+8,height:110,fill:"white"}));
      glyph.marks.forEach(mark=>mask.appendChild(node(document,"ellipse",{cx:mark.x,cy:mark.y,rx:mark.rx,ry:mark.ry,fill:"black",opacity:mark.opacity})));
      defs.appendChild(mask);
      const gradient=node(document,"linearGradient",{id:`${id}-tone`,x1:0,y1:0,x2:0,y2:1});
      const stops=plan.material==="wheel" ? [[0,.65],[.28,.94],[.58,.98],[1,.7]] : [[0,.88],[.42,.96],[1,.87]];
      stops.forEach(([offset,opacity])=>gradient.appendChild(node(document,"stop",{offset,"stop-color":options.ink||"#e4d4ae","stop-opacity":opacity})));
      defs.appendChild(gradient);
      const placed=node(document,"g",{transform:`translate(${glyph.x} ${glyph.y}) scale(${glyph.scaleX} ${glyph.scale}) rotate(${glyph.angle} ${glyph.width/2} 50)`});
      placed.appendChild(node(document,"path",{d:glyph.path,fill:`url(#${id}-tone)`,stroke:options.ink||"#e4d4ae","stroke-width":.25,"stroke-opacity":.25,"stroke-linejoin":"round",mask:`url(#${id})`}));
      group.appendChild(placed);
    });
    return {element:group,width:plan.width,height:plan.height};
  }
  function draw(context,text,x,y,options={}){
    const key=JSON.stringify([text,options]);
    let stamp=cache.get(key);
    if(!stamp){
      const plan=layout(text,options);
      const canvas=root.document.createElement("canvas");
      const padding=2;
      const resolution=8;
      canvas.width=Math.ceil((plan.width+padding*2)*resolution);
      canvas.height=Math.ceil((plan.height+padding*2)*resolution);
      const c=canvas.getContext("2d");
      c.scale(resolution,resolution);c.translate(padding,padding);
      for(const glyph of plan.glyphs){
        if(!glyph.path)continue;
        c.save();c.translate(glyph.x,glyph.y);c.scale(glyph.scaleX,glyph.scale);
        c.translate(glyph.width/2,50);c.rotate(glyph.angle*Math.PI/180);c.translate(-glyph.width/2,-50);
        const outline=new root.Path2D(glyph.path);
        const gradient=c.createLinearGradient(0,0,0,100);
        const color=options.ink||"#e4d4ae";
        gradient.addColorStop(0,color);gradient.addColorStop(1,color);
        c.fillStyle=gradient;c.globalAlpha=.94;c.fill(outline);
        c.globalCompositeOperation="destination-out";
        // Ink loss is locked to the glyph, not to screen coordinates or time.
        for(const mark of glyph.marks){
          c.globalAlpha=mark.opacity;c.beginPath();c.ellipse(mark.x,mark.y,mark.rx,mark.ry,0,0,Math.PI*2);c.fill();
        }
        if(plan.material==="wheel"){
          c.globalAlpha=1;
          const shade=c.createLinearGradient(0,0,0,100);
          shade.addColorStop(0,"rgba(0,0,0,.3)");shade.addColorStop(.45,"rgba(0,0,0,0)");shade.addColorStop(1,"rgba(0,0,0,.25)");
          c.fillStyle=shade;c.fillRect(-2,-3,glyph.width+4,106);
        }
        c.restore();
      }
      stamp={canvas,width:canvas.width/resolution,height:canvas.height/resolution};
      if(cache.size>=256)cache.delete(cache.keys().next().value);
      cache.set(key,stamp);
    }
    context.drawImage(stamp.canvas,x-stamp.width/2,y-stamp.height/2,stamp.width,stamp.height);
  }
  const api={layout,svg,draw};
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.dadRadarPrintedInk=Object.freeze(api);
})(globalThis);
