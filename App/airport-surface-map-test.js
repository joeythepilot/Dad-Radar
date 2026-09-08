"use strict";
const assert = require("node:assert/strict");
const api = require("./airport-surface-map");
const catalog = require("../data/airport-catalog");
const avl = catalog.lookupAirport("AVL"), ord = catalog.lookupAirport("ORD"), den = catalog.lookupAirport("DEN");
const now = Date.parse("2026-09-08T13:00:00Z");
const position = {latitude: avl.latitude, longitude: avl.longitude, recordedAt: new Date(now - 2000).toISOString(),
  onGround: true, source: "adsb_icao", speed: 0, heading: 178};
assert.equal(api.selectAirport(position, [avl, ord], now, null).airport.code, "AVL");
assert.equal(api.selectAirport({...position, source: "ADSB"}, [avl, ord], now, null).airport.code, "AVL");
for (const change of [{onGround: false}, {onGround: null}, {recordedAt: null}, {source: "mlat"}, {containment: 500},
  {accuracy: 3}, {latitude: null}, {longitude: -120}, {recordedAt: new Date(now + 10000).toISOString()}]) {
  assert.equal(api.selectAirport({...position, ...change}, [avl, ord], now, null), null);
}
assert.equal(api.selectAirport(position, [avl, ord], now + 100000, null), null, "Stale data cannot start a close-up.");
assert.equal(api.selectAirport(position, [avl, ord], now + 100000, "AVL").stale, true);
assert.equal(api.selectAirport(position, [avl, ord], now + 300000, "AVL"), null);
const east = api.project({latitude: den.latitude, longitude: den.longitude + 0.01 / Math.cos(den.latitude * Math.PI / 180)}, den);
const north = api.project({latitude: den.latitude + 0.01, longitude: den.longitude}, den);
assert(Math.abs(east.x + north.y) < 0.01, "Equal ground distances keep equal scale in both axes.");
const b = api.fitBounds([{x: -1000, y: -2000}, {x: 1000, y: 2000}], 2.4);
assert(Math.abs(b.width / b.height - 2.4) < 1e-10);
assert.equal(api.fieldAltitude({latitude: den.latitude, longitude: den.longitude, altitude: den.elevationFeet + 1000}, [den, avl]), 1000);
assert.equal(api.fieldAltitude({latitude: den.latitude, longitude: den.longitude, altitude: null}, [den]), null);

// Minimal DOM replay exercises actual SVG output, aircraft updates, source outages and flight changes.
class Element {
  constructor(tag) {this.tag = tag; this.children = []; this.attributes = {}; this.hidden = false; this.textContent = "";}
  setAttribute(key, value) {this.attributes[key] = String(value);}
  appendChild(child) {this.children.push(child); return child;}
  removeChild(child) {this.children.splice(this.children.indexOf(child), 1);}
  get firstChild() {return this.children[0];}
  get lastChild() {return this.children[this.children.length - 1];}
  getBoundingClientRect() {return {width: 600, height: 280};}
}
const document = {createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag)};
const shell = new Element("div");
const maps = {};
function mapFor(airport) {
  return {code: airport.code, fetchedAt: new Date(now).toISOString(), features: [
    {kind: "runway", width: 45, closed: false, label: "17/35", points: [[airport.longitude, airport.latitude - 0.02], [airport.longitude, airport.latitude + 0.02]]},
    {kind: "terminal", width: 5, closed: true, label: "", points: [[airport.longitude + 0.001, airport.latitude], [airport.longitude + 0.002, airport.latitude], [airport.longitude + 0.002, airport.latitude + 0.001], [airport.longitude + 0.001, airport.latitude]]}
  ]};
}
let clock = now, requests = 0;
const controller = api.createController({document, shell, lookup: catalog.lookupAirport, now: () => clock,
  load: (code, done) => {requests++; done(null, {map: maps[code] || null, pending: true, retryAfterMs: 10000});}});
const state = {eventId: "one", flight: {number: "1234", origin: "AVL", destination: "ORD", surfacePosition: position}};
assert.equal(controller.render(state), false, "Regional map stays available while geometry downloads.");
maps.AVL = mapFor(avl); maps.ORD = mapFor(ord); clock += 10001;
assert.equal(controller.render(state), true);
assert.equal(requests, 4);
const layer = shell.lastChild, svg = layer.firstChild, plane = svg.lastChild;
assert.equal(svg.firstChild.attributes.class, "airport-surface-terminal");
assert.match(svg.children.find(e => e.attributes.class === "airport-surface-runway").attributes.d, /^M/);
assert.equal(plane.lastChild.attributes.visibility, "visible");
assert.equal(svg.children.find(e => e.attributes.class === "airport-surface-runway").attributes.style, "fill:none", "Open centerlines cannot inherit polygon fill from chart CSS.");
assert.equal(layer.lastChild.href, "https://www.openstreetmap.org/copyright");
const transform = plane.attributes.transform;
controller.render({...state, flight: {...state.flight, latitude: avl.latitude + 0.005, longitude: avl.longitude + 0.005}});
assert.equal(plane.attributes.transform, transform, "Animated regional coordinates cannot move the ground marker.");
clock = now + 100000;
assert.equal(controller.render(state), true);
assert.match(layer.children[1].textContent, /LAST POSITION/);
assert.equal(plane.attributes.transform, transform, "A coverage gap freezes the received position.");
clock = now + 301000;
assert.equal(controller.render(state), false);
assert.equal(layer.hidden, true);
clock = now;
assert.equal(controller.render(state), true);
assert.equal(controller.render({...state, flight: {...state.flight, surfacePosition: {...position, source: "ADSB", speed: 2}}}), true,
  "A provider switch to current FR24 ADSB keeps the airport chart available.");
assert.equal(controller.render({...state, flight: {...state.flight, surfacePosition: {...position, onGround: false}}}), false, "Takeoff returns to regional view immediately.");
const arrival = {...state, flight: {...state.flight, surfacePosition: {...position, latitude: ord.latitude, longitude: ord.longitude}}};
assert.equal(controller.render(arrival), true, "The same flight can enter destination airport view after landing.");
assert.match(layer.children[1].textContent, /^ORD/);
assert.equal(controller.render({...state, eventId: "two", flight: {...state.flight, surfacePosition: null}}), false, "A replacement flight cannot inherit the last ground location.");
assert.equal(controller.render({locationAirport: "AVL"}), false, "Home/layover uses the regular map.");
console.log("Airport map projection, camera and ground-position replay tests passed.");
