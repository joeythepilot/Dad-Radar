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
              {latitude: 41.55, longitude: -87.45},
              {latitude: 40.80, longitude: -85.20},
              {latitude: 40.20, longitude: -83.55}
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

function project(code) {
  const airport = airportCatalog.lookupAirport(code);
  const x = 315 + (airport.longitude + 135) / 80 * 570;
  const y = 45 + (62 - airport.latitude) / 57 * 560;
  return {x, y};
}

const origin = project("ORD");
const destination = project("CMH");
const pathData = layer.children[0].attributes.d;

assert.match(
  pathData,
  new RegExp(`^M ${origin.x.toFixed(1)} ${origin.y.toFixed(1)}\\b`),
  "Persistent history starts at the actual origin airport even if ADS-B began later."
);
assert.match(
  pathData,
  new RegExp(`${destination.x.toFixed(1)} ${destination.y.toFixed(1)}$`),
  "Persistent history reaches the destination airport even if ADS-B ended before the gate."
);

console.log("Sequence history map endpoint tests passed.");
