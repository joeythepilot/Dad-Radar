"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engines = require("playwright");
const output = path.resolve(__dirname,"../artifacts/map-hardware");
fs.mkdirSync(output,{recursive:true});
for (const name of ["chromium","webkit"]) {
  const launch = engines[name].launch.bind(engines[name]);
  engines[name].launch = async options => {
    const browser = await launch({...options,headless:name !== "webkit"});
    const newPage = browser.newPage.bind(browser);
    const close = browser.close.bind(browser);
    browser.close = async () => {
      for (const context of browser.contexts()) for (const page of context.pages()) {
        if (page.isClosed()) continue;
        const evidence = await page.evaluate(() => ({
          url:location.pathname,frames:window.mapProofFrames,sounds:window.mapProofSounds,
          reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
          transport:document.querySelector('.map-roll-transport')?.outerHTML.slice(0,200)
        })).catch(error=>({error:String(error)}));
        fs.writeFileSync(path.join(output,`${name}-last-page.json`),JSON.stringify(evidence,null,2));
        console.log(`${name}: retained ${evidence.frames?.length || 0} frames, ${evidence.frames?.filter(f=>f.moving).length || 0} during motion`);
      }
      return close();
    };
    browser.newPage = async options => {
      const page = await newPage(options);
      await page.bringToFront();
      const screenshot = page.screenshot.bind(page);
      page.screenshot = async options => {
        const defects = await page.evaluate(() => {
          const defects=[];
          const map=document.querySelector('.map-roll-regional-sheet .route-map-svg');
          if (map) {
            const box=map.viewBox.baseVal,rect=map.getBoundingClientRect();
            if (rect.height>0 && Math.abs(box.width/box.height-rect.width/rect.height)>.01)
              defects.push('map camera was not fitted to the visible aperture');
          }
          if (!document.documentElement.classList.contains('family-full-portrait')) return defects;
          for (const node of document.querySelectorAll('.instrument-slot .instrument, #destination-poster')) {
            if (node.hidden) continue;
            const a=node.getBoundingClientRect(),b=node.parentElement.getBoundingClientRect();
            if(a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1)defects.push(node.id||node.className);
          }
          return defects;
        });
        assert.deepEqual(defects,[],"camera, portrait poster and gauges fit their housings");
        return screenshot(options);
      };
      return page;
    };
    return browser;
  };
}
require("./map-hardware-diagnostics");
