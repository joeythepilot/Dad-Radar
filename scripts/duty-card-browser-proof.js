"use strict";
const assert=require('node:assert/strict'),path=require('node:path');
async function checkDutyCard(page,name,output,state){
   await page.locator('.daily-schedule-card-art').evaluate(image=>image.decode());
   await page.waitForFunction(()=>document.querySelectorAll('.daily-schedule-entry .daily-schedule-flight').length===3);
   const dutyProof=await page.locator('.daily-schedule-panel').evaluate(panel=>{
     const box=panel.getBoundingClientRect();
     const rows=[...panel.querySelectorAll('.daily-schedule-entry')];
     const fields=[...panel.querySelectorAll('.daily-schedule-time span')];
     const art=panel.querySelector('.daily-schedule-card-art');
     return {physical:panel.classList.contains('is-physical-duty-card'),
       art:art.getAttribute('src'),size:[art.naturalWidth,art.naturalHeight],
       context:panel.querySelector('#daily-schedule-context').textContent.trim(),
       footer:panel.querySelector('#daily-schedule-footer').textContent.trim(),
       now:panel.querySelectorAll('.daily-schedule-now').length,
       zone:panel.querySelector('.daily-schedule-time-zone').textContent,
       labels:fields.map(n=>n.textContent),
       contained:fields.every(n=>{const r=n.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&n.scrollWidth<=n.clientWidth+1;}),
       headings:[...panel.querySelectorAll('.daily-schedule-column-headings span')].map(n=>n.textContent),
       separated:rows.every(n=>{
         const fields=[n.querySelector('.daily-schedule-flight'),n.querySelector('.daily-schedule-label'),...n.querySelectorAll('.daily-schedule-time span')].filter(f=>getComputedStyle(f).display!=='none');
         const rects=fields.map(f=>f.getBoundingClientRect());
         return fields.every((f,i)=>f.scrollWidth<=f.clientWidth+1 && (!i || rects[i-1].right<=rects[i].left+1)) && Math.abs(rects.at(-2).top-rects.at(-1).top)<1;
       }),
       adjacent:rows.every((n,i)=>!i || rows[i-1].getBoundingClientRect().bottom<=n.getBoundingClientRect().top+1),
       slots:rows.map(n=>n.style.gridRow),
       boxes:rows.map(n=>({row:n.getBoundingClientRect().toJSON(),route:n.querySelector('.daily-schedule-label').getBoundingClientRect().toJSON(),time:n.querySelector('.daily-schedule-time').getBoundingClientRect().toJSON(),grid:getComputedStyle(n).gridTemplateRows})),
       stampClear:rows.every(n=>{
         const s=n.querySelector('.daily-schedule-operational-stamp');
         if(!s)return true;
         const a=s.getBoundingClientRect();
         return [n.querySelector('.daily-schedule-flight'),n.querySelector('.daily-schedule-label'),...n.querySelectorAll('.daily-schedule-time span')].every(f=>{
           const b=f.getBoundingClientRect();return a.right<=b.left || a.left>=b.right || a.bottom<=b.top || a.top>=b.bottom;
         });
       })};
   });
   assert(dutyProof.physical,'Dedicated physical duty card renders');
   assert.equal(dutyProof.art.replace(/^\.\//,''),'/assets/ui/today-duty-card-weekly-paper.png');
   assert.deepEqual(dutyProof.size,[1864,843]);
   assert.equal(dutyProof.context,state.dailySchedule.context);
   assert.equal(dutyProof.footer,'LAYOVER · SPRINGFIELD');
   assert.equal(dutyProof.now,0);
   assert.match(dutyProof.zone,/EASTERN TIME/);
   assert(dutyProof.labels.includes('11:23 AM') && dutyProof.labels.includes('1:40 PM'),`${name}: current flight has both times`);
   assert.deepEqual(dutyProof.headings,['FLIGHT','ROUTE','DEPART','ARRIVE']);
   assert(dutyProof.contained && dutyProof.separated && dutyProof.stampClear && dutyProof.adjacent,`${name}: duty times fit and clear neighboring rows/route/stamp: ${JSON.stringify(dutyProof)}`);
   assert.deepEqual(dutyProof.slots,['span 1','span 1','span 1'],'Each assignment occupies one ruled line');
   const fiveFlightState={...state,dailySchedule:{...state.dailySchedule,entries:Array.from({length:5},(_,i)=>({kind:'flight',flightNumber:String(3637+i),tag:i===0?'COMMUTE':`FLT ${3637+i}`,label:i===4?'SPI → AVL':'SPI → ORD',departureTime:'11:23 AM',arrivalTime:'12:59 PM',status:i===2?'current':'upcoming'}))}};
   await page.evaluate(s=>window.dispatchEvent(new CustomEvent('dad-radar:state-change',{detail:{state:s}})),fiveFlightState);
   await page.waitForFunction(()=>document.querySelectorAll('.daily-schedule-entry.has-flight-times').length===5);
   const fiveProof=await page.locator('.daily-schedule-list').evaluate(list=>{
     const rows=[...list.children],bounds=list.getBoundingClientRect();
     return {count:rows.length,commute:rows[0].title,flight:rows[0].querySelector('.daily-schedule-flight').textContent,
       fits:rows.every((row,i)=>{const r=row.getBoundingClientRect();return r.bottom<=bounds.bottom+1 && (!i||rows[i-1].getBoundingClientRect().bottom<=r.top+1) && [...row.querySelectorAll('.daily-schedule-flight,.daily-schedule-label,.daily-schedule-time span')].every(f=>f.scrollWidth<=f.clientWidth+1);})};
   });
   assert.equal(await page.locator('#daily-schedule-footer').textContent().then(t=>t.trim()),'HOME TONIGHT');
   assert.equal(fiveProof.count,5);assert(fiveProof.fits,`${name}: five complete flight rows fit the paper`);
   assert.equal(fiveProof.flight,'3637');assert.match(fiveProof.commute,/COMMUTE/);
   await page.locator('.daily-schedule-panel').screenshot({path:path.join(output,`duty-five-${name}.png`)});

 await require('./family-duty-browser-proof').checkFamilyDuty(page);
}
module.exports={checkDutyCard};
