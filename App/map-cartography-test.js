'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
assert(fs.existsSync(__dirname+'/map-cartography.js'),'Map labels must adapt to each route camera instead of using the fixed ORD–AVL study.');
const api=require('./map-cartography');
// A coincident low-priority city must not cover an important city or enter a reserved hardware area.
const camera={x:0,y:0,width:100,height:60};
const labels=[
 {text:'Primary',kind:'city',x:30,y:30,rank:1},
 {text:'Secondary',kind:'city',x:30,y:30,rank:5},
 {text:'Outside',kind:'city',x:200,y:200,rank:0},
 {text:'Hidden by compass',kind:'city',x:90,y:5,rank:0},
 {text:'Other',kind:'city',x:60,y:48,rank:2}
];
const options={width:1000,height:600,reserved:[{x:800,y:0,width:200,height:130}],measure:(text,size)=>text.length*size*.65};
const selected=api.layout(labels,camera,options);
assert(selected.some(x=>x.text==='Primary'));
assert(!selected.some(x=>x.text==='Secondary'||x.text==='Outside'||x.text==='Hidden by compass'));
assert(selected.some(x=>x.text==='Other'));
for(const width of [320,667,1028,1920]) {
 const result=api.layout(Array.from({length:100},(_,i)=>({text:'CITY '+i,kind:'city',x:(i%10)*10+3,y:Math.floor(i/10)*6+3,rank:i%7})),camera,{width,height:width*.6,measure:options.measure});
 assert(result.length>0&&result.length<=24,'The chart remains sparse at each viewport size');
 for(let i=0;i<result.length;i++) {
  const a=result[i].box;
  assert(a.x>=0&&a.y>=0&&a.x+a.width<=width&&a.y+a.height<=width*.6,'No cropped edge lettering');
  for(const b of result.slice(i+1).map(x=>x.box))assert(!api.overlap(a,b),'Printed label boxes must not overlap');
 }
 assert.deepEqual(result,api.layout(Array.from({length:100},(_,i)=>({text:'CITY '+i,kind:'city',x:(i%10)*10+3,y:Math.floor(i/10)*6+3,rank:i%7})),camera,{width,height:width*.6,measure:options.measure}),'Stable camera produces stable placement');
}
assert.deepEqual(api.layout(labels,camera,{width:0,height:0}),[],'Hidden displays do not produce invalid label transforms');

// A stationary overview can move its airport plaque when the home/base changes.
// Exercise the renderer, not just the pure layout, so its cache cannot mask it.
let frame, drawn, plaque={left:900,top:500,width:80,height:30};
const makeNode=()=>({attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},appendChild(n){this.children.push(n);}});
const doc={createElement:()=>({getContext:()=>({measureText:t=>({width:t.length*6})})}),
 createElementNS:makeNode,createDocumentFragment:makeNode,
 defaultView:{requestAnimationFrame:fn=>{frame=fn;return 1;}}};
const renderer=api.create({document:doc,svg:{getBoundingClientRect:()=>({left:0,top:0,width:1000,height:600})},
 layer:{replaceChildren:n=>{drawn=n;}},shell:{querySelectorAll:s=>s==='.airport-placard'?[{getBoundingClientRect:()=>plaque}]:[]},
 labels:[{text:'EXAMPLE',kind:'city',x:30,y:30,rank:1}]});
renderer.update(camera);frame();
assert(drawn.children.some(n=>n.attrs['data-chart-name']==='EXAMPLE'));
plaque={left:280,top:280,width:110,height:55};
renderer.update(camera);frame();
assert(!drawn.children.some(n=>n.attrs['data-chart-name']==='EXAMPLE'),'A moved plaque invalidates placement even when the camera stays fixed');

// Asheville remains a home reference even when low-ranked cities are thinned.
const home={text:'ASHEVILLE',kind:'city',x:30,y:30,rank:99,permanent:true};
const crowd=Array.from({length:80},(_,i)=>({text:'CITY '+i,kind:'city',x:30+(i%10),y:30+Math.floor(i/10),rank:0}));
assert(api.layout([...crowd,home],camera,{width:320,height:192}).some(l=>l.permanent),'Asheville has priority over density limits');
const blockedHome=api.layout([home],camera,{width:1000,height:600,reserved:[{x:275,y:270,width:120,height:70}]});
assert(blockedHome.some(l=>l.permanent),'Asheville label moves around an airport plaque instead of disappearing');
assert(!api.overlap(blockedHome[0].box,{x:275,y:270,width:120,height:70}));
assert.deepEqual(api.layout([{...home,x:-50}],camera,{width:1000,height:600}),[],'Home keeps its real coordinates when outside the visible region');
console.log('Cartographic label collision, density, clipping, resize, home priority and hardware movement tests passed.');
