(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.dadRadarDisplayPowerAudio=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function createPowerAudio(options={}){
    let context=null,destroyed=false,unlocked=false,generation=-1,pending=false;
    let sources=[],state="on",lastDetent=-1;
    const enabled=()=>options.isEnabled?.()!==false;
    const volume=Math.max(0,Math.min(1,Number(options.volume??.25)));
    function stop(){sources.forEach(node=>{try{node.stop();node.disconnect();}catch(_){}});sources=[];}
    async function unlock(){
      if(destroyed||!enabled())return false;
      try{
        context=context||options.audioContextFactory?.();
        if(!context)return false;
        if(context.state==="suspended"){unlocked=false;await context.resume();}
        if(destroyed)return false;
        unlocked=context.state==="running";return unlocked;
      }catch(_){return false;}
    }
    function tone(type,hz,gain,duration,delay=0){
      const now=context.currentTime+delay,osc=context.createOscillator(),amp=context.createGain();
      osc.type=type;osc.frequency.setValueAtTime(hz,now);
      amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*volume),now+.012);
      amp.gain.setValueAtTime(Math.max(.0001,gain*volume*.7),now+duration*.65);
      amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(amp);amp.connect(context.destination);sources.push(osc);
      osc.onended=()=>{try{osc.disconnect();amp.disconnect();}catch(_){}};
      osc.start(now);osc.stop(now+duration+.03);
    }
    function impact(kind){
      // A short band-limited contact transient, without pitched oscillators.
      // Housing weight is in the low-frequency decay, not an electronic chirp.
      if(!context.createBuffer || !context.createBufferSource)return;
      const rate=context.sampleRate||44100,duration=.09;
      const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
      const cutoff=kind==="relay"?450:kind==="clock"?350:600;
      const alpha=1-Math.exp(-2*Math.PI*cutoff/rate);
      let random=0x41564c,low=0;
      for(let i=0;i<data.length;i++){
        random=(Math.imul(random,1664525)+1013904223)>>>0;
        low+=alpha*(((random/4294967296)*2-1)-low);
        const contact=low*Math.exp(-i/(rate*.012));
        const thud=Math.sin(2*Math.PI*85*i/rate)*Math.exp(-i/(rate*.018));
        data[i]=contact*.6+thud*.12;
      }
      const node=context.createBufferSource(),amp=context.createGain();
      node.buffer=buffer;amp.gain.setValueAtTime(volume,context.currentTime);
      node.connect(amp);amp.connect(context.destination);sources.push(node);
      node.onended=()=>{try{node.disconnect();amp.disconnect();}catch(_){}};
      node.start();node.stop(context.currentTime+duration);
    }
    function mechanicalCue(kind){
      if(destroyed||!unlocked||!enabled()||!["starting","stopping"].includes(state)||context?.state!=="running")return;
      const now=context.currentTime;
      if(now-lastDetent<.018)return;
      lastDetent=now;
      try{impact(kind);}catch(_){/* Audio failure cannot block a mechanism. */}
    }
    function apply(snapshot){
      state=snapshot.state;
      if(destroyed||snapshot.failed||!["starting","stopping"].includes(snapshot.state)){
        generation=snapshot.generation;pending=false;stop();return;
      }
      if(context?.state!=="running")unlocked=false;
      if(snapshot.generation===generation && (!pending||!unlocked))return;
      if(snapshot.generation!==generation){generation=snapshot.generation;stop();}
      pending=!unlocked&&["starting","stopping"].includes(snapshot.state);
      if(destroyed||!unlocked||!enabled()||snapshot.failed||!["starting","stopping"].includes(snapshot.state)||snapshot.elapsed>200)return;
      pending=false;
      try{
        impact("relay");
        if(!snapshot.reducedMotion){
          const duration=snapshot.state==="starting"?6:1.6;
          // Transformer harmonics are audible on small speakers; this is
          // tube circuitry, not a substituted map-transport gearmotor.
          tone("sine",120,.018,duration,.04);
          tone("sine",60,.035,duration,.04);
        }
      }catch(_){stop();}
    }
    return Object.freeze({unlock,apply,mechanicalCue,stop,destroy(){destroyed=true;stop();try{const closed=context?.close?.();closed?.catch?.(()=>{});}catch(_){}}});
  }
  return {createPowerAudio};
});
