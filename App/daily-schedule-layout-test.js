const assert = require("node:assert/strict");

const {
  entryCapacity,
  selectVisibleEntries
} = require("./daily-schedule-layout");

const entries = [
  { id: "one", status: "completed" },
  { id: "two", status: "completed" },
  { id: "three", status: "current" },
  { id: "four", status: "upcoming" },
  { id: "five", status: "upcoming" }
];

assert.equal(entryCapacity(1024), 2);
assert.equal(entryCapacity(1280), 3);
assert.equal(entryCapacity(1600), 4);
assert.equal(entryCapacity(1920), 5);

assert.deepEqual(
  selectVisibleEntries(
    entries,
    1024
  ).map((entry) => entry.id),
  ["three", "four"],
  "The iPad layout should prioritize the current and next duty items."
);

assert.deepEqual(
  selectVisibleEntries(
    entries,
    1280
  ).map((entry) => entry.id),
  ["two", "three", "four"],
  "The compact desktop layout should retain nearby context."
);

assert.deepEqual(
  selectVisibleEntries(
    entries,
    1920
  ).map((entry) => entry.id),
  entries.map((entry) => entry.id),
  "The HP 23es layout should show the full duty list when it fits."
);

console.log(
  "Daily schedule layout tests passed."
);
