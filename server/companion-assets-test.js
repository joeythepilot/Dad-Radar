'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const express=require('express');
async function run(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'companion-assets-'));
 fs.writeFileSync(path.join(dir,'art.webp'),'smaller artwork');
 fs.writeFileSync(path.join(dir,'code.gz'),zlib.gzipSync('original code'));
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({entries:{'/assets/test.png':{webp:'art.webp'},'/App/main.js':{gzip:'code.gz',type:'application/javascript'}}}));
 const app=express();app.use(require('./companion-assets').createCompanionAssets(dir));app.use((_q,r)=>r.type('png').send('original PNG'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const get=(route,headers)=>new Promise((resolve,reject)=>http.get(base+route,{headers},res=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));}).on('error',reject));
 try{
  const image=await get('/assets/test.png',{Accept:'image/webp,image/png;q=0.8'});assert.equal(image.headers['content-type'],'image/webp');assert.equal(image.body.toString(),'smaller artwork');assert.match(image.headers.vary,/Accept/);
  assert.equal((await get('/assets/test.png',{Accept:'image/png,image/webp;q=0'})).body.toString(),'original PNG');
  const cached=await get('/assets/test.png',{Accept:'image/webp','If-None-Match':image.headers.etag});assert.equal(cached.status,304);assert.equal(cached.body.length,0);
  assert.equal((await get('/assets/test.png',{Accept:'image/png','If-None-Match':image.headers.etag})).status,200,'Variant ETag cannot suppress original PNG');
  assert.equal((await get('/assets/test.png',{Accept:'image/webp',Range:'bytes=0-2'})).body.toString(),'original PNG','Ranges retain original server behavior');
  const code=await get('/App/main.js',{'Accept-Encoding':'gzip'});assert.equal(code.headers['content-encoding'],'gzip');assert.equal(zlib.gunzipSync(code.body).toString(),'original code');
  assert.equal((await get('/api/state',{'Accept-Encoding':'gzip'})).headers['content-encoding'],undefined,'Only built-in files are optimized');
  fs.unlinkSync(path.join(dir,'art.webp'));assert.equal((await get('/assets/test.png',{Accept:'image/webp'})).body.toString(),'original PNG','Missing derivative falls back');
  console.log('Companion asset negotiation, compression, conditional reuse, isolation and fallback passed.');
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
