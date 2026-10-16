'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'runtime/companion-assets'),manifest=require(path.join(dir,'manifest.json'));
(async()=>{
 let checked=0,maximumAlphaError=0;
 for(const [url,e] of Object.entries(manifest.entries)){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,url.slice(1)))).digest('hex'),e.sourceSha256,url+' source hash');
  if((!e.webp&&!e.png)||!url.startsWith('/assets/hardware/'))continue;
  const a=await sharp(path.join(root,url.slice(1))).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(path.join(dir,e.webp||e.png)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(b.info,a.info,url+' full native dimensions/channels');
  if(e.png){assert(a.data.equals(b.data),url+' lossless RGBA');const chunks=require('./build-companion-assets').pngChunks;const metadata=x=>chunks(x).filter(c=>c.type!=='IDAT').map(c=>c.bytes);assert.deepEqual(metadata(fs.readFileSync(path.join(root,url.slice(1)))),metadata(fs.readFileSync(path.join(dir,e.png))),url+' all original PNG metadata preserved');}
  let sum=0,squared=0,count=0;
  for(let i=0;i<a.data.length;i+=4){maximumAlphaError=Math.max(maximumAlphaError,Math.abs(a.data[i+3]-b.data[i+3]));if(a.data[i+3]>=242)for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);sum+=d;squared+=d*d;count++;}}
  assert.equal(maximumAlphaError,0,url+' alpha is lossless at every original pixel');
  if(count){assert(sum/count<3,url+' native opaque detail mean error');assert(Math.sqrt(squared/count)<6,url+' native opaque detail RMS error');}
  checked++;
 }
 assert(checked>=10,'Finished hardware is covered');
 console.log('Full-resolution encoding checks passed: '+checked+' hardware assets; every alpha value unchanged; native detail error bounded; all encoded sources hash-verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
