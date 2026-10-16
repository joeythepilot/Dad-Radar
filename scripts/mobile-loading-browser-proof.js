'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const express=require('express');
const {createDisplayFixture}=require('./display-browser-fixture');
const {createMobileGateway}=require('../server/mobile-access');
const {app}=require('../server/index');
const {observeBrowserErrors}=require('./browser-error-proof');
const approvedSources={"/assets/hardware/HomingBeacon_Mobile_SplitFlap_Landscape_Native_v8.png":{"sha256":"e1dcbf27a8a254baa7aecf8d5137d774981740574fb542aa2f9dacb2be7853bf","width":6578,"height":893},"/assets/hardware/HomingBeacon_Mobile_SplitFlap_Portrait_Native_v8.png":{"sha256":"284fcaa02333e60dd7b52fea340bb98af3e6a4f8243be5c72e4e7953ec679960","width":2118,"height":536},"/assets/hardware/HomingBeacon_Walnut_Overlay_Landscape_v2.png":{"sha256":"c46745284bdc3ec6af5b57190fddee2283ef6d16b14e0f9e1206ebfd933a8228","width":3072,"height":1728},"/assets/hardware/HomingBeacon_Walnut_Overlay_Portrait_v2.png":{"sha256":"bec9658a92892864483463d5cac5f80d5c148599f8e8b96c9a2a984838fd103b","width":1170,"height":3000},"/assets/hardware/HomingBeacon_Mobile_Clock_Source_v6.png":{"sha256":"6430d7ce6dba54712679ece3e889c265cce314ee8a72cd6a4dfef5aa28b6227d","width":1536,"height":1024},"/assets/hardware/HomingBeacon_Approved_Instrument_Plate_Transparent_v1.png":{"sha256":"1e2e79e546a0f39c78132429a8909440e04293105ba8abd826a7047918018fb8","width":1254,"height":1254},"/assets/hardware/clock-drum-mechanism.png":{"sha256":"0962edd06b180ec505b0f770a7196f89af74a3f444f0afc7f18ca3b3326416d4","width":1825,"height":460},"/assets/hardware/weekly-overnight/weekly-overnight-module.png":{"sha256":"ac97916a25af2ed2a5780e4a63857f53527738ae997e8b09667f9101f35e681e","width":1192,"height":976},"/assets/maps/aged-chart-paper.png":{"sha256":"4618f3659bf92476fd1f5fa7588c129ae09908990072ab84b170e2aa81f93c94","width":1536,"height":1024},"/assets/ui/today-duty-card-weekly-paper.png":{"sha256":"ba7889f7c0b324da665bf9369c34fe83ed7608e9214bb1b1bffb4a964d483d7c","width":1864,"height":843}};
function recordResponse(request,response,records) {
  const originalPath=request.url.split('?')[0];
  response.once('finish',()=>records.push({path:originalPath,status:response.statusCode,type:response.getHeader('Content-Type')||'',bytes:response.statusCode===304?0:Number(response.getHeader('Content-Length')||0),cache:response.getHeader('Cache-Control')}));
}
function assertArtworkCache(record) {
  assert.equal(record.cache,record.status===200||record.status===304 ? 'private, max-age=0, must-revalidate' : 'private, no-store',record.path);
}
async function checkMobileLoading(browser,output,engine) {
  const fixture=createDisplayFixture(),testApp=express(),records=[],reports=[];
  testApp.locals.displayRevision=app.locals.displayRevision;
  // Fictional API data; actual production HTML, PNGs and authenticated gateway.
  testApp.use((req,res,next)=>req.path.startsWith('/api/') ? fixture.server.emit('request',req,res) : next());
  testApp.use(app);
  const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const config={issuer:'https://fixture.cloudflareaccess.com',audience:'performance-proof',origin:'https://family.example.test',emails:['fixture@example.test']};
  const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const unsigned=encode({alg:'RS256',kid:'proof'})+'.'+encode({iss:config.issuer,aud:[config.audience],exp:Date.now()/1000+3600,email:config.emails[0]});
  const token=unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
  const gateway=createMobileGateway(testApp,config,{fetchImpl:async()=>({ok:true,json:async()=>({keys:[{...publicKey.export({format:'jwk'}),kid:'proof'}]})})});
  const server=gateway.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  server.prependListener('request',(req,res)=>recordResponse(req,res,records));
  const base='http://127.0.0.1:'+server.address().port,auth={'Cf-Access-Jwt-Assertion':token},checks=new WeakMap();
  async function visit(page,name) {
    if(!checks.has(page))checks.set(page,observeBrowserErrors(page));
    records.length=0;
    await page.goto(base+'/mobile',{waitUntil:'load'});
    await page.waitForSelector('#dashboard:not([hidden])');
    await page.waitForFunction(()=>document.querySelector('.flight-strip-module')?.classList.contains('family-photo-mounted'));
    await page.waitForFunction(()=>Array.from(document.images).every(image=>image.complete));
    await page.locator('#destination-poster').evaluate(image=>image.decode());
    await page.evaluate(()=>document.fonts.ready);
    const entries=records.slice(),art=entries.filter(r=>r.path.startsWith('/assets/') && /\.(?:png|webp|jpe?g|svg|woff2?|wav|mp3)$/i.test(r.path));
    const report={engine,name,artworkBytes:art.reduce((sum,r)=>sum+r.bytes,0),artwork304:art.filter(r=>r.status===304).length,
      timings:await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd};}),entries};
    fs.writeFileSync(path.join(output,'mobile-loading-'+name+'.json'),JSON.stringify(report,null,2));
    assert.deepEqual(entries.filter(r=>r.status>=400),[],name+' has no failed production requests');
    for(const record of art)assertArtworkCache(record);
    for(const record of entries.filter(r=>!art.includes(r)))assert.match(record.cache,/no-store/,name+' '+record.path);
    await checks.get(page)(name);
    reports.push(report);return report;
  }
  let context;
  try {
    context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block',extraHTTPHeaders:auth});
    const page=await context.newPage();
    const cold=await visit(page,'original-png-cold');
    assert(cold.entries.filter(r=>approvedSources[r.path]&&String(r.type).startsWith('image/png')).length>=5,'Approved PNGs, not unverified format substitutes, are delivered');
    const repeat=await visit(page,'original-png-repeat');
    assert(repeat.artwork304>=5,'Browser actually revalidates artwork');
    assert(repeat.artworkBytes<cold.artworkBytes*0.1,'Repeat artwork/audio transfer drops at least 90%');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('.family-splitflap-plate')?.src.includes('_Portrait_') && document.querySelector('.flight-strip-module')?.classList.contains('family-photo-mounted'));
    await page.screenshot({path:path.join(output,'loading-portrait.png'),fullPage:true});
    const sources=await page.evaluate(async entries=>{
      const results=[];
      for(const [url,expected] of entries){
        const response=await fetch(url,{headers:{Accept:'image/png'}});
        if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw new Error('Approved PNG unavailable: '+url);
        const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
        results.push({url,expected:expected.sha256,actual:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')});
      }
      return results;
    },Object.entries(approvedSources));
    for(const source of sources)assert.equal(source.actual,source.expected,source.url+' delivered approved source bytes unchanged');
    fs.writeFileSync(path.join(output,'approved-png-delivery-proof.json'),JSON.stringify(sources,null,2));
    await checks.get(page)('original PNG rotation and source verification');
    const denied=await fetch(base+'/assets/hardware/HomingBeacon_Mobile_SplitFlap_Portrait_Native_v8.png',{headers:{'If-None-Match':'*'}});
    assert.equal(denied.status,401);assert.match(denied.headers.get('cache-control'),/no-store/);
    fs.writeFileSync(path.join(output,'mobile-loading-measurements.json'),JSON.stringify(reports,null,2));
    console.log('Mobile loading proof: '+JSON.stringify(reports.map(({name,artworkBytes,artwork304,timings})=>({name,artworkBytes,artwork304,timings}))));
  } finally {if(context)await context.close();await new Promise(resolve=>server.close(resolve));}
}
module.exports={checkMobileLoading,recordResponse,assertArtworkCache};
