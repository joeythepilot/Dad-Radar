'use strict';
const fs=require('node:fs'),path=require('node:path');
// Prebuilt files only: no image processing, calendar data or user files here.
function createCompanionAssets(directory=path.join(__dirname,'../runtime/companion-assets')){
 let entries={};try{entries=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')).entries;}catch{}
 return (req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)||req.headers.range)return next();
  const entry=entries[req.path];if(!entry)return next();
  let file,type;
  if(entry.webp){res.vary('Accept');if(req.accepts(['image/png','image/webp'])==='image/webp'){file=entry.webp;type='image/webp';}}
  if(entry.gzip){res.vary('Accept-Encoding');if(req.acceptsEncodings('gzip','identity')==='gzip'){file=entry.gzip;type=entry.type;}}
  if(!file||path.basename(file)!==file)return next();
  const absolute=path.join(directory,file);if(!fs.existsSync(absolute))return next();
  res.type(type);if(entry.gzip)res.set('Content-Encoding','gzip');
  res.sendFile(absolute,{cacheControl:false},error=>{if(error&&!res.headersSent){res.removeHeader('Content-Encoding');next();}});
 };
}
module.exports={createCompanionAssets};
