"use strict";
const assert = require("node:assert/strict");
const {readDrumTime, readDrumPeriod, changedDrums, paintClock} = require("./clock-drums");
const printedInk = require("./printed-ink");

assert.deepEqual(readDrumTime("12:03:57 PM"), ["1", "2", "0", "3"],
  "Current Eastern time loses seconds, not its noon hour");
assert.deepEqual(readDrumTime("9:07 AM"), ["", "9", "0", "7"],
  "One-digit hours leave the first physical drum blank");
assert.deepEqual(readDrumTime("12:00 AM"), ["1", "2", "0", "0"],
  "Midnight keeps the familiar 12-hour notation");
assert.deepEqual(readDrumTime("7:42 PM"), ["", "7", "4", "2"],
  "Existing ETA values retain their 12-hour digits");
assert.equal(readDrumPeriod("12:00 AM"), "AM", "Midnight identifies the morning roller position");
assert.equal(readDrumPeriod("12:00 PM"), "PM", "Noon identifies the afternoon roller position");
assert.equal(readDrumPeriod("7:42 PM"), "PM", "An available ETA identifies its period");
for (const unavailable of ["--:--", "ESTIMATED", "DELAYED", "ARRIVED", null]) {
  assert.deepEqual(readDrumTime(unavailable), ["", "", "", ""],
    `ETA ${unavailable} leaves four mechanically blank drums`);
  assert.equal(readDrumPeriod(unavailable), "", `ETA ${unavailable} blanks the period roller`);
}
assert.deepEqual(changedDrums(readDrumTime("9:07:01 AM"), readDrumTime("9:07:59 AM")), [],
  "Second ticks do not index minute drums");
assert.deepEqual(changedDrums(readDrumTime("9:07 AM"), readDrumTime("9:08 AM")), [3],
  "Only the changed wheel indexes at a normal minute tick");
assert.deepEqual(changedDrums(readDrumTime("9:59 AM"), readDrumTime("10:00 AM")), [0, 1, 2, 3],
  "The hour rollover indexes all four affected wheels");

const document = {createElementNS(namespace, tag) {
  return {
    tag, attributes: {}, children: [],
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    replaceChildren(...children) { this.children = children; },
    remove() { this.parentNode.children = this.parentNode.children.filter(child => child !== this); }
  };
}};
const drums = Array.from({length:4}, () => document.createElementNS("svg", "g"));
const lamps = Array.from({length:4}, () => document.createElementNS("svg", "ellipse"));
const period = document.createElementNS("svg", "g");
const clock = {ownerDocument: document, getAttribute() { return "eta"; },
  querySelectorAll(selector) { return selector === ".drum-lamp" ? lamps : drums; },
  parentNode: {querySelector() { return period; }}};
assert.deepEqual(paintClock(clock, "9:07 AM", printedInk), [1, 2, 3]);
assert.deepEqual(lamps.map(lamp=>lamp.getAttribute("data-lit")),["false","true","true","true"],
  "Blank leading drums are not illuminated");
assert.equal(drums[0].children.length, 0, "The leading blank has no ink path");
assert.equal(drums[1].children[0].children[0].attributes["data-printed-ink"], "9",
  "A numbered drum carries an outlined, distressed print rather than browser text");
assert(drums[1].children[0].children[0].children.some(node => node.tag === "g" && node.children.some(child => child.tag === "path")),
  "The actual number is an SVG outline on the drum");
assert.equal(period.getAttribute("data-period-value"), "AM", "The physical indicator indexes to morning");
assert.equal(period.children[0].children[0].attributes["data-printed-ink"], "AM",
  "The period is screen-printed outlined ink, not floating browser text");
assert.deepEqual(paintClock(clock, "9:07:59 AM", printedInk), [],
  "The clock doesn't repaint and animate on second ticks");
const morningPrint = period.children[0];
paintClock(clock, "9:08 PM", printedInk);
assert.equal(period.getAttribute("data-period-value"), "PM", "AM to PM changes the physical roller");
assert.notEqual(period.children[0], morningPrint, "The period indexes when it changes");
assert.deepEqual(paintClock(clock, "ARRIVED", printedInk), [1, 2, 3]);
assert(drums.every(drum => drum.children.length === 0), "Arrival clears ink from every ETA wheel");
assert(lamps.every(lamp=>lamp.getAttribute("data-lit")==="false"), "Arrival turns off every ETA lamp");
assert.equal(period.getAttribute("data-period-value"), "", "Arrival mechanically blanks the period");
assert.equal(period.children.length, 0, "The blank period has no ink");
console.log("Clock drum interpretation and indexing passed.");
