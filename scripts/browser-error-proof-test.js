"use strict";
const assert = require("node:assert/strict");
const {EventEmitter} = require("node:events");
const {observeBrowserErrors} = require("./browser-error-proof");
function fixture(duringSample) {
  const page = new EventEmitter();
  page.evaluate = async () => duringSample?.(page);
  return {page, check:observeBrowserErrors(page)};
}
const notice = "ResizeObserver loop completed with undelivered notifications.";
(async () => {
  const startup = fixture();
  startup.page.emit("pageerror", new Error(notice));
  await startup.check("settled startup");
  const ongoing = fixture(page => page.emit("pageerror", new Error(notice)));
  await assert.rejects(ongoing.check("ongoing loop"), /resize notifications must settle/);
  const thrown = fixture();
  thrown.page.emit("pageerror", new Error("ReferenceError: missing application function"));
  await assert.rejects(thrown.check("application failure"), /browser errors/);
  const late = fixture(page => page.emit("pageerror", new Error("late failure")));
  await assert.rejects(late.check("late failure"), /browser errors/);
  console.log("Browser error and resize-settling proof tests passed.");
})().catch(error => {console.error(error);process.exitCode=1;});
