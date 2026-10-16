'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {app}=require('./index');
const manifest=require('../assets/mobile-optimized/manifest.json');
const root=path.join(__dirname,'..');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const artwork='/assets/hardware/HomingBeacon_Mobile_SplitFlap_Portrait_Native_v8.png';
  try {
    const response=await fetch(base+artwork,{headers:{Accept:'image/webp,image/png;q=0.8'}});
    assert.match(response.headers.get('content-type'),/^image\/webp/,'Supported browsers should receive the lossless smaller delivery variant');
    assert.match(response.headers.get('vary'),/Accept/i);
    const body=Buffer.from(await response.arrayBuffer());
    assert.equal(hash(body),manifest.entries[artwork].sha256);
    for(const accept of ['image/png','*/*','image/webp;q=0,image/png','image/avif,image/png']) {
      const png=await fetch(base+artwork,{headers:{Accept:accept}});
      assert.match(png.headers.get('content-type'),/^image\/png/,accept);
      assert.match(png.headers.get('vary'),/Accept/i);
      assert.equal(hash(Buffer.from(await png.arrayBuffer())),manifest.entries[artwork].sourceSha256);
    }
    const head=await fetch(base+artwork,{method:'HEAD',headers:{Accept:'image/webp'}});
    assert.match(head.headers.get('content-type'),/^image\/webp/);
    assert.equal(Number(head.headers.get('content-length')),body.length);
    assert.equal((await head.arrayBuffer()).byteLength,0);
    const conditional=await new Promise((resolve,reject)=>http.get(base+artwork,{headers:{Accept:'image/webp','If-None-Match':response.headers.get('etag')}},res=>{
      let bytes=0;res.on('data',chunk=>bytes+=chunk.length);res.on('end',()=>resolve({status:res.statusCode,bytes,headers:res.headers}));
    }).on('error',reject));
    assert.equal(conditional.status,304);assert.equal(conditional.bytes,0);assert.match(conditional.headers.vary,/Accept/i);
    for(const [original,entry] of Object.entries(manifest.entries)) {
      const source=fs.readFileSync(path.join(root,original.slice(1)));
      const variant=fs.readFileSync(path.join(root,entry.file));
      assert.equal(hash(source),entry.sourceSha256,original+' approved source is unchanged');
      assert.equal(hash(variant),entry.sha256,original+' delivery bytes are intact');
      assert.equal(source.length,entry.sourceBytes);assert.equal(variant.length,entry.bytes);
      assert(entry.bytes<entry.sourceBytes);assert(entry.width>0&&entry.height>0);
    }
    const entry=manifest.entries[artwork],saved=entry.file;
    try {
      entry.file='assets/mobile-optimized/missing-optional-copy.webp';
      const fallback=await fetch(base+artwork,{headers:{Accept:'image/webp'}});
      assert.equal(fallback.status,200);assert.match(fallback.headers.get('content-type'),/^image\/png/);
    } finally {entry.file=saved;}
  } finally {await new Promise(resolve=>server.close(resolve));}
  console.log('Lossless artwork HTTP negotiation tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
