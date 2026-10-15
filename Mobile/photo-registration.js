(function(root){
 'use strict';
 var api={},prefix='/assets/hardware/HomingBeacon_Mobile_';
 root.DadRadarMobilePhotos=api;
 function fit(){
  var m=document.querySelector('.flight-strip-module');if(!m)return;
  var portrait=innerHeight>innerWidth,plate=m.querySelector('.family-splitflap-plate');
  if(!plate){
   plate=document.createElement('img');plate.className='family-photo-plate family-splitflap-plate';
   plate.alt='';plate.setAttribute('aria-hidden','true');plate.hidden=true;
   plate.onload=function(){plate.hidden=false;m.classList.add('family-photo-mounted');};
   plate.onerror=function(){plate.hidden=true;m.classList.remove('family-photo-mounted');};
   m.insertBefore(plate,m.firstChild);
  }
  // The finished plate already contains its measured openings. Only uniform
  // whole-image placement happens here; mechanisms retain their native layout.
  var src=prefix+'SplitFlap_'+(portrait?'Portrait':'Landscape')+'_Native_v8.png';
  if(plate.getAttribute('src')!==src){plate.hidden=true;m.classList.remove('family-photo-mounted');plate.src=src;}
  var cs=getComputedStyle(m);
  plate.style.left=-parseFloat(cs.borderLeftWidth)+'px';plate.style.top=(-3-parseFloat(cs.borderTopWidth))+'px';
  plate.style.width=(portrait?264.71875:822.1875)+'px';plate.style.height='auto';
  var panel=document.querySelector('.twin-clock-panel'),art=panel&&panel.querySelector('.twin-clock-art');
  if(art&&!art.querySelector('.family-clock-plate')){
   // Restore the approved photographic preview's single uniform placement.
   // Plate and original drums share native SVG coordinates, without a second
   // screen-space fit (getScreenCTM is inconsistent on older Safari).
   var clock=document.createElementNS('http://www.w3.org/2000/svg','g');
   clock.setAttribute('class','family-clock-plate');clock.setAttribute('aria-hidden','true');
   clock.innerHTML='<defs><clipPath id="family-clock-metal"><path clip-rule="evenodd" d="M178 2H1596V826H178Z M220 130H1560V340H220Z M220 525H1560V735H220Z"/></clipPath></defs>'+
    '<rect x="212" y="122" width="1356" height="226" fill="#0b0a09"/>'+
    '<rect x="212" y="517" width="1356" height="226" fill="#0b0a09"/>'+
    '<image href="'+prefix+'Clock_Source_v6.png" x="112.32346115053463" y="-103.67151994894778" width="1555.3530776989307" height="1036.9020517992872" clip-path="url(#family-clock-metal)"/>';
   art.insertBefore(clock,art.querySelector('.drum-clock'));
   panel.classList.add('family-clock-photo-mounted');
  }
 }
 api.fit=fit;
 api.start=fit;
})(typeof window==='object'?window:this);
