"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function transparent(color) {
  return color === "rgba(0, 0, 0, 0)" || color === "transparent";
}

async function checkWeeklyTicker(page, compact, label, output, expectedText) {
  const canvas = page.locator("#weekly-trip-ticker-canvas");

  if (compact) {
    assert.equal(await canvas.count(), 0, "Compact keeps its existing layout without the weekly ticker");
    return null;
  }

  assert.equal(await canvas.count(), 1, "Full/desktop gets exactly one weekly ticker canvas");

  await page.waitForFunction(expected => {
    const node = document.getElementById("weekly-trip-ticker-canvas");
    if (!node || node.getAttribute("aria-label") !== expected) return false;
    const resources = performance.getEntriesByType("resource").map(entry => entry.name);
    return resources.some(name => name.includes("weekly-ticker-frame-v1.png")) &&
      resources.some(name => name.includes("weekly-ticker-glyphs-v1.png"));
  }, expectedText, {timeout: 4000, polling: 25});

  const data = await page.evaluate(expected => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const ticker = document.getElementById("weekly-trip-ticker");
    const canvas = document.getElementById("weekly-trip-ticker-canvas");
    const stack = document.querySelector(".center-map-stack");
    const mapPanel = stack.querySelector(".map-panel");
    const lower = document.querySelector(".lower-display-grid");
    const tickerStyle = getComputedStyle(ticker);
    const canvasStyle = getComputedStyle(canvas);
    return {
      expected,
      aria:canvas.getAttribute("aria-label"),
      canvasPixels:{width:canvas.width,height:canvas.height},
      stack:rect(stack),mapPanel:rect(mapPanel),ticker:rect(ticker),lower:rect(lower),
      tickerPaint:{backgroundImage:tickerStyle.backgroundImage,backgroundColor:tickerStyle.backgroundColor,
        borderTop:tickerStyle.borderTopWidth,borderRight:tickerStyle.borderRightWidth,
        borderBottom:tickerStyle.borderBottomWidth,borderLeft:tickerStyle.borderLeftWidth,
        before:getComputedStyle(ticker,"::before").content,after:getComputedStyle(ticker,"::after").content},
      canvasPaint:{backgroundImage:canvasStyle.backgroundImage,backgroundColor:canvasStyle.backgroundColor,
        borderTop:canvasStyle.borderTopWidth,borderRight:canvasStyle.borderRightWidth,
        borderBottom:canvasStyle.borderBottomWidth,borderLeft:canvasStyle.borderLeftWidth,
        before:getComputedStyle(canvas,"::before").content,after:getComputedStyle(canvas,"::after").content}
    };
  }, expectedText);

  assert.equal(data.aria, expectedText, "Ticker shows the family-readable upcoming-trip summary");
  assert.deepEqual(data.canvasPixels, {width:750,height:72}, "Ticker uses the production raster-art coordinate system");
  assert(Math.abs(data.ticker.left-data.mapPanel.left)<=1 && Math.abs(data.ticker.right-data.mapPanel.right)<=1,
    "Ticker occupies only the center-map column");
  assert(data.ticker.top>=data.mapPanel.bottom-1, "Ticker sits directly below the map, never over it");
  assert(data.ticker.bottom<=data.stack.bottom+1, "Ticker remains inside the existing center-stack height");
  assert(Math.abs(data.stack.top-data.lower.top)<=1 && Math.abs(data.stack.bottom-data.lower.bottom)<=1,
    "Adding the ticker does not increase the cabinet/lower-grid height");
  assert(data.mapPanel.height/data.stack.height>=.80 && data.mapPanel.height/data.stack.height<=.90,
    "The map shrinks vertically only enough to reserve the ticker strip");
  assert(data.ticker.height/data.stack.height>=.09 && data.ticker.height/data.stack.height<=.16,
    "Ticker stays a shallow strip rather than becoming another dashboard panel");

  for (const paint of [data.tickerPaint,data.canvasPaint]) {
    assert.equal(paint.backgroundImage, "none", "No CSS-generated ticker artwork");
    assert(transparent(paint.backgroundColor), "Ticker wrapper/canvas stays transparent behind raster artwork");
    assert.deepEqual([paint.borderTop,paint.borderRight,paint.borderBottom,paint.borderLeft],["0px","0px","0px","0px"],
      "No CSS-painted ticker frame or paper border");
    assert(["none","normal"].includes(paint.before), "No CSS pseudo-element ticker artwork");
    assert(["none","normal"].includes(paint.after), "No CSS pseudo-element ticker artwork");
  }

  const first = await canvas.screenshot();
  await page.waitForTimeout(450);
  const second = await canvas.screenshot();
  assert(!first.equals(second), "Ticker text actually scrolls horizontally");

  if (label === "chromium-desktop" || label === "webkit-desktop") {
    fs.writeFileSync(path.join(output, `${label}-weekly-ticker-a.png`), first);
    fs.writeFileSync(path.join(output, `${label}-weekly-ticker-b.png`), second);
  }

  return data;
}

module.exports = {checkWeeklyTicker};
