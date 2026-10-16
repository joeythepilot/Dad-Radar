'use strict';
const fs=require('node:fs'),path=require('node:path');
// Prebuilt files only: no image processing, calendar data or user files here.
function createCompanionAssets(directory=path.join(__dirname,'../runtime/companion-assets')){
 let entries={};try{entries=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')).entries;}catch{}
 return (req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)||req.headers.range)return next();
  const entry=entries[req.path];if(!entry)return next();
  res.vary('X-DadRadar-Original');
  if(req.get('X-DadRadar-Original')==='1')return next();
  let file,type;
  if(entry.webp){res.vary('Accept');if(req.accepts(['image/png','image/webp'])==='image/webp'){file=entry.webp;type='image/webp';}}
  if(entry.png){res.vary('Accept');if(req.accepts('image/png')){file=entry.png;type='image/png';}}
  let encoding;
  if(entry.gzip){res.vary('Accept-Encoding');encoding=req.acceptsEncodings(...(entry.br?['br','gzip','identity']:['gzip','identity']));if(encoding==='gzip'||encoding==='br'){file=encoding==='br'?entry.br:entry.gzip;type=entry.type;}}
  if(!file||path.basename(file)!==file)return next();
  const absolute=path.join(directory,file);if(!fs.existsSync(absolute))return next();
  res.type(type);if(encoding==='gzip'||encoding==='br')res.set('Content-Encoding',encoding);
  res.sendFile(absolute,{cacheControl:false},error=>{if(error&&!res.headersSent){res.removeHeader('Content-Encoding');next();}});
 };
}
module.exports={createCompanionAssets};
