'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const express=require('express');
const {createDisplayFixture}=require('./display-browser-fixture');
const {createMobileGateway}=require('../server/mobile-access');
const {app}=require('../server/index');
const manifest=require('../assets/mobile-optimized/manifest.json');
const {observeBrowserErrors}=require('./browser-error-proof');
function recordResponse(request,response,records) {
  const originalPath=request.url.split('?')[0];
  response.once('finish',()=>records.push({path:originalPath,status:response.statusCode,type:response.getHeader('Content-Type')||'',bytes:response.statusCode===304?0:Number(response.getHeader('Content-Length')||0),cache:response.getHeader('Cache-Control')}));
}

async function checkMobileLoading(browser,output,engine) {
  const fixture=createDisplayFixture(),testApp=express(),records=[];
  testApp.locals.displayRevision=app.locals.displayRevision;
  // Use existing fictional API data; serve actual production HTML, middleware,
  // negotiated images and gateway. No providers or real family credentials.
  testApp.use((req,res,next)=>req.path.startsWith('/api/') ? fixture.server.emit('request',req,res) : next());
  testApp.use(app);
  const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const config={issuer:'https://fixture.cloudflareaccess.com',audience:'performance-proof',origin:'https://family.example.test',emails:['fixture@example.test']};
  const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const unsigned=`${encode({alg:'RS256',kid:'proof'})}.${encode({iss:config.issuer,aud:[config.audience],exp:Date.now()/1000+3600,email:config.emails[0]})}`;
  const token=unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
  const gateway=createMobileGateway(testApp,config,{fetchImpl:async()=>({ok:true,json:async()=>({keys:[{...publicKey.export({format:'jwk'}),kid:'proof'}]})})});
  gateway.use((_req,res)=>res.status(404).end());
  const server=gateway.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  server.prependListener('request',(req,res)=>recordResponse(req,res,records));
  const base=`http://127.0.0.1:${server.address().port}`,reports=[];
  const auth={'Cf-Access-Jwt-Assertion':token};
  const errorChecks=new WeakMap();
  async function visit(page,name) {
    if(!errorChecks.has(page))errorChecks.set(page,observeBrowserErrors(page));
    records.length=0;
    await page.goto(base+'/mobile',{waitUntil:'load'});
    await page.waitForSelector('#dashboard:not([hidden])');
    await page.waitForFunction(()=>document.querySelector('.flight-strip-module')?.classList.contains('family-photo-mounted'));
    await page.waitForFunction(()=>Array.from(document.images).every(image=>image.complete));
    await page.locator('#destination-poster').evaluate(image=>image.decode());
    await page.evaluate(()=>document.fonts.ready);
    const entries=records.slice(),art=entries.filter(r=>r.path.startsWith('/assets/') && /\.(?:png|webp|jpe?g|svg|woff2?|wav|mp3)$/i.test(r.path));
    const report={engine,name,artworkBytes:art.reduce((sum,r)=>sum+r.bytes,0),artwork304:art.filter(r=>r.status===304).length,
      webpResponses:art.filter(r=>String(r.type).startsWith('image/webp')).length,
      timings:await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd};}),entries};
    fs.writeFileSync(path.join(output,'mobile-loading-'+name+'.json'),JSON.stringify(report,null,2));
    assert.deepEqual(entries.filter(r=>r.status>=400),[],name+' has no failed production asset requests');
    for(const r of art)assert.equal(r.cache,'private, max-age=0, must-revalidate');
    for(const r of entries.filter(r=>!art.includes(r)))assert.match(r.cache,/no-store/,name+' '+r.path+' code, HTML and API data remain uncached');
    await errorChecks.get(page)(name);
    reports.push(report);return report;
  }
  try {
    const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block',extraHTTPHeaders:{...auth,Accept:'image/webp,image/png;q=0.8,*/*;q=0.1'}});
    try {
      const page=await context.newPage();
      const cold=await visit(page,'lossless-cold');assert(cold.webpResponses>=5,'Actual image requests negotiate WebP');
      const repeat=await visit(page,'lossless-repeat');
      assert(repeat.artwork304>=5,'Browser revalidates and reuses artwork');
      assert(repeat.artworkBytes<cold.artworkBytes*0.1,'Repeat artwork transfer drops at least 90%');
      await page.setViewportSize({width:390,height:844});
      await page.waitForFunction(()=>document.querySelector('.family-splitflap-plate')?.src.includes('_Portrait_') && document.querySelector('.flight-strip-module')?.classList.contains('family-photo-mounted'));
      await page.screenshot({path:path.join(output,'loading-portrait.png'),fullPage:true});
      // Compare rendered decoded pixels, not just file dimensions or source hashes.
      await context.setExtraHTTPHeaders(auth);
      const decoded=await page.evaluate(async entries=>{
        async function raster(url,accept) {
          const response=await fetch(url,{headers:{Accept:accept}});
          if(!response.ok || !response.headers.get('content-type')?.startsWith(accept))throw new Error('Incorrect negotiated raster: '+accept+' '+url);
          const blob=await response.blob(),objectUrl=URL.createObjectURL(blob),image=new Image();
          try {
            image.src=objectUrl;await image.decode();
            const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
            const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
            const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            const digest=await crypto.subtle.digest('SHA-256',rgba);
            return {width:canvas.width,height:canvas.height,hash:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')};
          } finally {URL.revokeObjectURL(objectUrl);}
        }
        const results=[];
        for(const [url,entry] of entries)results.push({url,expected:{width:entry.width,height:entry.height},png:await raster(url,'image/png'),webp:await raster(url,'image/webp')});
        return results;
      },Object.entries(manifest.entries));
      for(const result of decoded){assert.deepEqual(result.png,result.webp,result.url+' rendered RGBA matches');assert.equal(result.png.width,result.expected.width);assert.equal(result.png.height,result.expected.height);}
      fs.writeFileSync(path.join(output,'lossless-pixel-proof.json'),JSON.stringify(decoded,null,2));
      await errorChecks.get(page)('lossless pixel proof and rotation');
    } finally {await context.close();}
    const fallbackContext=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'block',extraHTTPHeaders:{...auth,Accept:'image/png,*/*;q=0.1'}});
    try {
      const fallback=await visit(await fallbackContext.newPage(),'png-fallback-cold');
      assert.equal(fallback.webpResponses,0);
      assert(reports[0].artworkBytes<fallback.artworkBytes*0.85,'Cold artwork transfer drops at least 15% without altering pixels');
    } finally {await fallbackContext.close();}
    const denied=await fetch(base+'/assets/hardware/HomingBeacon_Mobile_SplitFlap_Portrait_Native_v8.png',{headers:{'If-None-Match':'*'}});
    assert.equal(denied.status,401);assert.match(denied.headers.get('cache-control'),/no-store/);
    fs.writeFileSync(path.join(output,'mobile-loading-measurements.json'),JSON.stringify(reports,null,2));
    console.log('Mobile loading proof: '+JSON.stringify(reports.map(({name,artworkBytes,artwork304,webpResponses,timings})=>({name,artworkBytes,artwork304,webpResponses,timings}))));
  } finally {await new Promise(resolve=>server.close(resolve));}
}
module.exports={checkMobileLoading,recordResponse};
