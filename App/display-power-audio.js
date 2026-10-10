(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.dadRadarDisplayPowerAudio=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function createPowerAudio(options={}){
    let context=null,destroyed=false,unlocked=false,generation=-1,pending=false;
    let sources=[],hum=[],state="on",lastDetent=-1,samples=options.samples||{},loading=null;
    const enabled=()=>options.isEnabled?.()!==false;
    const volume=Math.max(0,Math.min(1,Number(options.volume??.25)));
    function stopContacts(){sources.forEach(node=>{try{node.stop();node.disconnect();}catch(_){}});sources=[];}
    function stopHum(){hum.forEach(({node,amp})=>{try{node.stop();node.disconnect();amp.disconnect();}catch(_){}});hum=[];}
    function stop(){stopContacts();stopHum();}
    async function unlock(){
      if(destroyed||!enabled())return false;
      try{
        context=context||options.audioContextFactory?.();
        if(!context)return false;
        if(context.state==="suspended"){unlocked=false;await context.resume();}
        if(destroyed)return false;
        if(options.loadSamples){
          loading=loading||Promise.resolve(options.loadSamples(context));
          samples=await loading;
          if(destroyed)return false;
        }
        unlocked=context.state==="running";return unlocked;
      }catch(_){return false;}
    }
    function impact(kind){
      const buffer=kind==="toggle"?samples?.toggle:samples?.relay;
      if(!buffer || !context.createBufferSource)return;
      const node=context.createBufferSource(),amp=context.createGain();
      node.buffer=buffer;
      // Recordings retain natural contact/housing decay. No generated noise,
      // pitch oscillators, time stretching or synthesized detent fallback.
      const level=kind==="toggle"?.8:kind==="clock"?.32:.46;
      amp.gain.setValueAtTime(volume*level,context.currentTime);
      node.connect(amp);amp.connect(context.destination);sources.push(node);
      node.onended=()=>{try{node.disconnect();amp.disconnect();}catch(_){}};
      node.start();node.stop(context.currentTime+buffer.duration);
    }
    function mechanicalCue(kind){
      if(destroyed||!unlocked||!enabled()||!["starting","stopping"].includes(state)||context?.state!=="running")return;
      const now=context.currentTime;
      if(now-lastDetent<.018)return;
      lastDetent=now;
      try{impact(kind);}catch(_){/* Audio failure cannot block a mechanism. */}
    }
    function tubeHum(snapshot){
      if(snapshot.reducedMotion || !context.createOscillator)return;
      const now=context.currentTime,seconds=Math.max(.2,Number(snapshot.duration||24000)/1000);
      if(snapshot.state==="stopping"){
        hum.forEach(({node,amp,level})=>{
          amp.gain.cancelScheduledValues(now);
          amp.gain.setValueAtTime(volume*level,now);
          amp.gain.linearRampToValueAtTime(.0001,now+seconds*.7);
          node.stop(now+seconds);
        });
        return;
      }
      stopHum();
      // Low heater/transformer envelope, separate from the recorded contacts.
      // No high-frequency whine and no oscillator is used to fabricate clicks.
      for(const [hz,level] of [[60,.065],[120,.025]]){
        const node=context.createOscillator(),amp=context.createGain();
        node.type="sine";node.frequency.setValueAtTime(hz,now);
        amp.gain.setValueAtTime(.0001,now);
        amp.gain.linearRampToValueAtTime(volume*level,now+seconds*.38);
        node.connect(amp);amp.connect(context.destination);hum.push({node,amp,level});
        node.onended=()=>{try{node.disconnect();amp.disconnect();}catch(_){}};
        node.start();
      }
    }
    function apply(snapshot){
      state=snapshot.state;
      if(destroyed||snapshot.failed||!enabled()||context?.state==="suspended"||snapshot.state==="off"){
        generation=snapshot.generation;pending=false;stop();return;
      }
      if(snapshot.state==="on"){generation=snapshot.generation;pending=false;stopContacts();return;}
      if(context?.state!=="running")unlocked=false;
      if(snapshot.generation===generation && (!pending||!unlocked))return;
      if(snapshot.generation!==generation){generation=snapshot.generation;stopContacts();}
      pending=!unlocked&&["starting","stopping"].includes(snapshot.state);
      if(destroyed||!unlocked||!enabled()||snapshot.failed||!["starting","stopping"].includes(snapshot.state)||snapshot.elapsed>200)return;
      pending=false;
      try{
        impact("toggle");
        tubeHum(snapshot);
      }catch(_){stop();}
    }
    return Object.freeze({unlock,apply,mechanicalCue,stop,destroy(){destroyed=true;stop();try{const closed=context?.close?.();closed?.catch?.(()=>{});}catch(_){}}});
  }
  return {createPowerAudio};
});
