(function(root){
 'use strict';
 // Each source photograph is isotropic. Only the explicitly approved local
 // aperture bands are edited; the original live mechanisms are never fitted.
 function fitBody(body,bay,clearance){
  if(!(bay.width>0&&bay.height>0))throw new Error('Invalid bay size');
  var scale=Math.min(bay.width/(body[2]-body[0]),(bay.height+2*clearance)/(body[3]-body[1]));
  return {scale:scale,scaleX:scale,scaleY:scale,x:(bay.width-(body[0]+body[2])*scale)/2,y:(bay.height-(body[1]+body[3])*scale)/2};
 }
 function registerEdges(source,target,pad){
  var x=source[0],y=source[1],w=source[2],h=source[3],sx=target.width/w,sy=target.height/h;
  // Four distinct photographed strips. No tiled/repeated edge pixels and no
  // independent horizontal/vertical stretching of a strip's material.
  return {hole:target,edges:[
   {sx:x-pad,sy:y-pad,sw:w+2*pad,sh:pad,dx:target.x-pad*sx,dy:target.y-pad*sx,dw:(w+2*pad)*sx,dh:pad*sx},
   {sx:x-pad,sy:y+h,sw:w+2*pad,sh:pad,dx:target.x-pad*sx,dy:target.y+target.height,dw:(w+2*pad)*sx,dh:pad*sx},
   {sx:x-pad,sy:y,sw:pad,sh:h,dx:target.x-pad*sy,dy:target.y,dw:pad*sy,dh:h*sy},
   {sx:x+w,sy:y,sw:pad,sh:h,dx:target.x+target.width,dy:target.y,dw:pad*sy,dh:h*sy}
  ]};
 }
 var api={fitBody:fitBody,registerEdges:registerEdges};
 if(typeof module==='object'&&module.exports){module.exports=api;return;}
 root.DadRadarMobilePhotos=api;
 var prefix='/assets/hardware/HomingBeacon_Mobile_',photos={
  landscape:{name:'SplitFlap_Landscape',body:[14,205,2158,493],donorBody:[14,201,2161,496],holes:[[96,282,466,137],[638,282,271,137],[983,282,274,137],[1333,282,744,137]]},
  portrait:{name:'SplitFlap_Portrait',body:[7,218,1820,636],donorBody:[7,216,1820,638],holes:[[121,370,365,119],[546,370,221,119],[829,370,218,119],[1109,370,598,119]]},
  clock:{name:'Clock',body:[52,95,1484,940],donorBody:[52,95,1485,940],holes:[[106,233,1324,200],[106,629,1324,194]]}
 };
 function load(src){return new Promise(function(resolve,reject){var im=new Image();im.onload=function(){resolve(im);};im.onerror=reject;im.src=src;});}
 function draw(canvas,photo,targets,bay){
  var panelScale=parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1;
  var clearance=3,dpr=(root.devicePixelRatio||1)*panelScale,f=fitBody(photo.body,bay,clearance);
  var width=Math.ceil(bay.width*dpr),height=Math.ceil((bay.height+2*clearance)*dpr);
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  canvas.style.width=bay.width+'px';canvas.style.height=(bay.height+2*clearance)+'px';
  var ctx=canvas.getContext('2d');
  // Clear the complete integer backing store before restoring CSS coordinates.
  // A fractional CSS-width clear leaves a partial last pixel that accumulates
  // alpha on repeated resize/startup fits, darkening an otherwise untouched lip.
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(dpr,0,0,dpr,0,clearance*dpr);
  ctx.drawImage(photo.original,f.x,f.y,photo.original.naturalWidth*f.scale,photo.original.naturalHeight*f.scale);
  // The donor is used ONLY in bounded old aperture bands. It is not a new face,
  // outer edge, label, screw, or replacement for the selected photograph.
  var df=fitBody(photo.donorBody||photo.body,bay,clearance);
  photo.holes.forEach(function(h,i){
   var pad=8,old={x:f.x+(h[0]-pad)*f.scale,y:f.y+(h[1]-pad)*f.scale,width:(h[2]+2*pad)*f.scale,height:(h[3]+2*pad)*f.scale};
   ctx.save();ctx.beginPath();ctx.rect(old.x,old.y,old.width,old.height);ctx.clip();
   ctx.drawImage(photo.donor,df.x,df.y,photo.donor.naturalWidth*df.scale,photo.donor.naturalHeight*df.scale);ctx.restore();
   var plan=registerEdges(h,targets[i],6);
   plan.edges.forEach(function(e){ctx.drawImage(photo.original,e.sx,e.sy,e.sw,e.sh,e.dx,e.dy,e.dw,e.dh);});
  });
  targets.forEach(function(t){
   ctx.clearRect(t.x,t.y,t.width,t.height);
   // The clock's shared recess is opaque behind the separate live drums/colon.
   if(photo.name==='Clock'){ctx.fillStyle='#0b0a09';ctx.fillRect(t.x,t.y,t.width,t.height);}
  });
  canvas._photoEvidence={profile:photo.name,fit:f,body:photo.body,holes:targets,bay:bay,dpr:dpr,source:photo.original.src};
 }
 function makeCanvas(parent,kind){var n=document.createElement('canvas');n.className='family-photo-plate family-'+kind+'-plate';n.setAttribute('aria-hidden','true');parent.insertBefore(n,parent.firstChild);return n;}
 function union(nodes,origin){var rs=Array.prototype.map.call(nodes,function(n){return n.getBoundingClientRect();});var x=Math.min.apply(null,rs.map(function(r){return r.left;})),y=Math.min.apply(null,rs.map(function(r){return r.top;}));return{x:x-origin.left,y:y-origin.top,width:Math.max.apply(null,rs.map(function(r){return r.right;}))-x,height:Math.max.apply(null,rs.map(function(r){return r.bottom;}))-y};}
 function fit(){
  if(!api.ready)return;
  var m=document.querySelector('.flight-strip-module'),board=document.querySelector('.flight-board');if(!m||!board)return;
  var scale=parseFloat(document.getElementById('dashboard').style.getPropertyValue('--family-panel-scale'))||1;
  var mr=m.getBoundingClientRect(),cs=getComputedStyle(m),photo=photos[innerHeight>innerWidth?'portrait':'landscape'];
  if(mr.width<=0||mr.height<=0)return;
  var targets=['flight-number','flight-origin','flight-destination','status-value'].map(function(id){var t=union(document.getElementById(id).querySelectorAll('.flap-character'),mr);return{x:t.x/scale,y:t.y/scale,width:t.width/scale,height:t.height/scale};});
  if(!targets.every(function(t){return t.width>0&&t.height>0;}))return;
  var canvas=m.querySelector('.family-splitflap-plate')||makeCanvas(m,'splitflap');
  canvas.style.left=-parseFloat(cs.borderLeftWidth)+'px';canvas.style.top=(-3-parseFloat(cs.borderTopWidth))+'px';
  draw(canvas,photo,targets,{width:mr.width/scale,height:mr.height/scale});m.classList.add('family-photo-mounted');
  var panel=document.querySelector('.twin-clock-panel'),art=panel&&panel.querySelector('.twin-clock-art');if(!art)return;
  var pr=panel.getBoundingClientRect(),matrix=art.getScreenCTM();if(!matrix)return;
  var clockTargets=Array.prototype.map.call(art.querySelectorAll('.drum-clock'),function(row){
   var wheels=Array.prototype.map.call(row.querySelectorAll('.clock-wheel,.period-wheel'),function(w){var x=+w.getAttribute('x'),y=+w.getAttribute('y');return{x:matrix.a*x+matrix.e-pr.left,y:matrix.d*y+matrix.f-pr.top,right:matrix.a*(x+210)+matrix.e-pr.left,bottom:matrix.d*(y+210)+matrix.f-pr.top};});
   var x=Math.min.apply(null,wheels.map(function(w){return w.x;})),y=wheels[0].y;return{x:x/scale,y:y/scale,width:(Math.max.apply(null,wheels.map(function(w){return w.right;}))-x)/scale,height:(wheels[0].bottom-y)/scale};
  });
  var clock=panel.querySelector('.family-clock-plate')||makeCanvas(panel,'clock');
  draw(clock,photos.clock,clockTargets,{width:pr.width/scale,height:pr.height/scale});panel.classList.add('family-clock-photo-mounted');
 }
 api.fit=fit;
 api.start=function(){
  if(api.starting)return;api.starting=true;
  Promise.all(Object.keys(photos).map(function(key){var p=photos[key];return Promise.all([load(prefix+p.name+'_Source_v6.png'),load(prefix+p.name+'_CutoutDonor_v6.png')]).then(function(images){p.original=images[0];p.donor=images[1];});})).then(function(){api.ready=true;fit();}).catch(function(){api.failed=true;});
 };
})(typeof window==='object'?window:this);
