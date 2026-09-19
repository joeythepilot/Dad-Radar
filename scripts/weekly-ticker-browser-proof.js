"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function transparent(color) {
  return color === "rgba(0, 0, 0, 0)" || color === "transparent";
}

async function checkWeeklyTicker(page, compact, label, output, expectedModules) {
  const bank = page.locator("#weekly-overnight-bank");

  if (compact) {
    assert.equal(await bank.count(), 0, "Compact keeps its existing layout without the weekly overnight bank");
    return null;
  }

  assert.equal(await bank.count(), 1, "Full/desktop gets exactly one weekly overnight bank");

  await page.waitForFunction(expected => {
    const node = document.getElementById("weekly-overnight-bank");
    if (!node) return false;
    const bays = [...node.querySelectorAll(".weekly-overnight-bay")];
    if (bays.length !== 7) return false;
    const labels = bays.map(bay => bay.getAttribute("aria-label"));
    if (JSON.stringify(labels) !== JSON.stringify(expected)) return false;
    const resources = performance.getEntriesByType("resource").map(entry => entry.name);
    return resources.some(name => name.includes("/assets/hardware/weekly-overnight/weekly-overnight-module.png"));
  }, expectedModules.map(module => module.day + " overnight " + (module.code === "HOME" ? "home" : module.code)),
  {timeout: 4000, polling: 25});

  await page.waitForFunction(() => {
    const art = document.querySelector(".weekly-overnight-module-art");
    return Boolean(art && art.complete && art.naturalWidth > 0);
  }, null, {timeout:4000,polling:25});

  await page.waitForFunction(() => {
    const panel = document.querySelector(".daily-schedule-panel.is-physical-duty-card");
    const art = panel?.querySelector(".daily-schedule-card-art");
    return Boolean(art && art.complete && art.naturalWidth > 0);
  }, null, {timeout:4000,polling:25});

  await page.waitForTimeout(120);

  const data = await page.evaluate(() => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const bank = document.getElementById("weekly-overnight-bank");
    const bays = [...bank.querySelectorAll(".weekly-overnight-bay")];
    const arts = [...bank.querySelectorAll(".weekly-overnight-module-art")];
    const canvases = [...bank.querySelectorAll(".weekly-overnight-module-canvas")];
    const stack = document.querySelector(".center-map-stack");
    const mapPanel = stack.querySelector(".map-panel");
    const lower = document.querySelector(".lower-display-grid");
    const posterStack = document.querySelector(".left-module-stack");
    const instruments = document.querySelector(".instrument-rail");
    const dutyPanel = document.querySelector(".daily-schedule-panel");
    const dutyArt = dutyPanel?.querySelector(".daily-schedule-card-art") ?? null;
    const lowerStyle = getComputedStyle(lower);
    const bankStyle = getComputedStyle(bank);
    const firstCanvasStyle = getComputedStyle(canvases[0]);
    return {
      portrait:document.documentElement.classList.contains("family-full-portrait"),
      lowerRowGap:parseFloat(lowerStyle.rowGap) || 0,
      stack:rect(stack),mapPanel:rect(mapPanel),bank:rect(bank),lower:rect(lower),
      posterStack:posterStack ? rect(posterStack) : null,
      instruments:instruments ? rect(instruments) : null,
      bayRects:bays.map(rect),
      bayLabels:bays.map(bay=>bay.getAttribute("aria-label")),
      artPixels:arts.map(art=>({width:art.naturalWidth,height:art.naturalHeight,src:art.getAttribute("src")})),
      canvasPixels:canvases.map(canvas=>({width:canvas.width,height:canvas.height})),
      duty:dutyPanel ? {
        physical:dutyPanel.classList.contains("is-physical-duty-card"),
        artSrc:dutyArt?.getAttribute("src") ?? "",
        artPixels:dutyArt ? {width:dutyArt.naturalWidth,height:dutyArt.naturalHeight} : null,
        context:dutyPanel.querySelector("#daily-schedule-context")?.textContent?.trim() ?? "",
        footer:dutyPanel.querySelector("#daily-schedule-footer")?.textContent?.trim() ?? "",
        rowCount:dutyPanel.querySelectorAll("#daily-schedule-list .daily-schedule-entry").length,
        nowBadgeCount:dutyPanel.querySelectorAll(".daily-schedule-now").length
      } : null,
      bankPaint:{
        backgroundImage:bankStyle.backgroundImage,backgroundColor:bankStyle.backgroundColor,
        borderTop:bankStyle.borderTopWidth,borderRight:bankStyle.borderRightWidth,
        borderBottom:bankStyle.borderBottomWidth,borderLeft:bankStyle.borderLeftWidth,
        columns:bankStyle.gridTemplateColumns
      },
      canvasPaint:{
        backgroundImage:firstCanvasStyle.backgroundImage,backgroundColor:firstCanvasStyle.backgroundColor,
        borderTop:firstCanvasStyle.borderTopWidth,borderRight:firstCanvasStyle.borderRightWidth,
        borderBottom:firstCanvasStyle.borderBottomWidth,borderLeft:firstCanvasStyle.borderLeftWidth
      }
    };
  });

  const first = await bank.screenshot();
  if (label === "chromium-ticker-desktop" || label === "webkit-ticker-desktop") {
    fs.writeFileSync(path.join(output, `${label}-weekly-overnight-a.png`), first);
  }

  assert.equal(data.bayRects.length,7,"Seven physical overnight bays are present");
  assert(data.artPixels.every(item=>item.width===149 && item.height===122),
    "Every bay uses the exact 149x122 production hardware asset");
  assert(data.artPixels.every(item=>item.src.includes("/assets/hardware/weekly-overnight/weekly-overnight-module.png")),
    "All seven bays reuse the approved production artwork");
  assert(data.canvasPixels.every(item=>item.width===149 && item.height===122),
    "Every live mechanical overlay uses the exact 149x122 design coordinate system");

  const widths=data.bayRects.map(item=>item.width);
  const minWidth=Math.min(...widths),maxWidth=Math.max(...widths);
  assert(maxWidth-minWidth<=1,"Seven bays divide the bank width equally");
  const totalWidth=widths.reduce((sum,width)=>sum+width,0);
  assert(Math.abs(totalWidth-data.bank.width)<=2,"Seven equal bays consume the entire ticker opening");

  assert(data.duty?.physical, "Today's Duty is rendered as the approved physical dispatch card");
  assert.equal(data.duty.artSrc, "/assets/ui/today-duty-card-v2.png", "Today's Duty uses the approved full-quality raster asset");
  assert.deepEqual(data.duty.artPixels, {width:2214,height:1000}, "Today's Duty keeps the exact 2.214:1 physical card artwork");
  assert.equal(data.duty.context, "DADDY IS FLYING TO COLUMBUS, OHIO", "The family live-status sentence remains on the physical card");
  assert.equal(data.duty.nowBadgeCount, 0, "The old NOW web badge is gone");
  if (label.endsWith("-desktop")) {
    assert.equal(data.duty.rowCount, 5, "The 1920x1080 physical card keeps all five duty rows visible");
    assert.equal(data.duty.footer, "HOME TONIGHT", "The physical card gives the family a simple end-of-day status");
  }

  assert(Math.abs(data.bank.left-data.mapPanel.left)<=1 && Math.abs(data.bank.right-data.mapPanel.right)<=1,
    "Weekly bank occupies only the center-map column");
  assert(data.bank.top>=data.mapPanel.bottom-1,"Weekly bank sits directly below the map, never over it");
  assert(data.bank.bottom<=data.stack.bottom+1,"Weekly bank remains inside the existing center-stack height");

  if (data.portrait) {
    const expectedMapRowHeight=(data.lower.height-data.lowerRowGap)/2;
    assert(Math.abs(data.stack.top-data.lower.top)<=1,
      "Portrait weekly bank stays at the top of the existing lower grid map row");
    assert(Math.abs(data.stack.height-expectedMapRowHeight)<=2,
      "Portrait weekly bank shares the pre-existing map row instead of growing the dashboard");
    assert(data.stack.bottom<data.lower.bottom-1,
      "Portrait map stack remains the first lower-grid row, not the whole lower grid");
    if(data.posterStack){
      assert(data.posterStack.top>=data.stack.bottom+data.lowerRowGap-2,
        "Portrait poster row still begins after the existing row gap");
      assert(Math.abs(data.posterStack.bottom-data.lower.bottom)<=1,
        "Portrait poster row still ends at the existing lower-grid bottom");
    }
    if(data.instruments){
      assert(data.instruments.top>=data.stack.bottom+data.lowerRowGap-2,
        "Portrait instruments stay in the existing second lower-grid row");
      assert(Math.abs(data.instruments.bottom-data.lower.bottom)<=1,
        "Portrait instruments still end at the existing lower-grid bottom");
    }
  } else {
    assert(Math.abs(data.stack.top-data.lower.top)<=1 && Math.abs(data.stack.bottom-data.lower.bottom)<=1,
      "Adding the weekly bank does not increase the cabinet/lower-grid height");
  }

  assert(data.mapPanel.height/data.stack.height>=.80 && data.mapPanel.height/data.stack.height<=.86,
    "The map still owns most of the center column");
  assert(data.bank.height/data.stack.height>=.14 && data.bank.height/data.stack.height<=.18,
    "Weekly bank remains inside the former ticker aperture");

  for (const paint of [data.bankPaint,data.canvasPaint]) {
    assert.equal(paint.backgroundImage,"none","No CSS-generated weekly hardware");
    assert(transparent(paint.backgroundColor),"Weekly wrapper/canvas stays transparent behind raster artwork");
    assert.deepEqual([paint.borderTop,paint.borderRight,paint.borderBottom,paint.borderLeft],["0px","0px","0px","0px"],
      "No CSS-painted weekly hardware border");
  }

  const changed = expectedModules.map(module=>({
    ...module,
    characters:module.characters.slice()
  }));
  changed[0] = {
    ...changed[0],
    code:"DFW",
    characters:["D","F","W"," "]
  };
  await page.evaluate(next=>{
    document.getElementById("weekly-overnight-bank").dadRadarWeeklyOvernight.setModules(next,{animate:true,rollover:false});
  },changed);
  await page.waitForTimeout(220);
  const during = await bank.screenshot();
  assert(!first.equals(during),"Overnight wheels visibly rotate when a schedule value changes");

  await page.waitForTimeout(1200);
  const after = await bank.screenshot();
  assert(!during.equals(after),"Mechanical wheel animation settles into its final state");
  assert.equal(await page.locator(".weekly-overnight-bay").first().getAttribute("aria-label"),
    changed[0].day+" overnight DFW","Changed bay updates its accessible overnight value");

  if (label === "chromium-ticker-desktop" || label === "webkit-ticker-desktop") {
    fs.writeFileSync(path.join(output, `${label}-weekly-overnight-b.png`), after);
  }
  if (label === "chromium-ticker-desktop" || label === "chromium-ticker-full-landscape") {
    await page.screenshot({path:path.join(output, `${label}-dashboard.png`),fullPage:false});
  }

  return data;
}

module.exports = {checkWeeklyTicker};
