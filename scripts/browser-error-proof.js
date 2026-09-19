"use strict";
const assert = require("node:assert/strict");

// The ResizeObserver spec defers undelivered observations to a later render.
// https://www.w3.org/TR/resize-observer/#html-processing-model-event-loop
// Record that exact notification; fail if it continues after the layout proof.
// Application exceptions are always failures, including other resize errors.
function observeBrowserErrors(page) {
  const errors = [];
  const resizeNotices = [];
  page.on("pageerror", error => {
    if (error.message === "ResizeObserver loop completed with undelivered notifications.") {
      resizeNotices.push(error.message);
    } else errors.push(error.message);
  });
  return async function assertBrowserSettled(label) {
    const before = resizeNotices.length;
    await page.evaluate(() => new Promise(resolve => {
      let remaining = 8;
      function sample() {
        if (--remaining === 0) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    assert.equal(resizeNotices.length, before, `${label}: resize notifications must settle`);
    assert.deepEqual(errors, [], `${label}: browser errors`);
    if (before) console.log(`${label}: ${before} startup resize notification(s), none during settled-frame check`);
  };
}
module.exports = {observeBrowserErrors};
