"use strict";
// Linux WebKit verification uses a visible window on the CI virtual display.
// Keep the same real animation-frame, geometry, and registration assertions.
const {webkit} = require("playwright");
const launch = webkit.launch.bind(webkit);
webkit.launch = async options => {
  const browser = await launch({...options, headless:false});
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async options => {
    const page = await newPage(options);
    await page.bringToFront();
    return page;
  };
  return browser;
};
require("./map-hardware-diagnostics");
