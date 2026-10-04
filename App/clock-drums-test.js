"use strict";
const assert = require("node:assert/strict");
const {readDrumTime, changedDrums, paintClock} = require("./clock-drums");
const printedInk = require("./printed-ink");

assert.deepEqual(readDrumTime("12:03:57 PM"), ["1", "2", "0", "3"],
  "Current Eastern time loses seconds, not its noon hour");
assert.deepEqual(readDrumTime("9:07 AM"), ["", "9", "0", "7"],
  "One-digit hours leave the first physical drum blank");
assert.deepEqual(readDrumTime("12:00 AM"), ["1", "2", "0", "0"],
  "Midnight keeps the familiar 12-hour notation");
assert.deepEqual(readDrumTime("7:42 PM"), ["", "7", "4", "2"],
  "Existing ETA values retain their 12-hour digits");
for (const unavailable of ["--:--", "ESTIMATED", "DELAYED", "ARRIVED", null]) {
  assert.deepEqual(readDrumTime(unavailable), ["", "", "", ""],
    `ETA ${unavailable} leaves four mechanically blank drums`);
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
const clock = {ownerDocument: document, querySelectorAll() { return drums; }};
assert.deepEqual(paintClock(clock, "9:07 AM", printedInk), [1, 2, 3]);
assert.equal(drums[0].children.length, 0, "The leading blank has no ink path");
assert.equal(drums[1].children[0].children[0].attributes["data-printed-ink"], "9",
  "A numbered drum carries an outlined, distressed print rather than browser text");
assert(drums[1].children[0].children[0].children.some(node => node.tag === "g" && node.children.some(child => child.tag === "path")),
  "The actual number is an SVG outline on the drum");
assert.deepEqual(paintClock(clock, "9:07:59 AM", printedInk), [],
  "The clock doesn't repaint and animate on second ticks");
assert.deepEqual(paintClock(clock, "ARRIVED", printedInk), [1, 2, 3]);
assert(drums.every(drum => drum.children.length === 0), "Arrival clears ink from every ETA wheel");
console.log("Clock drum interpretation and indexing passed.");
