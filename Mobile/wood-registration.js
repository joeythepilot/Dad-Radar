(function(root){
 'use strict';
 var stock={x:16,width:2140,rows:[[10,76],[100,75],[189,76],[278,77],[369,76],[458,76],[548,75],[636,76]]};
 function planWoodPieces(regions,source){
  if(!source||!(source.width>0)||!source.rows||!source.rows.length)throw new Error('Invalid photographic source');
  var pieces=[],longest=0,thickest=0,minHeight=Infinity;
  source.rows.forEach(function(row){if(!(row[1]>0))throw new Error('Invalid photographic source row');minHeight=Math.min(minHeight,row[1]);});
  regions.forEach(function(r){if(!(r.width>0&&r.height>0&&r.trim>0))return;var t=r.trim;
   [{side:'top',x:r.x-t,y:r.y-t,width:r.width+2*t,height:t},
    {side:'right',x:r.x+r.width,y:r.y,width:t,height:r.height,vertical:true},
    {side:'bottom',x:r.x-t,y:r.y+r.height,width:r.width+2*t,height:t},
    {side:'left',x:r.x-t,y:r.y,width:t,height:r.height,vertical:true}].forEach(function(p){p.id=r.id;pieces.push(p);longest=Math.max(longest,p.vertical?p.height:p.width);thickest=Math.max(thickest,t);});
  });
  if(!pieces.length)return pieces;
  var scale=Math.max(longest/source.width,thickest/minHeight,source.minScale||0);
  pieces.forEach(function(p,i){p.row=i%source.rows.length;var row=source.rows[p.row],length=p.vertical?p.height:p.width,thickness=p.vertical?p.width:p.height;
   p.sw=length/scale;p.sh=thickness/scale;p.sx=(source.x||0)+(source.width-p.sw)*((i*0.38196601125)%1);p.sy=row[0]+(row[1]-p.sh)*0.67;p.scale=scale;
  });
  return pieces;
 }
 var api={planWoodPieces:planWoodPieces,stock:stock};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {
  var image=null,infill=null,canvas=null,started=false;
  var frames=['.destination-panel','.daily-schedule-panel','.vintage-map-panel','.weekly-overnight-bank'];
  function fit(){
   var dashboard=document.getElementById('dashboard');
   if(!image||!canvas||!dashboard||dashboard.hidden)return;
   var box=dashboard.getBoundingClientRect(),width=box.width,height=box.height;
   if(!(width>0&&height>0))return;
   var regions=[{id:'perimeter',x:7,y:7,width:width-14,height:height-14,trim:5}],protectedAreas=[];
   function rect(n){var r=n.getBoundingClientRect();return{x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height};}
   frames.forEach(function(selector){var n=dashboard.querySelector(selector);if(!n)return;var r=rect(n);r.id=selector;r.trim=3;regions.push(r);protectedAreas.push(r);});
   ['.flight-strip-module','.twin-clock-panel'].forEach(function(selector){var n=dashboard.querySelector(selector);if(n)protectedAreas.push(rect(n));});
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-instrument-plate'),function(n,i){
    var r=rect(n),b={id:'instrument-'+i,x:r.x+r.width*50/1254,y:r.y+r.height*90/1254,width:r.width*1145/1254,height:r.height*1062/1254,trim:2.5};regions.push(b);protectedAreas.push(b);
   });
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-photo-plate'),function(n){
    var e=n._photoEvidence;if(!e)return;var r=rect(n),f=e.fit,b=e.body;
    protectedAreas.push({x:r.x+f.x+b[0]*f.scale,y:r.y+3+f.y+b[1]*f.scale,width:(b[2]-b[0])*f.scale,height:(b[3]-b[1])*f.scale});
   });
   var dpr=Math.min(3,root.devicePixelRatio||1),ctx=canvas.getContext('2d');
   canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
   canvas.style.width=width+'px';canvas.style.height=height+'px';
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
   var rail=dashboard.querySelector('.instrument-rail'),field=rail?rect(rail):null;
   var input={x:stock.x,width:stock.width,rows:stock.rows,minScale:field?Math.max(field.height/infill.naturalWidth,field.width/infill.naturalHeight):0};
   var pieces=planWoodPieces(regions,input);
   if(field&&pieces.length){field.scale=pieces[0].scale;field.sw=field.height/field.scale;field.sh=field.width/field.scale;field.sx=(infill.naturalWidth-field.sw)/2;field.sy=(infill.naturalHeight-field.sh)/2;ctx.save();ctx.translate(field.x+field.width,field.y);ctx.rotate(Math.PI/2);ctx.drawImage(infill,field.sx,field.sy,field.sw,field.sh,0,0,field.height,field.width);ctx.restore();}
   pieces.forEach(function(p){ctx.save();if(p.vertical){ctx.translate(p.x+p.width,p.y);ctx.rotate(Math.PI/2);ctx.drawImage(image,p.sx,p.sy,p.sw,p.sh,0,0,p.height,p.width);}else ctx.drawImage(image,p.sx,p.sy,p.sw,p.sh,p.x,p.y,p.width,p.height);ctx.restore();});
   protectedAreas.forEach(function(r){ctx.clearRect(r.x-0.5,r.y-0.5,r.width+1,r.height+1);});
   canvas._woodEvidence={source:image.src,infill:field,pieces:pieces,regions:regions,protectedAreas:protectedAreas,dpr:dpr,width:width,height:height};
  }
  api.fit=fit;
  api.start=function(){
   if(started||!document.documentElement.hasAttribute('data-family-full'))return;started=true;
   function load(src){return new Promise(function(ok,no){var n=new Image();n.onload=function(){ok(n);};n.onerror=no;n.src=src;});}
   Promise.all([load('/assets/hardware/HomingBeacon_Mobile_Walnut_Source_v1.png'),load('/assets/hardware/HomingBeacon_Mobile_Walnut_Infill_v1.png')]).then(function(images){
    image=images[0];infill=images[1];canvas=document.createElement('canvas');canvas.className='family-walnut';canvas.setAttribute('aria-hidden','true');
    var dashboard=document.getElementById('dashboard');if(!dashboard)return;dashboard.appendChild(canvas);fit();
    if(root.MutationObserver)new MutationObserver(function(records){
     var added=records.some(function(record){return Array.prototype.some.call(record.addedNodes,function(node){return node.nodeType===1&&node.classList.contains('family-photo-plate');});});
     if(added)fit();
    }).observe(dashboard,{childList:true,subtree:true});
   }).catch(function(){image=null;infill=null;api.failed=true;});
  };
  root.DadRadarMobileWood=api;
 }
})(typeof window==='object'?window:this);
