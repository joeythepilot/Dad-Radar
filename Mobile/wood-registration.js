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
 var api={planWoodPieces:planWoodPieces,planWoodBacking:planWoodBacking,stock:stock};
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
   frames.forEach(function(selector){
    var n=dashboard.querySelector(selector);if(!n)return;var r=rect(n);r.id=selector;r.trim=3;regions.push(r);
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
    protectedAreas.push(opening);
   });
   ['.flight-strip-module','.twin-clock-panel'].forEach(function(selector){
    var n=dashboard.querySelector(selector),photo=n&&n.querySelector('.family-photo-plate');
    // Until the independent photograph arrives, protect the original fallback.
    if(n&&!(photo&&photo._photoEvidence))protectedAreas.push(rect(n));
   });
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-instrument-plate'),function(n,i){
    var r=rect(n),b={id:'instrument-'+i,x:r.x+r.width*50/1254,y:r.y+r.height*90/1254,width:r.width*1145/1254,height:r.height*1062/1254,trim:2.5};regions.push(b);protectedAreas.push(b);
   });
   Array.prototype.forEach.call(dashboard.querySelectorAll('.family-photo-plate'),function(n){
    var e=n._photoEvidence;if(!e)return;var r=rect(n),f=e.fit,b=e.body;
    protectedAreas.push({x:r.x+f.x+b[0]*f.scale,y:r.y+3+f.y+b[1]*f.scale,width:(b[2]-b[0])*f.scale,height:(b[3]-b[1])*f.scale});
    e.holes.forEach(function(h){protectedAreas.push({x:r.x+h.x,y:r.y+3+h.y,width:h.width,height:h.height});});
   });
   var dpr=Math.min(3,root.devicePixelRatio||1),ctx=canvas.getContext('2d');
   canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
   canvas.style.width=width+'px';canvas.style.height=height+'px';
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
   var pieces=planWoodPieces(regions,stock),field=planWoodBacking(width,height,{width:infill.naturalWidth,height:infill.naturalHeight},pieces.length?pieces[0].scale:0);
   var input={x:stock.x,width:stock.width,rows:stock.rows,minScale:field.scale};pieces=planWoodPieces(regions,input);
   // One continuous genuine source crop, uniformly scaled and rotated; no
   // tiled patches or stretched trim. Existing stock pieces sit above it.
   ctx.save();ctx.translate(field.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(infill,field.sx,field.sy,field.sw,field.sh,0,0,field.height,field.width);ctx.restore();
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
