"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture(options = {}) {
  class Element {
    constructor(name='div') {this.name=name;this.className='';this.children=[];this.events={};this.style={setProperty(){}};this.clientWidth=700;this.clientHeight=500;this.hidden=false;
      this.classList={contains:c=>this.className.split(' ').includes(c),add:(...v)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...v])].join(' ');},remove:(...v)=>{this.className=this.className.split(' ').filter(c=>!v.includes(c)).join(' ');},toggle:(c,v)=>v?this.classList.add(c):this.classList.remove(c)};
    }
    appendChild(node){if(node.parent)node.parent.children=node.parent.children.filter(n=>n!==node);node.parent=this;this.children.push(node);return node;}
    querySelector(selector){const c=selector.slice(1);for(const n of this.children){if(n.classList.contains(c))return n;const result=n.querySelector(selector);if(result)return result;}return null;}
    setAttribute(){}
    addEventListener(type,fn){this.events[type]=fn;}
  }
  const shell=new Element();shell.className='route-map-shell';
  const svg=new Element('svg');svg.className='route-map-svg';shell.appendChild(svg);
  const surface=new Element();surface.className='airport-surface-layer';surface.hidden=true;shell.appendChild(surface);
  const frames=[],timers=new Map(),sounds=[],events={};let next=0;
  const root={location:{protocol:options.protocol || "file:"},document:{hidden:false,getElementById:id=>id==='route-map-shell'?shell:null,querySelector:()=>true,createElement:()=>new Element()},
    addEventListener(type,fn){(events[type] || (events[type]=[])).push(fn);},requestAnimationFrame:fn=>frames.push(fn),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    matchMedia:()=>({matches:false}),MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}},
    dadRadarMapRollAudio:{createController:()=>Object.fromEntries(['playMotor','stopMotor','playRegisterClack','playDetentClack'].map(name=>[name,()=>sounds.push(name)]))}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'map-roll-transition.js'),'utf8'),{window:root});
  const transport=shell.querySelector('.map-roll-transport');
  return {root,shell,surface,sounds,api:shell.dadRadarMapRoll,
    emit:(type,detail)=>(events[type]||[]).forEach(fn=>fn({detail})),
    finish:()=>transport.events.animationend({target:transport,animationName:shell.classList.contains('map-roll-to-surface')?'map-roll-up':'map-roll-down'}),
    paint:()=>frames.splice(0).forEach(fn=>fn()),
    tick:delay=>{for(const [id,t] of Array.from(timers)){if(t.delay===delay){timers.delete(id);t.fn();}}}};
}
const f=fixture();f.api.setSurfaceVisible(true);f.finish();
f.api.setSurfaceVisible(false);
assert(!f.shell.classList.contains('map-roll-to-regional'),'request in the finish-to-paint gap must wait for registration');
f.paint();f.paint();
assert.deepEqual(f.sounds,['playMotor','stopMotor','playRegisterClack']);
f.tick(135);f.tick(220);
assert.deepEqual(f.sounds,['playMotor','stopMotor','playRegisterClack','playDetentClack','playMotor']);
assert(f.shell.classList.contains('map-roll-to-regional'),'latest target drains after both clacks');
f.finish();f.paint();f.paint();f.tick(135);f.tick(220);
assert(!f.shell.classList.contains('is-surface-registered'));
const hidden=fixture();hidden.api.setSurfaceVisible(true);hidden.finish();hidden.root.document.hidden=true;
hidden.api.setSurfaceVisible(false);hidden.paint();hidden.paint();hidden.tick(135);hidden.tick(220);
assert(hidden.shell.classList.contains('map-roll-to-regional'),'hidden document must not strand the queued target');
assert(!hidden.sounds.some(name=>name.includes('Clack')),'registration sounds remain silent in a hidden document');
const preference=fixture();preference.root.matchMedia=()=>({matches:true});preference.api.setSurfaceVisible(true);
assert(preference.shell.classList.contains('is-surface-registered'));
assert(!preference.shell.classList.contains('map-roll-to-surface'));
assert.deepEqual(preference.sounds,[]);
const latest=fixture();
latest.api.requestSurface(latest.surface,true);
latest.api.requestSurface(latest.surface,false);
latest.api.requestSurface(latest.surface,true);
latest.finish();latest.paint();latest.paint();latest.tick(135);latest.tick(220);
assert(latest.shell.classList.contains('is-surface-registered'),'repeated ground report replaces queued departure');
assert(!latest.shell.classList.contains('map-roll-to-regional'));
assert.equal(latest.sounds.filter(s=>s==='playMotor').length,1,'no unnecessary reverse roll');
const resize=fixture();let resizeEvents=0;
resize.root.Event=class {constructor(type){this.type=type;}};
resize.root.dispatchEvent=event=>{assert.equal(event.type,'resize');resizeEvents++;};
resize.shell.clientHeight=600;resize.api.resize();resize.paint();
assert.equal(resizeEvents,1,'height-only aperture changes refit the camera');
resize.api.resize();resize.paint();assert.equal(resizeEvents,1,'unchanged size does not create a resize loop');
console.log('Map roll lifecycle tests passed: registration, preference, explicit requests and aperture refitting.');

// A stale command on initial load must not act like a user pressing Test now.
for (const firstToken of ["old-test", null]) {
  const startup=fixture({protocol:"https:"});
  const initial={status:"HOME",diagnostics:{shutterTestToken:firstToken}};
  const visual=state=>startup.emit('dad-radar:visual-state-change',{state});
  visual({status:"OFFLINE"});
  visual(initial); // readMasterState publishes visual state BEFORE calendar-sync
  assert.deepEqual(startup.sounds,[], 'Initial server token does not move the map');
  startup.emit('dad-radar:calendar-sync',{ok:false}); // failed reads cannot prime
  startup.emit('dad-radar:calendar-sync',{ok:true,resolved:{state:initial}});
  visual(initial); visual(initial);
  assert.deepEqual(startup.sounds,[], 'Repeated initial snapshots stay silent');
  const fresh={status:"HOME",diagnostics:{shutterTestToken:"new-test"}};
  visual(fresh);
  assert.equal(startup.sounds.filter(s=>s==='playMotor').length,1,'New deliberate command still starts the roll');
  visual(fresh); visual(fresh);
  assert.equal(startup.sounds.filter(s=>s==='playMotor').length,1,'One test command runs once');
  startup.finish();startup.paint();startup.paint();startup.tick(135);startup.tick(220);
  startup.tick(3800);startup.finish();startup.paint();startup.paint();startup.tick(135);startup.tick(220);
  assert(!startup.shell.classList.contains('is-surface-registered'),'Diagnostic returns to prior view');
}
const {familyHardwareMetrics}=require('./map-roll-transition');
for(const [w,h] of [[314,244],[358,422],[537,430],[736,422],[242,186]]) {
  const v=familyHardwareMetrics(w,h);
  assert(564*v.scale+2*v.inset<=w,'Three housings fit one row with breathing room');
  assert(v.clockBottom<=18 && v.sequenceBottom<=14,'No 90px stacked offset on Full mobile');
  assert(v.scale<=1 && v.scale>0);
}
console.log('Startup diagnostic baseline and proportional Full-family hardware tests passed.');
