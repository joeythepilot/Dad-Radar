'use strict';
const assert=require('node:assert/strict'),express=require('express');
const {recordResponse,assertArtworkCache}=require('./mobile-loading-browser-proof');
(async()=>{
  const app=express(),router=express.Router(),records=[];
  router.get('/fixture.png',(_req,res)=>res.type('png').send('fixture artwork'));
  app.use('/assets',router);
  const server=app.listen(0,'127.0.0.1');
  server.prependListener('request',(req,res)=>recordResponse(req,res,records));
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}/assets/fixture.png?v=1`);
    await response.arrayBuffer();
    assert.equal(records.length,1);
    assert.equal(records[0].path,'/assets/fixture.png','Measure original request path, not the mounted router remainder');
    assert.equal(records[0].bytes,Buffer.byteLength('fixture artwork'));
    assert.equal(records[0].status,200);
    assert.doesNotThrow(()=>assertArtworkCache({path:'/assets/audio/split-flap.mp3',status:206,cache:'private, no-store'}),'Partial audio stays no-store; it is not a complete reusable artwork response');
    assert.throws(()=>assertArtworkCache({path:'/assets/audio/split-flap.mp3',status:206,cache:'public, max-age=3600'}));
    assert.throws(()=>assertArtworkCache({path:'/assets/ui/art.png',status:200,cache:'private, no-store'}),'A complete built-in image must actually support private reuse');
  } finally {await new Promise(resolve=>server.close(resolve));}
  console.log('Real mounted-router loading recorder regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
