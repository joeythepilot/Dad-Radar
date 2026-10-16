'use strict';
// Build-time encodings; originals remain the source of truth and PNG fallback.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),output=path.join(root,'runtime/companion-assets');
const version='native-q96-alpha100-budget-v2';
function withinDetailBudget(a,b){
 if(a.length!==b.length)return false;
 let sum=0,squared=0,count=0;
 for(let i=0;i<a.length;i+=4){
  if(a[i+3]!==b[i+3])return false;
  if(a[i+3]>=242)for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);sum+=d;squared+=d*d;count++;}
 }
 return !count||(sum/count<3&&Math.sqrt(squared/count)<6);
}
async function build(){
 const sharp=require('sharp');fs.mkdirSync(output,{recursive:true});
 const entries={},sources=[],skipped=[];
 for(const folder of ['assets','App','UI','Mobile','config','data','models','services']){
  for(const name of fs.readdirSync(path.join(root,folder),{recursive:true})){
   const relative=folder+'/'+name.split(path.sep).join('/'),file=path.join(root,relative);
   if(!fs.statSync(file).isFile())continue;
   const image=/\.(png|jpe?g)$/i.test(relative),text=/\.(js|css|svg)$/i.test(relative);
   if((image||text)&&fs.statSync(file).size>=8192)sources.push({relative,file,image});
  }
 }
 let cursor=0,sourceBytes=0,encodedBytes=0;
 async function worker(){while(cursor<sources.length){
  const {relative,file,image}=sources[cursor++],bytes=fs.readFileSync(file),url='/'+relative;
  // WebKit's lossy decode of these transparent physical renders exceeded the
  // browser display-error budget. Preserve them with lossless encoding.
  const nativePlate=/HomingBeacon_Mobile_SplitFlap_(Landscape|Portrait)_Native_v8\.png$/.test(relative);
  const hash=crypto.createHash('sha256').update(version+(nativePlate?'-lossless-native8':'')).update(bytes).digest('hex');
  const ext=image?'webp':'gz',name=hash+'.'+ext,target=path.join(output,name);
  if(!fs.existsSync(target)){
   let encoded;try{
    encoded=image?await sharp(bytes).webp(nativePlate?{lossless:true,exact:true,effort:4}:{quality:96,alphaQuality:100,effort:4}).toBuffer():zlib.gzipSync(bytes,{level:9});
    if(image){const original=await sharp(bytes).ensureAlpha().raw().toBuffer(),decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
     if(!withinDetailBudget(original,decoded))encoded=await sharp(bytes).webp({lossless:true,exact:true,effort:4}).toBuffer();
    }
   }catch(error){
    // Existing poster loader already handles unavailable destination artwork.
    // Preserve that original path; never manufacture a replacement poster.
    if(relative.startsWith('assets/destinations/')){skipped.push(relative);continue;}
    throw new Error(relative+': '+error.message);
   }
   fs.writeFileSync(target,encoded);
  }
  const size=fs.statSync(target).size;
  if(size>=bytes.length)continue;
  const entry={sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,bytes:size};
  if(image){entry.webp=name;const meta=await sharp(bytes).metadata();entry.width=meta.width;entry.height=meta.height;}
  else{entry.gzip=name;entry.type=relative.endsWith('.svg')?'image/svg+xml':relative.endsWith('.css')?'text/css':'application/javascript';}
  entries[url]=entry;sourceBytes+=bytes.length;encodedBytes+=size;
 }}
 await Promise.all([worker(),worker()]);
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version,entries,skipped}));
 if(skipped.length)console.warn('Original poster fallback retained for undecodable sources: '+skipped.join(', '));
 console.log('Built companion encodings: '+Object.keys(entries).length+' built-in files; '+sourceBytes+' -> '+encodedBytes+' bytes; original dimensions retained.');
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build};
