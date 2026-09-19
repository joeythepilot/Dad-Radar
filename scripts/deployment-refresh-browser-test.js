"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const {chromium} = require('playwright');
const script = fs.readFileSync(require('node:path').join(__dirname,'../App/deployment-refresh.js'),'utf8');
let instance='a', version='sha-a', available=true, pageLoads=0;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/api/health'){
    res.writeHead(available?200:503,{'Content-Type':'application/json'});
    res.end(JSON.stringify(available?{instanceId:instance,version}:{}));return;
  }
  if(url.pathname==='/App/deployment-refresh.js'){
    res.setHeader('Content-Type','application/javascript');res.end(script);return;
  }
  pageLoads++;
  res.setHeader('Content-Type','text/html');
  res.end(`<html><head><meta name="dad-radar-instance" content="${instance}"><meta name="dad-radar-version" content="${version}"><script defer src="/App/deployment-refresh.js"></script></head><body><p>${version}</p><script>throw new Error('simulated unrelated UI failure')</script></body></html>`);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,...(process.env.DADRADAR_BROWSER_EXECUTABLE?{executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}:{})});
  try {
    for(const route of ['/?screen=kiosk#display','/mobile/full?layout=full#map','/mobile?layout=compact']){
      const page=await browser.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
      await page.waitForFunction(()=>!!window.dadRadarDeploymentRefresh);
      const old=new URL(page.url()), loaded=pageLoads;
      available=false;
      await page.evaluate(()=>window.dispatchEvent(new Event('online')));
      await page.waitForTimeout(100);
      assert.equal(pageLoads,loaded,'No reload while server is down');
      instance+='b';version+='b';available=true;
      // First case waits for the normal 10-second timer; others simulate waking.
      if(route!=='/?screen=kiosk#display')await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
      await page.waitForURL(u=>u.searchParams.get('_dadRadarDeployment')===version,{timeout:15000});
      await page.waitForFunction(v=>document.querySelector('p').textContent===v,version);
      const current=new URL(page.url());
      assert.equal(current.pathname,old.pathname);assert.equal(current.hash,old.hash);
      for(const [key,value] of old.searchParams)assert.equal(current.searchParams.get(key),value);
      const settled=pageLoads;
      await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('online'));});
      await page.waitForTimeout(150);
      assert.equal(pageLoads,settled,'New page does not enter a reload loop');
      await page.close();
    }
    console.log('Deployment browser checks passed: automatic timer, offline recovery, wake, independent startup, routes and no reload loops.');
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
