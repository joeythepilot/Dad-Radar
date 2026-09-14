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
    assert.equal(await page.locator('.clock-support-rod').count(), 0, 'Compact gets no new hardware');
    return;
  }
  await page.waitForFunction(() => {
    const rods = [...document.querySelectorAll('.clock-support-rod')];
    return rods.length === 2 && rods.every(n => n.complete && n.naturalWidth === 12 && n.naturalHeight === 64);
  }, null, {timeout:2000});
  const evidence = await page.evaluate(() => {
    const rect = n => {
      const r = n.getBoundingClientRect();
      return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
    };
    const shell = document.querySelector('.route-map-shell');
    const housings = [...shell.querySelectorAll('.clock-block,.eta-block')];
    const rods = [...shell.querySelectorAll('.clock-support-rod')];
    const tracked = [...housings, shell, shell.querySelector('.sequence-mileage-badge')].filter(Boolean);
    const before = tracked.map(rect);
    rods.forEach(n => { n.style.display = 'none'; });
    const withoutRods = tracked.map(rect);
    rods.forEach(n => { n.style.removeProperty('display'); });
    return {before, withoutRods, map:rect(shell),
      rods: rods.map(n => ({rect:rect(n), housing:rect(n.parentElement), src:n.currentSrc,
        alt:n.getAttribute('alt'), aria:n.getAttribute('aria-hidden'),
        onRoll:!!n.closest('.map-roll-transport'), cssBackground:getComputedStyle(n).backgroundImage,
        oldBefore:getComputedStyle(n.parentElement,'::before').display,
        oldAfter:getComputedStyle(n.parentElement,'::after').display})),
      sequenceRods:shell.querySelectorAll('.sequence-mileage-badge .clock-support-rod').length};
  });
  assert.deepEqual(evidence.before, evidence.withoutRods, 'Rods do not move or resize clocks, map or leg counter');
  assert.equal(evidence.sequenceRods, 0, 'Leg counter is unchanged');
  for (const rod of evidence.rods) {
    assert(rod.src.includes('/assets/hardware/brass-clock-rod.png'), 'Use the supplied raster crop');
    assert.equal(rod.alt, ''); assert.equal(rod.aria, 'true');
    assert(!rod.onRoll, 'Rod is stationary, not attached to the moving paper');
    assert.equal(rod.cssBackground, 'none', 'No CSS-painted metal');
    assert.equal(rod.oldBefore, 'none', 'No old side arm');
    assert.equal(rod.oldAfter, 'none', 'No old screw head');
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
