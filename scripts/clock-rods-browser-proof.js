"use strict";
const assert = require("node:assert/strict");

async function checkClockRods(page) {
  assert.equal(await page.locator('.clock-support-rod,.sequence-support-rod').count(), 0,
    'Superseded clock rods and the removed tracker leg stay absent');
  if (!await page.locator('.twin-clock-panel').count()) return;
  const lines = await page.locator('.sequence-mileage-label,.sequence-mileage-value,.sequence-mileage-detail')
    .evaluateAll(nodes => nodes.map(n => ({text:n.textContent,align:getComputedStyle(n).textAlign,
      width:n.clientWidth,scroll:n.scrollWidth})));
  assert.equal(lines.length, 3, 'Check all three sequence text elements');
  for (const line of lines) {
    assert.equal(line.align, 'center', 'Center the sequence label, mileage and leg-count text');
    assert(line.scroll <= line.width + 1, `Sequence text must remain contained: ${line.text}`);
  }
}
module.exports = {checkClockRods};
