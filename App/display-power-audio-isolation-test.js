"use strict";
const assert=require("node:assert/strict");
const {createSplitFlapAudioController}=require("./split-flap-audio");
const {createAltitudeChimeController}=require("./altitude-chime");
const {createStationIdentController}=require("./station-ident");
const {createController}=require("./map-roll-audio");
function audio(){return{plays:0,paused:true,volume:1,currentTime:0,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};}
async function run(){
  let on=false;
  const flapAudio=audio(),flap=createSplitFlapAudioController({audioFactory:()=>flapAudio,canPlay:()=>on});
  assert.equal(await flap.start(),false,"Off flaps are inaudible");assert.equal(flapAudio.plays,0);
  const chimeAudio=audio(),chime=createAltitudeChimeController({audioFactory:()=>chimeAudio,canPlay:()=>on});
  chime.observe("leg",8000);chime.observe("leg",10600);await Promise.resolve();
  assert.equal(chimeAudio.plays,0,"Off crossing is accounted for silently");
  on=true;chime.observe("leg",11000);await Promise.resolve();assert.equal(chimeAudio.plays,0,"Wake cannot replay an off-state crossing");
  await chime.play();assert.equal(chimeAudio.plays,1);chime.stop();assert(chimeAudio.paused);
  on=false;const identAudio=audio();const ident=createStationIdentController({source:"test.wav",audioFactory:()=>identAudio,
    canPlay:()=>true,isSuppressed:()=>!on,storage:{getItem(){return null;},setItem(){}},now:()=>10000});
  const state={eventId:"power-off-leg",liveData:true,livePhase:"EN_ROUTE",flight:{latitude:30,longitude:-80,positionSource:"adsb.lol",lastPositionAt:new Date(9000).toISOString()}};
  ident.observe(state);assert.equal(identAudio.plays,0);on=true;ident.observe(state);assert.equal(identAudio.plays,0,"Wake cannot replay an off-state acquisition");
  const mapAudio=audio();on=false;const map=createController({fetch:async()=>({ok:true,text:async()=>"AA=="}),audioFactory:()=>mapAudio,sources:{motor:"x",register:"y",detent:"z"},canPlay:()=>on});
  assert.equal(await map.playMotor(),false);assert.equal(await map.playRegisterClack(),false);assert.equal(mapAudio.plays,0);
  on=true;await flap.start();assert.equal(flapAudio.plays,1,"Ordinary flap sound returns without changing preferences");
  assert.equal(await map.playMotor(),true,"An enabled map controller can really play its source");assert.equal(mapAudio.plays,1);
  flap.destroy();map.destroy();ident.destroy();
  console.log("Primary local silence: flap/map suppression and no chime/ident wake replay passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
