"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const catalog = require("../data/airport-catalog");

const DAY = 86400000;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["runway", "taxiway", "apron", "terminal"];

function airportForCode(code) {
  if (!/^[A-Z0-9]{3,4}$/.test(code)) return null;
  const airport = catalog.lookupAirport(code);
  return airport && Number.isFinite(airport.latitude) && Number.isFinite(airport.longitude) ? airport : null;
}

function queryForAirport(airport) {
  // One bounded request per field, not a background scan or a tile download.
  return `[out:json][timeout:20];way(around:7000,${airport.latitude},${airport.longitude})["aeroway"~"^(runway|taxiway|apron|terminal)$"];out geom;`;
}

function normalizeGeometry(data, airport, fetchedAt) {
  if (!Array.isArray(data.elements) || data.remark) throw new Error("Incomplete airport geometry");
  let vertices = 0;
  const features = [];
  for (const item of data.elements) {
    const kind = item.tags?.aeroway;
    if (item.type !== "way" || !TYPES.includes(kind) || !Array.isArray(item.geometry)) continue;
    const points = item.geometry.map(p => [p.lon, p.lat]);
    if (points.length < 2 || points.some(p => !p.every(Number.isFinite) || Math.abs(p[1] - airport.latitude) > 0.15 ||
      Math.abs((p[0] - airport.longitude) * Math.cos(airport.latitude * Math.PI / 180)) > 0.15)) continue;
    vertices += points.length;
    if (vertices > 100000 || features.length >= 8000) throw new Error("Airport geometry exceeds limit");
    const closed = points.length > 3 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1];
    features.push({kind, points, closed, label: String(item.tags.ref || "").slice(0, 30),
      width: Math.min(100, Math.max(5, parseFloat(item.tags.width) || (kind === "runway" ? 45 : 20)))});
  }
  if (!features.some(f => f.kind === "runway")) throw new Error("Airport detail unavailable");
  return {version: 1, code: airport.code, latitude: airport.latitude, longitude: airport.longitude,
    fetchedAt, source: "OpenStreetMap contributors", license: "ODbL-1.0", features};
}

async function readBoundedJson(response) {
  if (!response.ok) throw new Error(`Airport source HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("Airport response too large");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error("Airport response too large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createAirportSurfaceService(options = {}) {
  const cacheDir = options.cacheDir || path.join(__dirname, "../runtime/airport-maps");
  const now = options.now || Date.now;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const report = options.report || (() => {});
  const entries = new Map();
  const loads = new Map();
  const queue = [];
  let worker = null;
  let nextRequestAt = 0;

  async function entryFor(airport) {
    if (entries.has(airport.code)) return entries.get(airport.code);
    if (!loads.has(airport.code)) loads.set(airport.code, (async () => {
      let map = null;
      try {
        const filename = path.join(cacheDir, `${airport.code}.json`);
        if ((await fs.stat(filename)).size <= MAX_BYTES) {
          const saved = JSON.parse(await fs.readFile(filename, "utf8"));
          if (saved.version === 1 && saved.code === airport.code && Array.isArray(saved.features) && Number.isFinite(Date.parse(saved.fetchedAt))) map = normalizeGeometry({elements: saved.features.map(f => ({
            type: "way", tags: {aeroway: f.kind, ref: f.label, width: f.width},
            geometry: f.points.map(p => ({lon: p[0], lat: p[1]}))
          }))}, airport, saved.fetchedAt);
        }
      } catch { /* First visit or damaged cache: fetch a replacement. */ }
      const entry = {map, pending: false, retryAt: 0};
      entries.set(airport.code, entry);
      return entry;
    })().finally(() => loads.delete(airport.code)));
    return loads.get(airport.code);
  }

  async function drain() {
    while (queue.length) {
      const {airport, entry} = queue.shift();
      try {
        const delay = Math.max(0, nextRequestAt - now());
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        const response = await fetchImpl("https://overpass-api.de/api/interpreter", {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(25000),
          headers: {"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Dad-Radar/1.0 (family airport display)"},
          body: new URLSearchParams({data: queryForAirport(airport)}).toString()
        });
        const map = normalizeGeometry(await readBoundedJson(response), airport, new Date(now()).toISOString());
        // Serve good data even if the disk is temporarily unwritable.
        entry.map = map;
        try {
          await fs.mkdir(cacheDir, {recursive: true});
          const filename = path.join(cacheDir, `${airport.code}.json`);
          await fs.writeFile(`${filename}.tmp`, JSON.stringify(map));
          await fs.rename(`${filename}.tmp`, filename);
        } catch { report("airport-cache-write-failed", {airport: airport.code}); }
      } catch {
        // Keep the last complete map, and don't hammer a public service on errors/429s.
        entry.retryAt = now() + DAY;
        report("airport-detail-unavailable", {airport: airport.code, cached: Boolean(entry.map)});
      } finally {
        entry.pending = false;
        nextRequestAt = now() + (options.spacingMs ?? 2000);
      }
    }
  }

  async function get(code) {
    const airport = airportForCode(String(code).toUpperCase());
    if (!airport) return null;
    const entry = await entryFor(airport);
    const stale = !entry.map || now() - Date.parse(entry.map.fetchedAt) > 30 * DAY;
    if (stale && !entry.pending && now() >= entry.retryAt && queue.length < 12) {
      entry.pending = true;
      queue.push({airport, entry});
      if (!worker) worker = drain().finally(() => {worker = null;});
    }
    return {ok: true, map: entry.map, pending: entry.pending, stale: Boolean(entry.map && stale),
      retryAfterMs: entry.pending ? 10000 : Math.max(60000, entry.retryAt - now())};
  }

  return {get, idle: async () => {while (worker) await worker;}};
}

module.exports = {createAirportSurfaceService, airportForCode, queryForAirport, normalizeGeometry};
