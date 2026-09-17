"use strict";
const assert = require("node:assert/strict");

// Run against the real Full-family page, not a replacement test layout.
async function checkFamilyDuty(page, screenshotPath) {
  const panel = page.locator('html[data-family-full] .daily-schedule-panel');
  if (!await panel.count()) return;
  const data = await panel.evaluate(node => ({
    width: node.clientWidth,
    physical: node.classList.contains('is-physical-duty-card'),
    narrow: node.classList.contains('family-duty-narrow'),
    tabindex: node.getAttribute('tabindex'),
    text: [...node.querySelectorAll('.daily-schedule-label,.daily-schedule-time,.daily-schedule-tag,#daily-schedule-date,h2:not(.visually-hidden)')]
      .map(n => ({text:n.textContent.trim(),width:n.clientWidth,scroll:n.scrollWidth}))
  }));
  if (data.width >= 300) return;

  // The raster dispatch card is calibrated artwork. Mobile Full must scale the
  // entire physical card instead of turning its overlays into a scrolling web
  // list. The legacy narrow reflow remains valid only for non-physical panels.
  if (data.physical) {
    assert.equal(data.narrow, false, 'Physical Today’s Duty card must not enter legacy narrow reflow');
    assert.equal(data.tabindex, null, 'Physical Today’s Duty card must not become a scrolling tab stop');
    assert(data.text.some(x => x.text.includes('→')), 'Proof includes real rendered route labels');

    const statusGeometry = await panel.evaluate(node => {
      const context = node.querySelector('.daily-schedule-context');
      const status = context?.querySelector('strong');
      if (!context || !status) return null;

      const original = status.textContent;
      status.textContent = 'DADDY IS COMMUTING TO CHICAGO, ILLINOIS';

      const panelBounds = node.getBoundingClientRect();
      const contextBounds = context.getBoundingClientRect();
      const statusBounds = status.getBoundingClientRect();
      const result = {
        panelTop: panelBounds.top,
        panelHeight: panelBounds.height,
        contextTop: contextBounds.top,
        contextBottom: contextBounds.bottom,
        statusTop: statusBounds.top,
        statusBottom: statusBounds.bottom,
        statusClientHeight: status.clientHeight,
        statusScrollHeight: status.scrollHeight
      };

      status.textContent = original;
      return result;
    });

    assert(statusGeometry, 'Physical Today’s Duty card exposes the live Current Status field');
    const printedStatusBottom = statusGeometry.panelTop + statusGeometry.panelHeight * 0.365;
    assert(
      statusGeometry.contextBottom <= printedStatusBottom + 1,
      `Current Status window must stay above the printed assignment divider: ${JSON.stringify(statusGeometry)}`
    );
    assert(
      statusGeometry.statusTop >= statusGeometry.contextTop - 1,
      `Current Status text must not clip above its live window: ${JSON.stringify(statusGeometry)}`
    );
    assert(
      statusGeometry.statusBottom <= statusGeometry.contextBottom + 1,
      `Current Status text must not spill below its live window: ${JSON.stringify(statusGeometry)}`
    );
    assert(
      statusGeometry.statusScrollHeight <= statusGeometry.statusClientHeight + 1,
      `Long Current Status copy must fit without hidden top/bottom text: ${JSON.stringify(statusGeometry)}`
    );

    if (screenshotPath) await panel.screenshot({path:screenshotPath.replace(/\.png$/, '-duty-detail.png')});
    return;
  }

  assert(data.narrow, 'Narrow Full duty panel must use its measured housing width');
  assert.equal(data.tabindex, '0', 'The scrolling duty housing must be keyboard reachable');
  assert(data.text.some(x => x.text.includes('→')), 'Proof includes real rendered route labels');
  for (const text of data.text) assert(text.scroll <= text.width + 1, `Clipped Full duty text: ${JSON.stringify(text)}`);
  const scroll = await panel.evaluate(node => {
    const original = node.scrollTop;
    node.scrollTop = node.scrollHeight;
    const last = node.querySelector('.daily-schedule-entry:last-child');
    const bounds = node.getBoundingClientRect(), lastBounds = last?.getBoundingClientRect();
    return {original,top:node.scrollTop,height:node.clientHeight,total:node.scrollHeight,
      overflow:getComputedStyle(node).overflowY,
      lastVisible:!lastBounds || (lastBounds.top >= bounds.top - 1 && lastBounds.bottom <= bounds.bottom + 1)};
  });
  try {
    if (scroll.total > scroll.height + 1) {
      assert.equal(scroll.overflow, 'auto', 'Duty content must scroll rather than disappear');
      assert(scroll.top > 0 && scroll.lastVisible, 'Last duty row must be reachable inside its housing');
    }
    if (screenshotPath) await panel.screenshot({path:screenshotPath.replace(/\.png$/, '-duty-detail.png')});
  } finally {
    await panel.evaluate((node, top) => { node.scrollTop = top; }, scroll.original);
  }
}
module.exports = {checkFamilyDuty};
