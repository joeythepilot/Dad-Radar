(function initializeWeeklyTicker(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarWeeklyTicker = Object.freeze(api);
    if (root.document) api.install(root);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createWeeklyTickerApi() {
    "use strict";

    function toDate(value) {
      if (value === null || value === undefined || value === "") return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    function startOf(event) { return toDate(event?.times?.startUtc ?? event?.startUtc); }
    function endOf(event) { return toDate(event?.times?.endUtc ?? event?.endUtc); }

    function usable(event) { return event && event.status !== "cancelled" && startOf(event) && endOf(event); }
    function sorted(events) { return (Array.isArray(events) ? events : []).filter(usable).slice().sort((a,b)=>startOf(a)-startOf(b)); }

    function shiftKey(key, days) {
      const match = String(key ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match) return null;
      const date = new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])+Number(days||0),12));
      return [String(date.getUTCFullYear()).padStart(4,"0"),String(date.getUTCMonth()+1).padStart(2,"0"),String(date.getUTCDate()).padStart(2,"0")].join("-");
    }

    function weekdayForKey(key) {
      const date = toDate(`${key}T12:00:00.000Z`);
      return date ? new Intl.DateTimeFormat("en-US",{timeZone:"UTC",weekday:"short"}).format(date).toUpperCase() : "---";
    }

    const OVERNIGHT_MODULE_COUNT = 7;
    const OPERATIONAL_DAY_ROLLOVER_HOUR = 6;
    const MODULE_DESIGN_WIDTH = 149;
    const MODULE_DESIGN_HEIGHT = 122;
    const MODULE_ASSET = "/assets/hardware/weekly-overnight/weekly-overnight-module.png?v=original-hq-ac97916a";
    const DAY_WINDOW = Object.freeze({x:10,y:8,width:129,height:42});
    const WHEEL_WINDOWS = Object.freeze([
      Object.freeze({x:14,y:57,width:27,height:50}),
      Object.freeze({x:46,y:57,width:26,height:50}),
      Object.freeze({x:77,y:57,width:27,height:50}),
      Object.freeze({x:109,y:57,width:26,height:50})
    ]);
    const WHEEL_ALPHABET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
    const DAY_ANIMATION_MS = 360;
    const WHEEL_ANIMATION_MS = 760;
    const WHEEL_STAGGER_MS = 55;
    const ROLLOVER_BAY_STAGGER_MS = 58;

    function localDateParts(value, timeZone) {
      const date=toDate(value);
      if(!date)return null;
      const parts=new Intl.DateTimeFormat("en-US",{
        timeZone,year:"numeric",month:"2-digit",day:"2-digit",
        hour:"2-digit",hour12:false
      }).formatToParts(date);
      const get=type=>parts.find(part=>part.type===type)?.value??"";
      return {
        key:[get("year"),get("month"),get("day")].join("-"),
        hour:Number(get("hour"))%24
      };
    }

    function operationalDateKey(value, timeZone, rolloverHour=OPERATIONAL_DAY_ROLLOVER_HOUR) {
      const local=localDateParts(value,timeZone);
      if(!local)return null;
      return local.hour<rolloverHour ? shiftKey(local.key,-1) : local.key;
    }

    function normalizeOvernightCode(value, homeAirport="AVL") {
      const code=String(value??"").trim().toUpperCase();
      if(!code || code===String(homeAirport??"AVL").trim().toUpperCase() || code==="HOME")return "HOME";
      return code.replace(/[^A-Z0-9]/g,"").slice(0,3) || "HOME";
    }

    function overnightCharacters(value) {
      const code=String(value??"HOME").toUpperCase();
      if(code==="HOME")return ["H","O","M","E"];
      const chars=code.slice(0,3).split("");
      while(chars.length<4)chars.push(" ");
      return chars.slice(0,4);
    }

    function buildWeeklyOvernightModules(schedule, providedOptions={}) {
      const options={
        homeAirport:providedOptions.homeAirport??"AVL",
        timeZone:providedOptions.timeZone??"America/New_York"
      };
      const now=toDate(providedOptions.now)??new Date();
      const todayKey=operationalDateKey(now,options.timeZone,OPERATIONAL_DAY_ROLLOVER_HOUR);
      const modules=Array.from({length:OVERNIGHT_MODULE_COUNT},(_,index)=>{
        const key=shiftKey(todayKey,index);
        return {key,day:weekdayForKey(key),code:"HOME",characters:overnightCharacters("HOME")};
      });
      const byKey=new Map(modules.map(module=>[module.key,module]));

      sorted(schedule?.events)
        .filter(event=>event.kind==="layover")
        .forEach(layover=>{
          const airport=normalizeOvernightCode(layover.airport,options.homeAirport);
          if(airport==="HOME")return;
          const start=startOf(layover),end=endOf(layover);
          if(!start||!end)return;
          const startKey=operationalDateKey(start,options.timeZone,OPERATIONAL_DAY_ROLLOVER_HOUR);
          const duration=Math.max(0,end-start);
          const overnightCount=Math.max(1,Math.ceil(duration/(24*60*60*1000)));
          for(let index=0;index<overnightCount;index+=1){
            const key=shiftKey(startKey,index);
            const module=byKey.get(key);
            if(module){
              module.code=airport;
              module.characters=overnightCharacters(airport);
            }
          }
        });

      return modules;
    }

    function forwardWheelSequence(from,to) {
      const normalizedFrom=WHEEL_ALPHABET.includes(from)?from:" ";
      const normalizedTo=WHEEL_ALPHABET.includes(to)?to:" ";
      if(normalizedFrom===normalizedTo)return [normalizedTo];
      const fromIndex=WHEEL_ALPHABET.indexOf(normalizedFrom);
      const toIndex=WHEEL_ALPHABET.indexOf(normalizedTo);
      const distance=(toIndex-fromIndex+WHEEL_ALPHABET.length)%WHEEL_ALPHABET.length;
      if(distance<=9){
        const sequence=[normalizedFrom];
        for(let step=1;step<=distance;step+=1){
          sequence.push(WHEEL_ALPHABET[(fromIndex+step)%WHEEL_ALPHABET.length]);
        }
        return sequence;
      }
      const sequence=[normalizedFrom];
      const samples=4;
      for(let sample=1;sample<samples;sample+=1){
        const step=Math.max(1,Math.round(distance*sample/samples));
        sequence.push(WHEEL_ALPHABET[(fromIndex+step)%WHEEL_ALPHABET.length]);
      }
      sequence.push(normalizedTo);
      return sequence;
    }

    function easeInOut(value) {
      const t=Math.min(1,Math.max(0,value));
      return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    }

    function install(root) {
      const stack=root.document.querySelector(".center-map-stack");
      if(!stack || stack.querySelector("#weekly-overnight-bank"))return null;

      if(!root.document.querySelector("link[data-dad-radar-weekly-ticker]")){
        const link=root.document.createElement("link");
        link.rel="stylesheet";
        link.href="/UI/weekly-ticker-layout.css?v=11-warm-light";
        link.dataset.dadRadarWeeklyTicker="true";
        root.document.head.appendChild(link);
      }

      const bank=root.document.createElement("section");
      bank.className="weekly-overnight-bank";
      bank.id="weekly-overnight-bank";
      bank.setAttribute("aria-label","Seven-day overnight schedule");

      const bays=[];
      for(let index=0;index<OVERNIGHT_MODULE_COUNT;index+=1){
        const bay=root.document.createElement("div");
        bay.className="weekly-overnight-bay";
        bay.dataset.index=String(index);

        const image=root.document.createElement("img");
        image.className="weekly-overnight-module-art";
        image.src=MODULE_ASSET;
        image.alt="";
        image.setAttribute("aria-hidden","true");
        image.setAttribute("draggable","false");

        const canvas=root.document.createElement("canvas");
        canvas.className="weekly-overnight-module-canvas";
        canvas.width=MODULE_DESIGN_WIDTH;
        canvas.height=MODULE_DESIGN_HEIGHT;
        canvas.setAttribute("aria-hidden","true");

        bay.append(image,canvas);
        bank.appendChild(bay);

        bays.push({
          element:bay,
          canvas,
          context:canvas.getContext("2d",{alpha:true}),
          day:"---",
          characters:[" "," "," "," "],
          dayAnimation:null,
          wheelAnimations:[null,null,null,null]
        });
      }
      stack.appendChild(bank);

      let currentModules=null;
      let currentOperationalKey=null;
      let animationFrame=null;
      let destroyed=false;
      let lastScheduleFetchAt=0;
      let fetchRequest=null;
      let rolloverPoll=null;
      let refreshInterval=null;
      let audioContext=null;

      function ensureAudio() {
        const AudioContext=root.AudioContext;
        if(!AudioContext)return null;
        if(!audioContext)audioContext=new AudioContext();
        if(audioContext.state==="suspended"){
          const resumed=audioContext.resume();
          if(resumed?.catch)resumed.catch(()=>{});
        }
        return audioContext;
      }

      function playMotor(durationMs) {
        const context=audioContext;
        if(!context || context.state!=="running")return;
        const now=context.currentTime;
        const oscillator=context.createOscillator();
        const gain=context.createGain();
        const filter=context.createBiquadFilter();
        oscillator.type="sawtooth";
        oscillator.frequency.setValueAtTime(72,now);
        oscillator.frequency.linearRampToValueAtTime(58,now+durationMs/1000);
        filter.type="lowpass";
        filter.frequency.setValueAtTime(420,now);
        gain.gain.setValueAtTime(0.0001,now);
        gain.gain.exponentialRampToValueAtTime(0.012,now+0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001,now+durationMs/1000);
        oscillator.connect(filter);filter.connect(gain);gain.connect(context.destination);
        oscillator.start(now);oscillator.stop(now+durationMs/1000+0.03);
      }

      function playDetent(delayMs=0,pitch=210) {
        const context=audioContext;
        if(!context || context.state!=="running")return;
        const start=context.currentTime+Math.max(0,delayMs)/1000;
        const oscillator=context.createOscillator();
        const gain=context.createGain();
        oscillator.type="square";
        oscillator.frequency.setValueAtTime(pitch,start);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(70,pitch*0.55),start+0.035);
        gain.gain.setValueAtTime(0.0001,start);
        gain.gain.exponentialRampToValueAtTime(0.028,start+0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001,start+0.05);
        oscillator.connect(gain);gain.connect(context.destination);
        oscillator.start(start);oscillator.stop(start+0.06);
      }

      const unlockAudio=()=>{ensureAudio();};
      root.addEventListener("pointerdown",unlockAudio,{passive:true});

      function drawText(context,text,x,y,font,fill,scaleY=1,alpha=1) {
        if(scaleY<=0.01 || alpha<=0.01)return;
        context.save();
        context.globalAlpha=alpha;
        context.translate(x,y);
        context.scale(1,scaleY);
        context.fillStyle=fill;
        context.font=font;
        context.textAlign="center";
        context.textBaseline="middle";
        context.fillText(text,0,0);
        context.restore();
      }

      function drawDay(bay,now) {
        const context=bay.context;
        const rect=DAY_WINDOW;
        context.save();
        context.beginPath();
        context.rect(rect.x,rect.y,rect.width,rect.height);
        context.clip();

        const animation=bay.dayAnimation;
        if(!animation || now>=animation.start+animation.duration){
          if(animation){
            bay.day=animation.to;
            bay.dayAnimation=null;
          }
          drawText(context,bay.day,rect.x+rect.width/2,rect.y+rect.height/2+1,
            '700 24px "Courier New", monospace',"#3b2b1d");
          context.restore();
          return;
        }
        if(now<animation.start){
          drawText(context,animation.from,rect.x+rect.width/2,rect.y+rect.height/2+1,
            '700 24px "Courier New", monospace',"#3b2b1d");
          context.restore();
          return;
        }

        const progress=easeInOut((now-animation.start)/animation.duration);
        const outgoingScale=Math.max(0.06,Math.cos(progress*Math.PI/2));
        const incomingScale=Math.max(0.06,Math.sin(progress*Math.PI/2));
        drawText(context,animation.from,rect.x+rect.width/2,
          rect.y+rect.height/2+progress*rect.height*0.42,
          '700 24px "Courier New", monospace',"#3b2b1d",outgoingScale,1-progress*0.35);
        drawText(context,animation.to,rect.x+rect.width/2,
          rect.y+rect.height/2-(1-progress)*rect.height*0.42,
          '700 24px "Courier New", monospace',"#3b2b1d",incomingScale,0.65+progress*0.35);
        context.restore();
      }

      function drawWheelFace(context,rect,character,angle) {
        const scale=Math.max(0.055,Math.cos(angle));
        const yOffset=Math.sin(angle)*rect.height*0.34;
        const alpha=0.55+0.45*scale;
        context.save();
        context.beginPath();
        context.rect(rect.x,rect.y,rect.width,rect.height);
        context.clip();
        drawText(context,character,rect.x+rect.width/2,rect.y+rect.height/2+yOffset,
          '700 22px "Arial Narrow", "Helvetica Neue", sans-serif',"#eee0bb",scale,alpha);
        context.restore();
      }

      function drawWheel(bay,index,now) {
        const context=bay.context;
        const rect=WHEEL_WINDOWS[index];
        const animation=bay.wheelAnimations[index];
        if(!animation || now>=animation.start+animation.duration){
          if(animation){
            bay.characters[index]=animation.to;
            bay.wheelAnimations[index]=null;
          }
          drawWheelFace(context,rect,bay.characters[index],0);
          return;
        }
        if(now<animation.start){
          drawWheelFace(context,rect,animation.from,0);
          return;
        }

        const progress=easeInOut((now-animation.start)/animation.duration);
        const sequence=animation.sequence;
        const travel=progress*(sequence.length-1);
        const step=Math.min(sequence.length-2,Math.floor(travel));
        const fraction=travel-step;
        const current=sequence[step];
        const next=sequence[Math.min(sequence.length-1,step+1)];
        drawWheelFace(context,rect,current,fraction*Math.PI/2);
        drawWheelFace(context,rect,next,-Math.PI/2+fraction*Math.PI/2);
      }

      function drawBay(bay,now) {
        if(!bay.context)return;
        // Keep the approved 149x122 drawing coordinates, but rasterize text
        // at display resolution (at least 2x for smooth small letter edges).
        const rect=bay.canvas.getBoundingClientRect();
        const density=Math.max(2,Number(root.devicePixelRatio)||1);
        const width=Math.ceil((rect.width||MODULE_DESIGN_WIDTH)*density);
        const height=Math.ceil((rect.height||MODULE_DESIGN_HEIGHT)*density);
        if(bay.canvas.width!==width || bay.canvas.height!==height){
          bay.canvas.width=width;
          bay.canvas.height=height;
        }
        bay.context.setTransform(width/MODULE_DESIGN_WIDTH,0,0,height/MODULE_DESIGN_HEIGHT,0,0);
        bay.context.clearRect(0,0,MODULE_DESIGN_WIDTH,MODULE_DESIGN_HEIGHT);
        drawDay(bay,now);
        for(let index=0;index<4;index+=1)drawWheel(bay,index,now);
      }

      function hasActiveAnimation(now) {
        return bays.some(bay=>
          (bay.dayAnimation && now<bay.dayAnimation.start+bay.dayAnimation.duration) ||
          bay.wheelAnimations.some(animation=>animation && now<animation.start+animation.duration)
        );
      }

      function renderAnimations(now) {
        animationFrame=null;
        bays.forEach(bay=>drawBay(bay,now));
        const active=!destroyed && hasActiveAnimation(now);
        bank.dataset.animating=active ? "true" : "false";
        if(active){
          animationFrame=root.requestAnimationFrame(renderAnimations);
        }
      }

      function requestAnimationRender() {
        if(!destroyed && animationFrame===null){
          animationFrame=root.requestAnimationFrame(renderAnimations);
        }
      }

      // Redraw settled text too when layout, browser zoom or display density changes.
      const resizeObserver=root.ResizeObserver ? new root.ResizeObserver(requestAnimationRender) : null;
      resizeObserver?.observe(bank);
      root.addEventListener("resize",requestAnimationRender);

      function setModules(nextModules,{animate=true,rollover=false}={}) {
        if(!Array.isArray(nextModules)||nextModules.length!==OVERNIGHT_MODULE_COUNT)return;
        const now=root.performance?.now?.()??Date.now();
        let anyMotion=false;
        let maxEnd=0;

        nextModules.forEach((module,index)=>{
          const bay=bays[index];
          const oldModule=currentModules?.[index]??null;
          const oldDay=oldModule?.day??module.day;
          const oldCharacters=oldModule?.characters??module.characters;
          const dayChanged=oldDay!==module.day;

          bay.element.setAttribute("aria-label",
            module.day+" overnight "+(module.code==="HOME"?"home":module.code));

          if(!currentModules || !animate){
            bay.day=module.day;
            bay.characters=module.characters.slice();
            bay.dayAnimation=null;
            bay.wheelAnimations=[null,null,null,null];
            drawBay(bay,now);
            return;
          }

          if(dayChanged){
            const delay=rollover?index*ROLLOVER_BAY_STAGGER_MS:0;
            bay.dayAnimation={from:oldDay,to:module.day,start:now+delay,duration:DAY_ANIMATION_MS};
            anyMotion=true;
            maxEnd=Math.max(maxEnd,delay+DAY_ANIMATION_MS);
            if(rollover)playDetent(delay+DAY_ANIMATION_MS,175+index*5);
          } else {
            bay.day=module.day;
            bay.dayAnimation=null;
          }

          for(let wheelIndex=0;wheelIndex<4;wheelIndex+=1){
            const from=oldCharacters[wheelIndex]??" ";
            const to=module.characters[wheelIndex]??" ";
            if(from===to){
              bay.characters[wheelIndex]=to;
              bay.wheelAnimations[wheelIndex]=null;
              continue;
            }
            const delay=(rollover?430+index*28:0)+wheelIndex*WHEEL_STAGGER_MS;
            bay.wheelAnimations[wheelIndex]={
              from,to,sequence:forwardWheelSequence(from,to),
              start:now+delay,duration:WHEEL_ANIMATION_MS
            };
            anyMotion=true;
            maxEnd=Math.max(maxEnd,delay+WHEEL_ANIMATION_MS);
            playDetent(delay+WHEEL_ANIMATION_MS,225+wheelIndex*12);
          }
        });

        currentModules=nextModules.map(module=>({
          ...module,
          characters:module.characters.slice()
        }));

        if(anyMotion){
          bank.dataset.animating="true";
          playMotor(Math.min(1300,Math.max(520,maxEnd)));
          requestAnimationRender();
        } else {
          bank.dataset.animating="false";
          bays.forEach(bay=>drawBay(bay,now));
        }
      }

      async function refreshSchedule(force=false) {
        const now=Date.now();
        if(fetchRequest)return fetchRequest;
        if(!force && now-lastScheduleFetchAt<30000)return null;
        lastScheduleFetchAt=now;
        fetchRequest=(async()=>{
          try{
            const response=await root.fetch("/api/calendar/upcoming",{cache:"no-store"});
            const data=await response.json();
            if(!response.ok || !data?.events)throw new Error("Schedule unavailable");
            const timeZone=root.dadRadarSettings?.displayTimeZone??"America/New_York";
            const operationalKey=operationalDateKey(new Date(),timeZone,OPERATIONAL_DAY_ROLLOVER_HOUR);
            const nextModules=buildWeeklyOvernightModules(data,{
              homeAirport:root.dadRadarSettings?.homeAirport??"AVL",
              timeZone,
              now:new Date()
            });
            const rollover=currentOperationalKey!==null && operationalKey!==currentOperationalKey;
            setModules(nextModules,{animate:currentModules!==null,rollover});
            currentOperationalKey=operationalKey;
          }catch(_error){}
          finally{fetchRequest=null;}
        })();
        return fetchRequest;
      }

      root.addEventListener("dad-radar:calendar-sync",event=>{
        if(event.detail?.ok)void refreshSchedule(false);
      });

      void refreshSchedule(true);
      const refreshMs=Math.max(60000,Number(root.dadRadarSettings?.schedule?.refreshIntervalMs)||300000);
      refreshInterval=root.setInterval(()=>void refreshSchedule(true),refreshMs);
      rolloverPoll=root.setInterval(()=>{
        const timeZone=root.dadRadarSettings?.displayTimeZone??"America/New_York";
        const nextKey=operationalDateKey(new Date(),timeZone,OPERATIONAL_DAY_ROLLOVER_HOUR);
        if(currentOperationalKey!==null && nextKey!==currentOperationalKey)void refreshSchedule(true);
      },30000);

      const controller=Object.freeze({
        refreshSchedule,
        setModules,
        destroy(){
          destroyed=true;
          root.removeEventListener("pointerdown",unlockAudio);
          root.removeEventListener("resize",requestAnimationRender);
          resizeObserver?.disconnect();
          if(refreshInterval!==null)root.clearInterval(refreshInterval);
          if(rolloverPoll!==null)root.clearInterval(rolloverPoll);
          if(animationFrame!==null)root.cancelAnimationFrame(animationFrame);
          if(audioContext?.close)audioContext.close().catch(()=>{});
        }
      });
      bank.dadRadarWeeklyOvernight=controller;
      return controller;
    }

    return {
      install,
      OVERNIGHT_MODULE_COUNT,OPERATIONAL_DAY_ROLLOVER_HOUR,MODULE_DESIGN_WIDTH,MODULE_DESIGN_HEIGHT,
      MODULE_ASSET,operationalDateKey,normalizeOvernightCode,overnightCharacters,buildWeeklyOvernightModules
    };
  }
);
