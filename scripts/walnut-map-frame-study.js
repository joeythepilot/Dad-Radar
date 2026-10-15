const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=process.env.DADRADAR_ARTIFACT_ROOT||path.join(root,'artifacts/walnut-map-frame-study');
fs.mkdirSync(output,{recursive:true});
const {createDisplayFixture}=require(root+'/scripts/display-browser-fixture');
(async()=>{
 const fixture=createDisplayFixture();await new Promise(r=>fixture.server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const origin='http://127.0.0.1:'+fixture.server.address().port;
  await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('blob:')?r.continue():r.abort());
  await page.goto(origin+'/mobile');await page.waitForFunction(()=>document.querySelector('canvas.family-walnut')?._woodEvidence&&document.querySelector('#destination-poster')?.naturalWidth);
  await page.evaluate(()=>document.fonts.ready);
  const snapshot=()=>page.evaluate(()=>Object.fromEntries(['#dashboard','.vintage-map-panel','.route-map-shell','.route-map-svg','.flight-board','.twin-clock-panel','.weekly-overnight-bank','.instrument-rail'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));
  const before=await snapshot();
  await page.screenshot({path:path.join(output,'walnut-map-proof-before.png')});
  const evidence=await page.evaluate(async()=>{
   const image=new Image();image.src='/assets/hardware/HomingBeacon_Map_Walnut_Frame_Study_v3.png';await image.decode();
   const dashboard=document.getElementById('dashboard'),d=dashboard.getBoundingClientRect(),map=document.querySelector('.route-map-shell').getBoundingClientRect();
   // Whole-object isotropic fit only. The photographed clear opening is
   // measured independently in the source; no rail/corner stretching.
   const hole={x:69,y:64,width:1399,height:894};
   const scale=(hole.width*map.width+hole.height*map.height)/(hole.width*hole.width+hole.height*hole.height);
   const x=map.x-d.x+(map.width-hole.width*scale)/2-hole.x*scale,y=map.y-d.y+(map.height-hole.height*scale)/2-hole.y*scale;
   const canvas=document.createElement('canvas');canvas.className='map-frame-study';canvas.width=Math.ceil(d.width*2);canvas.height=Math.ceil(d.height*2);
   Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',width:d.width+'px',height:d.height+'px',zIndex:'101',pointerEvents:'none'});
   const c=canvas.getContext('2d');c.scale(2,2);c.drawImage(image,x,y,image.width*scale,image.height*scale);
   // Registration clips only the working opening, preserving all live map
   // pixels. Source opening coordinates follow the measured128-alpha inner
   // wall; faint generated edge-alpha is clipped at the exact live aperture.
   c.clearRect(map.x-d.x,map.y-d.y,map.width,map.height);
   const protectedAreas=document.querySelector('canvas.family-walnut')._woodEvidence.protectedAreas;
   protectedAreas.forEach(r=>c.clearRect(r.x,r.y,r.width,r.height));
   dashboard.appendChild(canvas);
   const error={horizontal:(hole.width*scale-map.width)/2,vertical:(hole.height*scale-map.height)/2};
   const pixel=c.getImageData(Math.floor((map.x-d.x+map.width/2)*2),Math.floor((map.y-d.y+map.height/2)*2),1,1).data;
   const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
   let checked=0,covered=0;
   protectedAreas.forEach(r=>{for(let row=Math.ceil((r.y+1)*2);row<Math.floor((r.y+r.height-1)*2);row++)for(let col=Math.ceil((r.x+1)*2);col<Math.floor((r.x+r.width-1)*2);col++){checked++;if(pixels[(row*canvas.width+col)*4+3])covered++;}});
   return{source:[image.naturalWidth,image.naturalHeight],hole,scale,x,y,error,centerAlpha:pixel[3],checked,covered,liveMapPaths:document.querySelectorAll('.route-map-svg path').length};
  });
  assert.deepEqual(await snapshot(),before,'No module or map geometry changes');assert.equal(evidence.centerAlpha,0);assert(evidence.checked>100000);assert.equal(evidence.covered,0,'No photographic frame covers the original map or another protected module interior');assert(evidence.liveMapPaths>20);
  await page.screenshot({path:path.join(output,'walnut-map-proof-after.png')});
  await page.screenshot({path:path.join(output,'walnut-map-proof-detail.png'),clip:{x:255,y:75,width:395,height:260},scale:'device'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({evidence,geometryUnchanged:true,errors},null,2));
 }finally{await browser.close();await new Promise(r=>fixture.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
