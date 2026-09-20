/* Shared printed chart lettering. Geographic coordinates and flight state stay owned by route-map. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./chart-glyphs'):root.dadRadarChartGlyphs);if(typeof module==='object'&&module.exports)module.exports=api;else root.dadRadarCartography=api;})(typeof globalThis!=='undefined'?globalThis:this,function(typefaces){
 'use strict';
 function lettering(text,kind){return kind==='region'?text:String(text).toLowerCase().replace(/(^|[ \-.])([a-zà-ž])/g,(_,a,b)=>a+b.toUpperCase());}
 function glyphPlan(text,size,face,spacing=0){
  const source=typefaces[face]||typefaces.roman,scale=size/1000,result=[];let advance=0,previous='';
  for(const character of Array.from(text)){
   const glyph=source.glyphs[character]||source.glyphs['?'];
   advance+=(source.kern[previous+character]||0)*scale;
   result.push({path:glyph.path,x:advance,scale});advance+=glyph.advance*scale+spacing;previous=character;
  }
  return {glyphs:result,width:Math.max(0,advance-(result.length?spacing:0))};
 }
 function measure(text,size,face){return glyphPlan(text,size,face).width;}

 function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
 function layout(labels,camera,options){
  const width=options.width,height=options.height;
  if(!(width>0&&height>0&&camera.width>0&&camera.height>0))return [];
  const small=width<500,medium=width<800;
  const occupied=(options.reserved||[]).slice(),result=[],counts={city:0,region:0,country:0,water:0,terrain:0};
  const limits={city:small?9:medium?15:24,region:small?7:16,country:4,water:6,terrain:3};
  const priority={country:0,water:1,region:2,city:3,terrain:4};
  const candidates=labels.slice().sort((a,b)=>(Number(!!b.permanent)-Number(!!a.permanent))||(priority[a.kind]-priority[b.kind])||(a.rank-b.rank)||a.text.localeCompare(b.text));
  for(const item of candidates){
   const kind=item.kind||'city';
   if(counts[kind]>=limits[kind])continue;
   if(kind==='country'&&camera.width<230&&/^(UNITED STATES|UNITED STATES OF AMERICA|CANADA|MEXICO)$/.test(item.text))continue;
   if(kind==='region'&&camera.width>420)continue;
   const px=(item.x-camera.x)/camera.width*width,py=(item.y-camera.y)/camera.height*height;
   if(px<0||px>width||py<0||py>height)continue;
   if(!item.permanent&&(options.reserved||[]).some(b=>px>=b.x&&px<=b.x+b.width&&py>=b.y&&py<=b.y+b.height))continue;
   if(kind==='city'&&result.some(other=>other.kind==='city'&&Math.hypot(other.px-px,other.py-py)<14))continue;
   const size=kind==='city'?(item.permanent?(small?12:14):(small?10.5:13)):kind==='region'?(small?11:14):kind==='country'?(small?10:12):kind==='water'?(small?11:14):12;
   const spacing=kind==='region'?.8:kind==='country'?.5:kind==='terrain'?.4:0;
   const font=kind==='water'||kind==='terrain'?'italic':'roman';
   const displayText=lettering(item.text,kind);
   const textWidth=(options.measure||measure)(displayText,size,font)+Math.max(0,displayText.length-1)*spacing;
   const angle=item.angle||0,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
   const placements=kind==='city'?[[5,-3,'start'],[-5,-3,'end'],[5,size+3,'start'],[-5,size+3,'end']]:[[0,size*.3,'middle']];
   if(item.permanent)for(const distance of [24,48,80,120,180])placements.push([distance,-3,'start'],[-distance,-3,'end'],[0,-distance,'middle'],[0,distance,'middle']);
   for(const [dx,dy,anchor] of placements){
    const origin=anchor==='start'?0:anchor==='end'?-textWidth:-textWidth/2;
    const corners=[[origin,-size],[origin+textWidth,-size],[origin,size*.3],[origin+textWidth,size*.3]].map(([x,y])=>({x:px+dx+x*cos-y*sin,y:py+dy+x*sin+y*cos}));
    const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    const box={x:Math.min(...xs)-2,y:Math.min(...ys)-2,width:Math.max(...xs)-Math.min(...xs)+4,height:Math.max(...ys)-Math.min(...ys)+4};
    if(box.x<3||box.y<3||box.x+box.width>width-3||box.y+box.height>height-3||occupied.some(b=>overlap(box,b)))continue;
    result.push({...item,displayText,px,py,dx,dy,size,spacing,font,anchor,angle,box});occupied.push(box);counts[kind]++;break;
   }
  }
  return result;
 }
 function create(options){
  const doc=options.document,svg=options.svg,layer=options.layer,paper=options.paper,labels=options.labels||[];
  if(!svg||!layer)return null;
  const ns='http://www.w3.org/2000/svg';
  let current=null,lastKey='',frame=null;
  function node(tag,attrs,text){const n=doc.createElementNS(ns,tag);Object.keys(attrs).forEach(k=>n.setAttribute(k,attrs[k]));if(text!==undefined)n.textContent=text;return n;}
  function draw(){
   frame=null;if(!current)return;
   const rect=svg.getBoundingClientRect();
   const reserved=[];
   // Physical map furniture takes priority over printed reference lettering.
   for(const selector of ['.map-compass-rose','.airport-placard','.sequence-mileage-badge']){
    for(const n of options.shell.querySelectorAll(selector)){
     const b=n.getBoundingClientRect();if(b.width&&b.height)reserved.push({x:b.left-rect.left-3,y:b.top-rect.top-3,width:b.width+6,height:b.height+6});
    }
   }
   const key=[current.x,current.y,current.width,current.height,rect.width,rect.height,...reserved.flatMap(b=>[b.x,b.y,b.width,b.height])].map(n=>Number(n).toFixed(3)).join('|');
   if(key===lastKey)return;lastKey=key;
   const placed=layout(labels,current,{width:rect.width,height:rect.height,reserved,measure});
   const fragment=doc.createDocumentFragment(),unit=current.width/rect.width;
   for(const item of placed){
    const g=node('g',{class:`chart-label chart-label-${item.kind}${item.permanent?' chart-home':''}`,'data-chart-name':item.text,transform:`translate(${item.x} ${item.y}) scale(${unit})`});
    if(item.permanent){
     g.appendChild(node('title',{},'Asheville — home reference'));
     if(Math.hypot(item.dx,item.dy)>20)g.appendChild(node('path',{class:'chart-home-leader',d:`M0 0L${item.dx} ${item.dy-3}`,fill:'none'}));
     g.appendChild(node('circle',{r:3.2,cx:0,cy:0}));g.appendChild(node('circle',{class:'chart-home-center',r:1.1,cx:0,cy:0}));
    }else if(item.kind==='city')g.appendChild(node('circle',{r:1.55,cx:0,cy:0}));
    const plan=glyphPlan(item.displayText,item.size,item.font,item.spacing);
    const offset=item.anchor==='end'?-plan.width:item.anchor==='middle'?-plan.width/2:0;
    const ink=node('g',{class:'chart-printed-lettering',role:'img','aria-label':item.displayText,transform:`translate(${item.dx} ${item.dy}) rotate(${item.angle})`});
    for(const glyph of plan.glyphs)if(glyph.path)ink.appendChild(node('path',{d:glyph.path,transform:`translate(${offset+glyph.x} 0) scale(${glyph.scale})`}));
    g.appendChild(ink);
    fragment.appendChild(g);
   }
   layer.replaceChildren(fragment);
  }
  function update(camera){
   current={...camera};
   // Paper tooth remains at physical sheet scale through geographic camera changes.
   if(paper)for(const key of ['x','y','width','height'])paper.setAttribute(key,camera[key]);
   if(frame===null)frame=doc.defaultView.requestAnimationFrame(draw);
  }
  return {update};
 }
 return {layout,overlap,create,glyphPlan};
});
