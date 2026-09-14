"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture() {
  class Element {
    constructor(name='div') {this.name=name;this.className='';this.children=[];this.events={};this.style={setProperty(){}};this.clientWidth=700;this.hidden=false;
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
  const frames=[],timers=new Map(),sounds=[];let next=0;
  const root={document:{hidden:false,getElementById:id=>id==='route-map-shell'?shell:null,querySelector:()=>true,createElement:()=>new Element()},
    addEventListener(){},requestAnimationFrame:fn=>frames.push(fn),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    matchMedia:()=>({matches:false}),MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}},
    dadRadarMapRollAudio:{createController:()=>Object.fromEntries(['playMotor','stopMotor','playRegisterClack','playDetentClack'].map(name=>[name,()=>sounds.push(name)]))}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'map-roll-transition.js'),'utf8'),{window:root});
  const transport=shell.querySelector('.map-roll-transport');
  return {root,shell,sounds,api:shell.dadRadarMapRoll,
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
console.log('Map roll lifecycle tests passed: finish-gap reversal and hidden-page queue.');
