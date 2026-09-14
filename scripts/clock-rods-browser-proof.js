"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const asset = path.resolve(__dirname, "../assets/hardware/brass-clock-rod.png");
const manifest = require("../assets/hardware/brass-clock-rod.json");
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(asset)).digest("hex"), manifest.asset_sha256);

async function checkClockRods(page) {
  const clocks = page.locator('.route-map-shell .clock-block, .route-map-shell .eta-block');
  if (!await clocks.count()) {
    assert.equal(await page.locator('.clock-support-rod,.sequence-support-rod').count(), 0, 'Compact gets no new hardware');
    return;
  }
  await page.waitForFunction(() => {
    const rods = [...document.querySelectorAll('.clock-support-rod,.sequence-support-rod')];
    return rods.length === 3 && rods.every(n => n.complete && n.naturalWidth === 12 && n.naturalHeight === 64);
  }, null, {timeout:2000});
  const evidence = await page.evaluate(() => {
    const rect = n => {
      const r = n.getBoundingClientRect();
      return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
    };
    const shell = document.querySelector('.route-map-shell');
    const housings = [...shell.querySelectorAll('.clock-block,.eta-block,.sequence-mileage-badge')];
    const rods = [...shell.querySelectorAll('.clock-support-rod,.sequence-support-rod')];
    const tracked = [...housings, shell];
    const before = tracked.map(rect);
    rods.forEach(n => { n.style.display = 'none'; });
    const withoutRods = tracked.map(rect);
    rods.forEach(n => { n.style.removeProperty('display'); });
    return {before, withoutRods, map:rect(shell),
      rods: rods.map(n => ({rect:rect(n), housing:rect(n.parentElement), src:n.currentSrc,
        sequence:n.classList.contains('sequence-support-rod'),
        alt:n.getAttribute('alt'), aria:n.getAttribute('aria-hidden'),
        onRoll:!!n.closest('.map-roll-transport'), cssBackground:getComputedStyle(n).backgroundImage,
        oldBefore:getComputedStyle(n.parentElement,'::before').display,
        oldAfter:getComputedStyle(n.parentElement,'::after').display,
        beforeContent:getComputedStyle(n.parentElement,'::before').content,
        afterContent:getComputedStyle(n.parentElement,'::after').content})),
      sequenceRods:shell.querySelectorAll('.sequence-mileage-badge .sequence-support-rod').length,
      clockRods:shell.querySelectorAll('.clock-block .clock-support-rod,.eta-block .clock-support-rod').length,
      sequenceText:[...shell.querySelectorAll('.sequence-mileage-label,.sequence-mileage-value,.sequence-mileage-detail')]
        .map(n => ({text:n.textContent,align:getComputedStyle(n).textAlign,width:n.clientWidth,scroll:n.scrollWidth}))};
  });
  assert.deepEqual(evidence.before, evidence.withoutRods, 'Rods do not move or resize clocks, map or leg counter');
  assert.equal(evidence.clockRods, 2, 'Keep the two existing clock rods');
  assert.equal(evidence.sequenceRods, 1, 'One small rod beneath the leg counter');
  assert.equal(new Set(evidence.rods.map(rod => rod.src)).size, 1, 'All three rods use the exact same asset URL');
  assert.equal(evidence.sequenceText.length, 3, 'Check all three sequence text elements');
  for (const line of evidence.sequenceText) {
    assert.equal(line.align, 'center', 'Center the sequence label, mileage and leg-count text');
    assert(line.scroll <= line.width + 1, `Sequence text must remain contained: ${line.text}`);
  }
  for (const rod of evidence.rods) {
    assert(rod.src.includes('/assets/hardware/brass-clock-rod.png'), 'Use the supplied raster crop');
    assert.equal(rod.alt, ''); assert.equal(rod.aria, 'true');
    assert(!rod.onRoll, 'Rod is stationary, not attached to the moving paper');
    assert.equal(rod.cssBackground, 'none', 'No CSS-painted metal');
    if (rod.sequence) {
      assert.equal(rod.beforeContent, 'none', 'The rejected oversized bracket stays removed');
      assert.equal(rod.afterContent, 'none', 'No CSS-painted counter fitting');
      assert(rod.rect.height <= 18.1, 'Only bridge the existing short counter gap');
    } else {
      assert.equal(rod.oldBefore, 'none', 'No old side arm');
      assert.equal(rod.oldAfter, 'none', 'No old screw head');
    }
    assert(rod.rect.width > 0 && rod.rect.width <= 4.1, 'Four-pixel asset with about three pixels of brass');
    assert(Math.abs((rod.rect.left + rod.rect.right - rod.housing.left - rod.housing.right)/2) <= 1,
      'Shaft is under the housing center');
    assert(rod.rect.top <= rod.housing.bottom && rod.rect.top >= rod.housing.bottom - 3,
      'Top end tucks into the existing underside');
    assert(rod.rect.bottom >= evidence.map.bottom - 1 && rod.rect.bottom <= evidence.map.bottom + 4,
      'Bottom reaches the bezel, not a floating foot');
  }
}
module.exports = {checkClockRods};
