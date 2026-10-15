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
 function planWoodBacking(width,height,source,minScale){
  if(!source||!(source.width>0&&source.height>0))throw new Error('Invalid photographic source');
  if(!(width>0&&height>0))return null;
  var scale=Math.max(height/source.width,width/source.height,minScale||0),sw=height/scale,sh=width/scale;
  return{x:0,y:0,width:width,height:height,scale:scale,sw:sw,sh:sh,sx:(source.width-sw)/2,sy:(source.height-sh)/2};
 }
 function planProfileFrames(openings,source,width,height){
  if(!source||!(source.width>0)||!source.rows||!source.rows.length)throw new Error('Invalid profile source');
  var regions=[],pieces=[],longest=0;
  openings.forEach(function(r){if(!(r.width>0&&r.height>0&&r.trim>0))return;regions.push({id:r.id,x:r.x,y:r.y,width:r.width,height:r.height,left:Math.max(0,r.x-r.trim),right:Math.min(width,r.x+r.width+r.trim),top:Math.max(0,r.y-r.trim),bottom:Math.min(height,r.y+r.height+r.trim)});});
  regions.forEach(function(a){regions.forEach(function(b){if(a===b)return;
   if(a.y<b.y+b.height&&b.y<a.y+a.height){if(a.x+a.width<=b.x)a.right=Math.min(a.right,(a.x+a.width+b.x)/2);if(b.x+b.width<=a.x)a.left=Math.max(a.left,(b.x+b.width+a.x)/2);}
   if(a.x<b.x+b.width&&b.x<a.x+a.width){if(a.y+a.height<=b.y)a.bottom=Math.min(a.bottom,(a.y+a.height+b.y)/2);if(b.y+b.height<=a.y)a.top=Math.max(a.top,(b.y+b.height+a.y)/2);}
  });});
  regions.forEach(function(r){var l=r.left,t=r.top,rr=r.right,b=r.bottom,x=r.x,y=r.y,xr=x+r.width,yb=y+r.height;
   [{side:'top',x:l,y:t,width:rr-l,height:y-t,rotation:0,polygon:[[l,t],[rr,t],[xr,y],[x,y]]},
    {side:'right',x:xr,y:t,width:rr-xr,height:b-t,rotation:90,polygon:[[rr,t],[rr,b],[xr,yb],[xr,y]]},
    {side:'bottom',x:l,y:yb,width:rr-l,height:b-yb,rotation:180,polygon:[[rr,b],[l,b],[x,yb],[xr,yb]]},
    {side:'left',x:l,y:t,width:x-l,height:b-t,rotation:270,polygon:[[l,b],[l,t],[x,y],[x,yb]]}].forEach(function(p){
     if(!(p.width>0&&p.height>0))return;p.id=r.id;p.vertical=p.rotation===90||p.rotation===270;p.length=p.vertical?p.height:p.width;p.thickness=p.vertical?p.width:p.height;longest=Math.max(longest,p.length);pieces.push(p);
    });
  });
  var scale=Math.max(longest/source.width,source.minScale||0.1);
  pieces.forEach(function(p,i){p.row=i%source.rows.length;var row=source.rows[p.row];p.scale=scale;p.sw=p.length/scale;p.sh=p.thickness/scale;if(p.sh>row[1])throw new Error('Profile stock is too narrow');p.sx=(source.x||0)+(source.width-p.sw)*((i*.38196601125)%1);p.sy=row[0]+row[1]-p.sh;});
  return pieces;
 }
 var api={planWoodPieces:planWoodPieces,planWoodBacking:planWoodBacking,planProfileFrames:planProfileFrames,stock:stock};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {
  var image=null,infill=null,mapFrame=null,canvas=null,started=false;
  var frames=['.destination-panel','.daily-schedule-panel','.vintage-map-panel','.weekly-overnight-bank'];
  function fit(){
   var dashboard=document.getElementById('dashboard');
   if(!image||!canvas||!dashboard||dashboard.hidden)return;
   var box=dashboard.getBoundingClientRect(),width=box.width,height=box.height;
   if(!(width>0&&height>0))return;
   var regions=[{id:'perimeter',x:7,y:7,width:width-14,height:height-14,trim:7}],protectedAreas=[],mapOpening=null;
   function rect(n){var r=n.getBoundingClientRect();return{x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height};}
   frames.forEach(function(selector){
    var n=dashboard.querySelector(selector);if(!n)return;var r=rect(n);
    var content=selector==='.vintage-map-panel'?n.querySelector('.route-map-shell'):selector==='.destination-panel'?n.querySelector('.destination-poster-image'):n;
    var opening=content?rect(content):r;
    if(selector==='.destination-panel'){
     if(content&&!content.hidden&&opening.width>0&&opening.height>0&&content.naturalWidth&&content.naturalHeight){
      // Portrait uses a full-size object-fit:contain box. Protect the actual
      // printed poster, not its empty letterbox. Nothing is resized or moved.
      var s=Math.min(opening.width/content.naturalWidth,opening.height/content.naturalHeight),w=content.naturalWidth*s,h=content.naturalHeight*s;
      opening={x:opening.x+(opening.width-w)/2,y:opening.y+(opening.height-h)/2,width:w,height:h};
     }else opening=r;
    }
    opening.id=selector;opening.trim=selector==='.vintage-map-panel'?9:5;regions.push(opening);protectedAreas.push(opening);if(selector==='.vintage-map-panel')mapOpening=opening;
   });
   ['.flight-strip-module','.twin-clock-panel'].forEach(function(selector){
    var n=dashboard.querySelector(selector),photo=n&&n.querySelector('.family-photo-plate');
    // Until the independent photograph arrives, protect the original fallback.
    if(n&&!(photo&&photo._photoEvidence))protectedAreas.push(rect(n));
   });
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-instrument-plate'),function(n,i){
    var r=rect(n),b={id:'instrument-'+i,x:r.x+r.width*50/1254,y:r.y+r.height*90/1254,width:r.width*1145/1254,height:r.height*1062/1254,trim:4};regions.push(b);protectedAreas.push(b);
   });
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-photo-plate'),function(n){
    var e=n._photoEvidence;if(!e)return;var r=rect(n),f=e.fit,b=e.body;
    var body={id:'metal-'+regions.length,x:r.x+f.x+b[0]*f.scale,y:r.y+3+f.y+b[1]*f.scale,width:(b[2]-b[0])*f.scale,height:(b[3]-b[1])*f.scale,trim:3};protectedAreas.push(body);regions.push(body);
    e.holes.forEach(function(h){protectedAreas.push({x:r.x+h.x,y:r.y+3+h.y,width:h.width,height:h.height});});
   });
   var dpr=Math.min(3,root.devicePixelRatio||1),ctx=canvas.getContext('2d');
   canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
   canvas.style.width=width+'px';canvas.style.height=height+'px';
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
   var source={x:16,width:1504,rows:[[8,52],[70,52],[132,52],[194,52],[256,52],[318,52],[380,52],[442,52]],minScale:.2};
   // Do not partition the module frames against their enclosing perimeter.
   var pieces=planProfileFrames(regions.slice(1),source,width,height).concat(planProfileFrames(regions.slice(0,1),source,width,height));
   var field=planWoodBacking(width,height,{width:1504,height:492},0);
   ctx.save();ctx.translate(field.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(infill,16+field.sx,516+field.sy,field.sw,field.sh,0,0,field.height,field.width);ctx.restore();
   pieces.forEach(function(p){ctx.save();ctx.beginPath();p.polygon.forEach(function(v,i){if(i)ctx.lineTo(v[0],v[1]);else ctx.moveTo(v[0],v[1]);});ctx.closePath();ctx.clip();
    if(p.rotation===90){ctx.translate(p.x+p.width,p.y);ctx.rotate(Math.PI/2);}else if(p.rotation===180){ctx.translate(p.x+p.width,p.y+p.height);ctx.rotate(Math.PI);}else if(p.rotation===270){ctx.translate(p.x,p.y+p.height);ctx.rotate(-Math.PI/2);}else ctx.translate(p.x,p.y);
    ctx.drawImage(image,p.sx,p.sy,p.sw,p.sh,0,0,p.length,p.thickness);ctx.restore();});
   var approvedMap=null;
   if(mapOpening){var h={x:69,y:64,width:1399,height:894},s=(h.width*mapOpening.width+h.height*mapOpening.height)/(h.width*h.width+h.height*h.height),ex=(h.width*s-mapOpening.width)/2,ey=(h.height*s-mapOpening.height)/2;
    if(Math.max(Math.abs(ex),Math.abs(ey))<.75){var mx=mapOpening.x-ex-h.x*s,my=mapOpening.y-ey-h.y*s;ctx.drawImage(mapFrame,mx,my,mapFrame.naturalWidth*s,mapFrame.naturalHeight*s);approvedMap={scale:s,x:mx,y:my,edgeError:[ex,ey]};}
   }
   protectedAreas.forEach(function(r){ctx.clearRect(r.x-0.5,r.y-0.5,r.width+1,r.height+1);});
   canvas._woodEvidence={source:image.src,infill:field,pieces:pieces,regions:regions,protectedAreas:protectedAreas,dpr:dpr,width:width,height:height,profiled:true,approvedMap:approvedMap};
  }
  api.fit=fit;
  api.start=function(){
   if(started||!document.documentElement.hasAttribute('data-family-full'))return;started=true;
   function load(src){return new Promise(function(ok,no){var n=new Image();n.onload=function(){ok(n);};n.onerror=no;n.src=src;});}
   Promise.all([load('/assets/hardware/HomingBeacon_Walnut_Profile_Atlas_v2.png'),load('/assets/hardware/HomingBeacon_Map_Walnut_Frame_Study_v3.png')]).then(function(images){
    image=images[0];infill=images[0];mapFrame=images[1];canvas=document.createElement('canvas');canvas.className='family-walnut';canvas.setAttribute('aria-hidden','true');
    var dashboard=document.getElementById('dashboard');if(!dashboard)return;dashboard.appendChild(canvas);fit();
    var posterFitPending=false;
    function posterChanged(){
     if(posterFitPending)return;posterFitPending=true;
     var settled=function(){posterFitPending=false;fit();};
     if(root.requestAnimationFrame)root.requestAnimationFrame(settled);else root.setTimeout(settled,0);
    }
    function posterEvent(event){if(event.target.classList&&event.target.classList.contains('destination-poster-image'))posterChanged();}
    // Target onload/onerror owns image/fallback visibility. Measure only after
    // that handler finishes, never during its ancestor capture phase.
    dashboard.addEventListener('load',posterEvent,true);
    dashboard.addEventListener('error',posterEvent,true);
    var poster=dashboard.querySelector('.destination-poster-image');
    // Unknown destinations can reveal fallback without a load/error event.
    // Observe this one image only, never animated mechanism style changes.
    if(root.MutationObserver&&poster)new MutationObserver(posterChanged).observe(poster,{attributes:true,attributeFilter:['hidden','src','style']});
    if(root.MutationObserver)new MutationObserver(function(records){
     var added=records.some(function(record){return Array.prototype.some.call(record.addedNodes,function(node){return node.nodeType===1&&node.classList.contains('family-photo-plate');});});
     if(added)fit();
    }).observe(dashboard,{childList:true,subtree:true});
   }).catch(function(){image=null;infill=null;api.failed=true;});
  };
  root.DadRadarMobileWood=api;
 }
})(typeof window==='object'?window:this);
