/* Shared printed chart lettering. Geographic coordinates and flight state stay owned by route-map. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.dadRadarCartography=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
 function layout(labels,camera,options){
  const width=options.width,height=options.height;
  if(!(width>0&&height>0&&camera.width>0&&camera.height>0))return [];
  const small=width<500,medium=width<800;
  const occupied=(options.reserved||[]).slice(),result=[],counts={city:0,region:0,country:0,water:0,terrain:0};
  const limits={city:small?9:medium?15:24,region:small?7:16,country:4,water:6,terrain:3};
  const priority={country:0,water:1,region:2,city:3,terrain:4};
  const candidates=labels.slice().sort((a,b)=>(priority[a.kind]-priority[b.kind])||(a.rank-b.rank)||a.text.localeCompare(b.text));
  for(const item of candidates){
   const kind=item.kind||'city';
   if(counts[kind]>=limits[kind])continue;
   if(kind==='country'&&camera.width<230&&/^(UNITED STATES|UNITED STATES OF AMERICA|CANADA|MEXICO)$/.test(item.text))continue;
   if(kind==='region'&&camera.width>420)continue;
   const px=(item.x-camera.x)/camera.width*width,py=(item.y-camera.y)/camera.height*height;
   if(px<0||px>width||py<0||py>height)continue;
   if((options.reserved||[]).some(b=>px>=b.x&&px<=b.x+b.width&&py>=b.y&&py<=b.y+b.height))continue;
   if(kind==='city'&&result.some(other=>other.kind==='city'&&Math.hypot(other.px-px,other.py-py)<14))continue;
   const size=kind==='city'?(small?8.5:10.3):kind==='region'?(small?10:13.2):kind==='country'?(small?12:17):kind==='water'?(small?10:12):10;
   const spacing=kind==='region'?(small?1.2:2.0):kind==='country'?2:kind==='terrain'?1.2:kind==='city'?.45:0;
   const font=kind==='city'?'sans':kind==='region'||kind==='country'?'bold':'serif';
   const textWidth=(options.measure?options.measure(item.text,size,font):item.text.length*size*.65)+Math.max(0,item.text.length-1)*spacing;
   const angle=item.angle||0,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
   const placements=kind==='city'?[[5,-3,'start'],[-5,-3,'end'],[5,size+3,'start'],[-5,size+3,'end']]:[[0,size*.3,'middle']];
   for(const [dx,dy,anchor] of placements){
    const origin=anchor==='start'?0:anchor==='end'?-textWidth:-textWidth/2;
    const corners=[[origin,-size],[origin+textWidth,-size],[origin,size*.3],[origin+textWidth,size*.3]].map(([x,y])=>({x:px+dx+x*cos-y*sin,y:py+dy+x*sin+y*cos}));
    const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    const box={x:Math.min(...xs)-2,y:Math.min(...ys)-2,width:Math.max(...xs)-Math.min(...xs)+4,height:Math.max(...ys)-Math.min(...ys)+4};
    if(box.x<3||box.y<3||box.x+box.width>width-3||box.y+box.height>height-3||occupied.some(b=>overlap(box,b)))continue;
    result.push({...item,px,py,dx,dy,size,spacing,font,anchor,angle,box});occupied.push(box);counts[kind]++;break;
   }
  }
  return result;
 }
 function create(options){
  const doc=options.document,svg=options.svg,layer=options.layer,paper=options.paper,labels=options.labels||[];
  if(!svg||!layer)return null;
  const ns='http://www.w3.org/2000/svg',context=doc.createElement('canvas').getContext('2d');
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
   const titleBox={x:0,y:0,width:240,height:65};
   const showTitle=rect.width>=550&&!reserved.some(b=>overlap(b,titleBox));
   if(showTitle)reserved.push(titleBox);
   const key=[current.x,current.y,current.width,current.height,rect.width,rect.height,...reserved.flatMap(b=>[b.x,b.y,b.width,b.height])].map(n=>Number(n).toFixed(3)).join('|');
   if(key===lastKey)return;lastKey=key;
   const measure=(text,size,font)=>{context.font=`${font==='bold'?'700':'400'} ${size}px "${font==='sans'?'DadRadar Chart Sans':'DadRadar Chart Serif'}"`;return context.measureText(text).width;};
   const placed=layout(labels,current,{width:rect.width,height:rect.height,reserved,measure});
   const fragment=doc.createDocumentFragment(),unit=current.width/rect.width;
   if(showTitle){
    const title=node('g',{class:'chart-sheet-title',transform:`translate(${current.x+24*unit} ${current.y+32*unit}) scale(${unit})`});
    title.appendChild(node('text',{'font-size':11,'letter-spacing':1.1},'FLIGHT OPERATIONS'));
    title.appendChild(node('text',{y:18,'font-size':14,'font-weight':700,'letter-spacing':1.3},'REGIONAL AIR CHART'));
    title.appendChild(node('path',{d:'M0 25H184',fill:'none',stroke:'#747359','stroke-width':.65}));fragment.appendChild(title);
   }
   for(const item of placed){
    const g=node('g',{class:`chart-label chart-label-${item.kind}`,'data-chart-name':item.text,transform:`translate(${item.x} ${item.y}) scale(${unit})`});
    if(item.kind==='city')g.appendChild(node('circle',{r:1.55,cx:0,cy:0}));
    g.appendChild(node('text',{x:0,y:0,transform:`translate(${item.dx} ${item.dy}) rotate(${item.angle})`,'font-size':item.size,'letter-spacing':item.spacing,'text-anchor':item.anchor},item.text));
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
  const fontsReady=()=>{lastKey='';if(current)update(current);};
  if(doc.fonts)Promise.all([doc.fonts.load('12px "DadRadar Chart Serif"'),doc.fonts.load('700 12px "DadRadar Chart Serif"'),doc.fonts.load('12px "DadRadar Chart Sans"')]).then(fontsReady,fontsReady);
  return {update};
 }
 return {layout,overlap,create};
});
