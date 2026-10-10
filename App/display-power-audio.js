(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.dadRadarDisplayPowerAudio=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function createPowerAudio(options={}){
    let context=null,destroyed=false,unlocked=false,generation=-1,pending=false;
    let sources=[];
    const enabled=()=>options.isEnabled?.()!==false;
    const volume=Math.max(0,Math.min(1,Number(options.volume??.25)));
    function stop(){sources.forEach(node=>{try{node.stop();node.disconnect();}catch(_){}});sources=[];}
    async function unlock(){
      if(destroyed||!enabled())return false;
      try{
        context=context||options.audioContextFactory?.();
        if(!context)return false;
        if(context.state==="suspended")await context.resume();
        if(destroyed)return false;
        unlocked=true;return true;
      }catch(_){return false;}
    }
    function tone(type,hz,gain,duration){
      const now=context.currentTime,osc=context.createOscillator(),amp=context.createGain();
      osc.type=type;osc.frequency.setValueAtTime(hz,now);
      amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*volume),now+.012);
      amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(amp);amp.connect(context.destination);sources.push(osc);
      osc.onended=()=>{try{osc.disconnect();amp.disconnect();}catch(_){}};
      osc.start(now);osc.stop(now+duration+.03);
    }
    function apply(snapshot){
      if(snapshot.generation===generation && (!pending||!unlocked))return;
      if(snapshot.generation!==generation){generation=snapshot.generation;stop();}
      pending=!unlocked&&["starting","stopping"].includes(snapshot.state);
      if(destroyed||!unlocked||!enabled()||snapshot.failed||!["starting","stopping"].includes(snapshot.state)||snapshot.elapsed>200)return;
      pending=false;
      try{
        // Provisional synthesized relay/tube envelope for audition. No map
        // gearmotor, sample download, preference write or visual dependency.
        tone("triangle",snapshot.state==="starting"?165:130,.12,.065);
        tone("sine",60,.045,snapshot.state==="starting"?1.8:.5);
      }catch(_){stop();}
    }
    return Object.freeze({unlock,apply,stop,destroy(){destroyed=true;stop();try{const closed=context?.close?.();closed?.catch?.(()=>{});}catch(_){}}});
  }
  return {createPowerAudio};
});
