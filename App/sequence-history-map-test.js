"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const airportCatalog = require("../data/airport-catalog");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "sequence-history-map.js"),
  "utf8"
);

class FakeElement {
  constructor(documentRef) {
    this.documentRef = documentRef;
    this.attributes = {};
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.isConnected = true;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") {
      this.documentRef.elements[String(value)] = this;
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
    children.forEach(child => { child.parentNode = this; });
  }
}

const fakeDocument = {
  elements: {},
  createElementNS() {
    return new FakeElement(fakeDocument);
  },
  getElementById(id) {
    return this.elements[id] ?? null;
  }
};

const svg = new FakeElement(fakeDocument);
svg.setAttribute("id", "route-map-svg");
const shadow = new FakeElement(fakeDocument);
shadow.setAttribute("id", "map-route-shadow");
shadow.parentNode = svg;

const listeners = {};
const fakeWindow = {
  dadRadarAirports: airportCatalog,
  addEventListener(name, handler) {
    listeners[name] = handler;
  }
};

vm.runInNewContext(SOURCE, {
  console,
  document: fakeDocument,
  window: fakeWindow
});

listeners["dad-radar:visual-state-change"]({
  detail: {
    state: {
      sequenceHistory: {
        currentEventKey: "current",
        legs: [
          {
            eventKey: "old-leg",
            eventId: "ord-cmh",
            origin: "ORD",
            destination: "CMH",
            track: [
              {latitude: 41.97689, longitude: -87.89888},
              {latitude: 40.80, longitude: -85.20},
              {latitude: 40.20, longitude: -83.55},
              // Slow final approach/taxi samples. Each individual move projects
              // under the simplifier threshold, but the cumulative tail is real.
              {latitude: 40.0500, longitude: -83.0500},
              {latitude: 40.0400, longitude: -83.0200},
              {latitude: 40.0300, longitude: -82.9900},
              {latitude: 40.0200, longitude: -82.9600},
              {latitude: 40.0100, longitude: -82.9300},
              {latitude: 40.001358, longitude: -82.875122}
            ]
          },
          {
            eventKey: "current",
            eventId: "ord-cmi",
            origin: "ORD",
            destination: "CMI",
            track: []
          }
        ]
      }
    }
  }
});

const layer = fakeDocument.getElementById("map-sequence-history-layer");
assert(layer, "Sequence history creates its SVG layer.");
assert.equal(layer.children.length, 1, "Only prior legs are rendered as persistent history.");

function projectPoint(latitude, longitude) {
  return {
    x: 315 + (longitude + 135) / 80 * 570,
    y: 45 + (62 - latitude) / 57 * 560
  };
}

const recordedStart = projectPoint(41.97689, -87.89888);
const recordedEnd = projectPoint(40.001358, -82.875122);
const pathData = layer.children[0].attributes.d;

assert.match(
  pathData,
  new RegExp(`^M ${recordedStart.x.toFixed(1)} ${recordedStart.y.toFixed(1)}\\b`),
  "Persistent history begins at the first recorded telemetry point."
);
assert.match(
  pathData,
  new RegExp(`${recordedEnd.x.toFixed(1)} ${recordedEnd.y.toFixed(1)}$`),
  "Persistent history must preserve the final recorded telemetry point even through a long sequence of sub-threshold slow moves."
);

console.log("Sequence history map endpoint tests passed.");
