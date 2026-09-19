"use strict";
const assert = require("node:assert/strict");
async function checkInstrumentWheels(page, name) {
  const faces = page.locator('.instrument-wheel-face');
  assert.equal(await faces.count(), 3, `${name}: three wheel inserts`);
  const initial = await faces.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-reading')));
  assert.deepEqual(initial, ['438','171','34000']);
  const geometry = await faces.evaluateAll(nodes => nodes.map(n => {
    const r=n.getBoundingClientRect(),g=n.closest('.instrument').getBoundingClientRect();
    return {inside:r.left>=g.left&&r.right<=g.right&&r.top>g.top+g.height*.6&&r.bottom<g.bottom,
      ratio:r.width/r.height,expected:n.viewBox.baseVal.width/300,
      digits:[...n.querySelectorAll('.instrument-wheel-digits text')].every(t=>{const b=t.getBBox();return b.width<106;})};
  }));
  geometry.forEach(g=>{assert(g.inside,`${name}: embedded within lower gauge face`);assert(Math.abs(g.ratio-g.expected)<.02,'Artwork preserves aspect ratio');assert(g.digits,'Numerals fit drums');});
  const image = await page.evaluate(async () => {
    const im=new Image();im.src='/assets/hardware/instrument-wheel-inserts.png';await im.decode();
    const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
    const c=canvas.getContext('2d');c.drawImage(im,0,0);
    return {width:im.width,height:im.height,alpha:c.getImageData(0,0,1,1).data[3]};
  });
  assert.deepEqual(image,{width:1222,height:1287,alpha:0},'Artwork has true transparency');
  if(name!=='kiosk')return;
  const set = async (speed,heading,altitude) => {
    await page.evaluate(values=>['airspeed-value','heading-value','altitude-value'].forEach((id,i)=>{document.getElementById(id).textContent=values[i];}),[speed,heading,altitude]);
  };
  const readings = () => faces.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-reading')));
  await set('9','359','9,999');
  assert.deepEqual(await readings(),['009','359','09999']);
  await page.waitForTimeout(70);
  assert(await page.locator('.instrument-wheel-digits').evaluateAll(ns=>ns.some(n=>n.children.length===2)), 'Changed numbers roll');
  await set('10','000','10,000');
  await page.waitForTimeout(450);
  assert.deepEqual(await readings(),['010','000','10000']);
  assert.deepEqual(await faces.evaluateAll(ns=>ns.map(n=>[...n.querySelectorAll('.instrument-wheel-digits')].map(d=>d.textContent).join(''))),['010','000','10000'],'Rapid updates settle on newest value');
  await set('---','---','-----');
  assert.deepEqual(await readings(),['---','---','-----']);
  await page.emulateMedia({reducedMotion:'reduce'});
  await set('120','071','-200');
  await set('121','072','-199');
  assert.deepEqual(await readings(),['121','072','-0199']);
  assert(await page.locator('.instrument-wheel-digits').evaluateAll(ns=>ns.every(n=>n.children.length===1)),'Reduced motion updates immediately');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await set('438','171','34,000');await page.waitForTimeout(450);
}
module.exports={checkInstrumentWheels};
