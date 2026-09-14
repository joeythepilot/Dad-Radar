"use strict";
// Preserve failure evidence without changing any application's timing or data.
const fs = require("node:fs");
const path = require("node:path");
const engines = require("playwright");
const output = path.resolve(__dirname,"../artifacts/map-hardware");
fs.mkdirSync(output,{recursive:true});
for (const name of ["chromium","webkit"]) {
  const launch = engines[name].launch.bind(engines[name]);
  engines[name].launch = async options => {
    const browser = await launch(options);
    const create = browser.newPage.bind(browser);
    let pageNumber = 0;
    browser.newPage = async options => {
      const page = await create(options);
      const label = `${name}-${++pageNumber}`;
      const wait = page.waitForFunction.bind(page);
      page.waitForFunction = async (fn,arg,options) => {
        console.log(`${label}: transport wait for ${JSON.stringify(arg)}`);
        try { return await wait(fn,arg,options); }
        catch (error) {
          const debug = await page.evaluate(() => {
            const shell=document.querySelector('.route-map-shell');
            const transport=document.querySelector('.map-roll-transport');
            return {classes:shell?.className,hidden:document.hidden,
              layerHidden:document.querySelector('.airport-surface-layer')?.hidden,
              transform:transport?getComputedStyle(transport).transform:null,
              animations:transport?.getAnimations?.().map(x=>({state:x.playState,time:x.currentTime})),
              sounds:window.mapProofSounds,frames:window.mapProofFrames,now:performance.now()};
          });
          fs.writeFileSync(path.join(output,`${label}-failure.json`),JSON.stringify(debug,null,2));
          console.error('MAP TRANSPORT FAILURE',JSON.stringify({...debug,frames:debug.frames?.slice(-3)}));
          throw error;
        }
      };
      return page;
    };
    return browser;
  };
}
require('./map-hardware-browser-test');
