"use strict";
(function(root) {
  let printSerial = 0;
  const blank = () => ["", "", "", ""];
  function parseTime(value) {
    const match = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*$/i.exec(String(value || ""));
    if (!match) return null;
    const hour = Number(match[1]);
    if (hour < 1 || hour > 12 || Number(match[2]) > 59) return null;
    return match;
  }
  function readDrumTime(value) {
    const match = parseTime(value);
    if (!match) return blank();
    const hour = Number(match[1]);
    return [(hour < 10 ? "" : match[1][0]), String(hour % 10), ...match[2]];
  }
  function readDrumPeriod(value) { return parseTime(value)?.[3].toUpperCase() || ""; }
  function changedDrums(before, after) {
    return after.map((digit, index) => before[index] === digit ? -1 : index).filter(index => index !== -1);
  }
  function fitPrimaryClock(clock) {
    const html = clock.ownerDocument.documentElement;
    if (!html || html.hasAttribute("data-family-full")) return;
    const art = clock.closest?.(".twin-clock-art");
    if (!art || art.hasAttribute("data-primary-clock")) return;
    // Keep the physical opening fixed. Its upper 1/8 inch is behind the faceplate;
    // align the exposed assembly with the split-flap, preserve the approved
    // square apertures, and reserve a central band for the engraved faceplate.
    art.setAttribute("viewBox", "220 0 1340 670");
    art.setAttribute("preserveAspectRatio", "xMinYMin slice");
    Array.from(art.querySelectorAll(".drum-clock")).forEach((row, index) => {
      row.querySelector(".clock-caption")?.remove();
      const top = index * 458;
      Array.from(row.querySelectorAll(".clock-wheel,.period-wheel")).forEach(wheel => {
        wheel.setAttribute("y", String(top));
        wheel.setAttribute("height", "210");
        wheel.setAttribute("preserveAspectRatio", "xMidYMid meet");
      });
      Array.from(row.querySelectorAll(".clock-colon circle")).forEach((dot, i) =>
        dot.setAttribute("cy", String(top + (i === 0 ? 78 : 137))));
    });
    art.setAttribute("data-primary-clock", "true");
  }
  function paintClock(clock, value, printedInk) {
    fitPrimaryClock(clock);
    const caption = clock.querySelector?.(".clock-caption");
    if (caption && !caption.children.length) {
      const label = caption.getAttribute("data-label");
      caption.appendChild(printedInk.svg(clock.ownerDocument, label, {
        height: 30, cellWidth: 23, material: "paper", ink: "#d9c59f",
        seed: `clock-caption-${clock.getAttribute?.("data-clock")}`,
        idPrefix: `clock-caption-${clock.getAttribute?.("data-clock")}`
      }).element);
    }
    const digits = readDrumTime(value);
    const drums = Array.from(clock.querySelectorAll("[data-drum]"));
    Array.from(clock.querySelectorAll(".drum-lamp")).forEach((lamp, index) =>
      lamp.setAttribute("data-lit", String(Boolean(digits[index]))));
    const changed = [];
    drums.forEach((drum, index) => {
      const next = digits[index];
      if (drum.getAttribute("data-digit") === next) return;
      if (drum.getAttribute("data-digit") === null && !next) {
        drum.setAttribute("data-digit", "");
        return;
      }
      const outgoing = Array.from(drum.children);
      for (const old of outgoing) {
        if (old.addEventListener) {
          old.setAttribute("class", "drum-print drum-exit");
          old.setAttribute("data-outgoing", "true");
          old.addEventListener("animationend", () => old.remove(), {once: true});
          root.setTimeout(() => { if (old.parentNode) old.remove(); }, 500);
        } else old.remove();
      }
      drum.setAttribute("data-digit", next);
      if (next) {
        const print = printedInk.svg(clock.ownerDocument, next, {
          height: 170, cellWidth: 135, material: "wheel", ink: "#e9d9b5",
          seed: `clock-${clock.getAttribute?.("data-clock") || "clock"}-${index}`,
          idPrefix: `clock-${clock.getAttribute?.("data-clock") || "clock"}-${index}-${next}-${++printSerial}`
        });
        const carrier = clock.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
        carrier.setAttribute("class", outgoing.length ? "drum-print drum-index-after" : "drum-print");
        print.element.setAttribute("transform", `translate(${-print.width / 2} ${-print.height / 2})`);
        carrier.appendChild(print.element);
        drum.appendChild(carrier);
      }
      changed.push(index);
    });
    const period = clock.parentNode?.querySelector?.(`[data-period="${clock.getAttribute?.("data-clock")}"] .period-ink`);
    const nextPeriod = readDrumPeriod(value);
    Array.from(clock.querySelectorAll(".period-lamp")).forEach(lamp =>
      lamp.setAttribute("data-lit", String(Boolean(nextPeriod))));
    if (period && period.getAttribute("data-period-value") !== nextPeriod) {
      period.setAttribute("data-period-value", nextPeriod);
      period.replaceChildren();
      if (nextPeriod) {
        const print = printedInk.svg(clock.ownerDocument, nextPeriod, {
          height: 125, cellWidth: 95, material: "wheel", ink: "#e9d9b5",
          seed: `clock-period-${clock.getAttribute?.("data-clock")}`,
          idPrefix: `clock-period-${clock.getAttribute?.("data-clock")}-${nextPeriod}-${++printSerial}`
        });
        const carrier = clock.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
        carrier.setAttribute("class", "period-print");
        print.element.setAttribute("transform", `translate(${-print.width / 2} ${-print.height / 2})`);
        carrier.appendChild(print.element);
        period.appendChild(carrier);
      }
    }
    return changed;
  }
  const api = {readDrumTime, readDrumPeriod, changedDrums, paintClock};
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.dadRadarClockDrums = api;
})(globalThis);

