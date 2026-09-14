"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engines = require("playwright");
const {checkFamilyDuty} = require("./family-duty-browser-proof");
const output = path.resolve(__dirname,"../artifacts/map-hardware");
fs.mkdirSync(output,{recursive:true});
for (const name of ["chromium","webkit"]) {
  const launch = engines[name].launch.bind(engines[name]);
  engines[name].launch = async options => {
    const browser = await launch({...options,headless:name !== "webkit"});
    const newPage = browser.newPage.bind(browser);
    const close = browser.close.bind(browser);
    browser.close = async () => {
      // Preserve sampled frames even when an assertion, rather than a wait, fails.
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
        await checkFamilyDuty(page, options?.path);
        const defects = await page.evaluate(() => {
          if (!document.documentElement.classList.contains('family-full-portrait')) return [];
          const defects=[];
          for (const node of document.querySelectorAll('.instrument-slot .instrument, #destination-poster')) {
            if (node.hidden) continue;
            const a=node.getBoundingClientRect(),b=node.parentElement.getBoundingClientRect();
            if(a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1)defects.push(node.id||node.className);
          }
          return defects;
        });
        assert.deepEqual(defects,[],"portrait poster and round gauges fit their housings");
        return screenshot(options);
      };
      return page;
    };
    return browser;
  };
}
require("./map-hardware-diagnostics");
