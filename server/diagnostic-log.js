"use strict";

const MAX_ENTRIES = 200;
const entries = [];

function addDiagnostic(type, details = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value) || value === null
    )
  );

  entries.push({
    at: new Date().toISOString(),
    type: String(type),
    ...safeDetails
  });

  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

function recentDiagnostics(limit = 50) {
  const count = Math.max(1, Math.min(Number(limit) || 50, MAX_ENTRIES));
  return entries.slice(-count);
}

module.exports = {
  addDiagnostic,
  recentDiagnostics
};
