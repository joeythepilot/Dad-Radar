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
    return resources.some(name => name.includes("weekly-ticker-mechanism-v11.png")) &&
      resources.some(name => name.includes("weekly-ticker-paper-v5.png")) &&
      resources.some(name => name.includes("weekly-ticker-glyphs-v5.png"));
  }, expectedText, {timeout: 4000, polling: 25});

  await page.waitForTimeout(120);

  const data = await page.evaluate(expected => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const sample = (context, x, y, width, height) => {
      const pixels = context.getImageData(x,y,width,height).data;
      let red=0,green=0,blue=0,weight=0;
      for (let index=0; index<pixels.length; index+=4) {
        const alpha=pixels[index+3]/255;
        if (alpha < .55) continue;
        red+=pixels[index]*alpha;
        green+=pixels[index+1]*alpha;
        blue+=pixels[index+2]*alpha;
        weight+=alpha;
      }
      const divisor=Math.max(weight,1);
      const r=red/divisor,g=green/divisor,b=blue/divisor;
      return {r,g,b,luma:r*.2126+g*.7152+b*.0722};
    };
    const ticker = document.getElementById("weekly-trip-ticker");
    const canvas = document.getElementById("weekly-trip-ticker-canvas");
    const context = canvas.getContext("2d");
    const stack = document.querySelector(".center-map-stack");
    const mapPanel = stack.querySelector(".map-panel");
    const lower = document.querySelector(".lower-display-grid");
    const posterStack = document.querySelector(".left-module-stack");
    const instruments = document.querySelector(".instrument-rail");
    const lowerStyle = getComputedStyle(lower);
    const tickerStyle = getComputedStyle(ticker);
    const canvasStyle = getComputedStyle(canvas);
    return {
      expected,
      aria:canvas.getAttribute("aria-label"),
      portrait:document.documentElement.classList.contains("family-full-portrait"),
      lowerRowGap:parseFloat(lowerStyle.rowGap) || 0,
      canvasPixels:{width:canvas.width,height:canvas.height},
      scrollAxis:canvas.dataset.scrollAxis,
      paperGeometry:window.dadRadarWeeklyTicker ? window.dadRadarWeeklyTicker.PAPER : null,
      stack:rect(stack),mapPanel:rect(mapPanel),ticker:rect(ticker),lower:rect(lower),
      posterStack:posterStack ? rect(posterStack) : null,
      instruments:instruments ? rect(instruments) : null,
      rasterContrast:{
        paper:sample(context,180,80,1140,5),
        topRail:sample(context,180,25,1140,10),
        leftMechanism:sample(context,8,38,58,66)
      },
      tickerPaint:{backgroundImage:tickerStyle.backgroundImage,backgroundColor:tickerStyle.backgroundColor,
        borderTop:tickerStyle.borderTopWidth,borderRight:tickerStyle.borderRightWidth,
        borderBottom:tickerStyle.borderBottomWidth,borderLeft:tickerStyle.borderLeftWidth,
        before:getComputedStyle(ticker,"::before").content,after:getComputedStyle(ticker,"::after").content},
      canvasPaint:{backgroundImage:canvasStyle.backgroundImage,backgroundColor:canvasStyle.backgroundColor,transform:canvasStyle.transform,
        borderTop:canvasStyle.borderTopWidth,borderRight:canvasStyle.borderRightWidth,
        borderBottom:canvasStyle.borderBottomWidth,borderLeft:canvasStyle.borderLeftWidth,
        before:getComputedStyle(canvas,"::before").content,after:getComputedStyle(canvas,"::after").content}
    };
  }, expectedText);

  const first = await canvas.screenshot();
  if (label === "chromium-ticker-desktop" || label === "webkit-ticker-desktop") {
    fs.writeFileSync(path.join(output, `${label}-weekly-ticker-a.png`), first);
  }
  console.log(`${label}: ticker raster samples ${JSON.stringify(data.rasterContrast)}`);

  assert.equal(data.aria, expectedText, "Ticker shows the family-readable upcoming-trip summary");
  assert.deepEqual(data.canvasPixels, {width:1500,height:144}, "Ticker uses a shallow high-resolution backing canvas");
  assert.equal(data.scrollAxis, "vertical", "Ticker paper feed moves top-to-bottom rather than crawling sideways");
  assert(data.paperGeometry && (data.paperGeometry.right-data.paperGeometry.left)/1500>=.85,
    "Paper occupies nearly the full map-width mechanism opening");
  assert(data.rasterContrast.paper.luma > 150, "Paper remains readable instead of disappearing into the cabinet");
  assert(data.rasterContrast.paper.luma < 200, "Paper stays aged cream/tan instead of reading as bright white");
  assert(data.rasterContrast.paper.r - data.rasterContrast.paper.b > 22, "Paper keeps a warm aged-cream/tan tone");
  assert(data.rasterContrast.paper.luma > data.rasterContrast.topRail.luma + 65,
    "Ivory paper remains clearly distinct from the dark top machine rail");
  assert(data.rasterContrast.paper.luma > data.rasterContrast.leftMechanism.luma + 55,
    "Paper remains clearly distinct from the visible end mechanism");

  assert(Math.abs(data.ticker.left-data.mapPanel.left)<=1 && Math.abs(data.ticker.right-data.mapPanel.right)<=1,
    "Ticker occupies only the center-map column");
  assert(data.ticker.top>=data.mapPanel.bottom-1, "Ticker sits directly below the map, never over it");
  assert(data.ticker.bottom<=data.stack.bottom+1, "Ticker remains inside the existing center-stack height");

  if (data.portrait) {
    const expectedMapRowHeight = (data.lower.height - data.lowerRowGap) / 2;
    assert(Math.abs(data.stack.top-data.lower.top)<=1,
      "Portrait ticker stays at the top of the existing lower grid map row");
    assert(Math.abs(data.stack.height-expectedMapRowHeight)<=2,
      "Portrait ticker shares the pre-existing map row instead of growing the dashboard");
    assert(data.stack.bottom<data.lower.bottom-1,
      "Portrait map stack remains the first lower-grid row, not the whole lower grid");
    if (data.posterStack) {
      assert(data.posterStack.top>=data.stack.bottom+data.lowerRowGap-2,
        "Portrait poster row still begins after the existing row gap");
      assert(Math.abs(data.posterStack.bottom-data.lower.bottom)<=1,
        "Portrait poster row still ends at the existing lower-grid bottom");
    }
    if (data.instruments) {
      assert(data.instruments.top>=data.stack.bottom+data.lowerRowGap-2,
        "Portrait instruments stay in the existing second lower-grid row");
      assert(Math.abs(data.instruments.bottom-data.lower.bottom)<=1,
        "Portrait instruments still end at the existing lower-grid bottom");
    }
  } else {
    assert(Math.abs(data.stack.top-data.lower.top)<=1 && Math.abs(data.stack.bottom-data.lower.bottom)<=1,
      "Adding the ticker does not increase the cabinet/lower-grid height");
  }

  assert(data.mapPanel.height/data.stack.height>=.84 && data.mapPanel.height/data.stack.height<=.90,
    "The map reclaims most of the center-column height after the printer is made shallow");
  assert(data.ticker.height/data.stack.height>=.10 && data.ticker.height/data.stack.height<=.16,
    "Ticker stays a shallow map-width mechanism strip instead of making the unit vertically bulky");

  assert.equal(data.canvasPaint.transform, "none", "Ticker canvas is not vertically stretched by CSS");

  for (const paint of [data.tickerPaint,data.canvasPaint]) {
    assert.equal(paint.backgroundImage, "none", "No CSS-generated ticker artwork");
    assert(transparent(paint.backgroundColor), "Ticker wrapper/canvas stays transparent behind raster artwork");
    assert.deepEqual([paint.borderTop,paint.borderRight,paint.borderBottom,paint.borderLeft],["0px","0px","0px","0px"],
      "No CSS-painted ticker frame or paper border");
    assert(["none","normal"].includes(paint.before), "No CSS pseudo-element ticker artwork");
    assert(["none","normal"].includes(paint.after), "No CSS pseudo-element ticker artwork");
  }

  await page.waitForTimeout(2400);
  const second = await canvas.screenshot();
  assert(!first.equals(second), "Ticker paper/text advances vertically between electromechanical feed steps while the mechanism stays fixed");

  if (label === "chromium-ticker-desktop" || label === "webkit-ticker-desktop") {
    fs.writeFileSync(path.join(output, `${label}-weekly-ticker-b.png`), second);
  }

  if (label === "chromium-ticker-desktop" || label === "chromium-ticker-full-landscape") {
    await page.screenshot({path:path.join(output, `${label}-dashboard.png`), fullPage:false});
  }

  return data;
}

module.exports = {checkWeeklyTicker};
