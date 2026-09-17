const assert = require("node:assert/strict");

const {
  entryCapacity,
  selectVisibleEntries,
  buildDutyCardView
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
  "The legacy iPad layout should prioritize the current and next duty items."
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

assert.equal(
  typeof buildDutyCardView,
  "function",
  "Today's Duty exposes a physical-card view model."
);

const fiveLegDuty = {
  dateLabel: "THU SEP 17",
  timeZoneLabel: "EASTERN TIME",
  context: "DADDY IS FLYING TO COLUMBUS, OHIO",
  entries: [
    {time:"6:10 AM",label:"AVL → CLT",tag:"FLT 4101",status:"completed",kind:"flight"},
    {time:"8:05 AM",label:"CLT → CMH",tag:"FLT 4102",status:"current",kind:"flight"},
    {time:"10:45 AM",label:"CMH → ORD",tag:"FLT 4103",status:"upcoming",kind:"flight"},
    {time:"1:20 PM",label:"ORD → GRB",tag:"FLT 4104",status:"upcoming",kind:"flight"},
    {time:"4:15 PM",label:"GRB → AVL",tag:"COMMUTE",status:"upcoming",kind:"flight"}
  ]
};

const cardView = buildDutyCardView(fiveLegDuty, 1920, {homeAirport:"AVL"});
assert.equal(cardView.context, fiveLegDuty.context, "The family live-status sentence remains the visual priority.");
assert.equal(cardView.rows.length, 5, "A five-leg day keeps all five readable assignment rows on the HP 23es display.");
assert.deepEqual(cardView.rows[1], {
  number:2,
  route:"CLT → CMH · FLT 4102",
  time:"8:05 AM",
  status:"current"
}, "Duty-card rows combine route and tag while keeping time in its dedicated field.");
assert.equal(cardView.footerText, "HOME TONIGHT", "A final leg to the home airport gives the family a simple end-of-day status.");

const mobileFullCardView = buildDutyCardView(
  fiveLegDuty,
  1024,
  {homeAirport:"AVL", rowCapacity:5}
);
assert.equal(
  mobileFullCardView.rows.length,
  5,
  "Mobile Full must use the physical card's five ruled rows instead of truncating the day to two items."
);
assert.deepEqual(
  mobileFullCardView.rows.map((row) => row.route),
  cardView.rows.map((row) => row.route),
  "Mobile Full should show the same full-day assignment list as the desktop physical card."
);

const mixedDutyFreeDay = {
  dateLabel: "THU SEP 17",
  timeZoneLabel: "EASTERN TIME",
  context: "DADDY IS TAXIING FOR CHICAGO, ILLINOIS",
  entries: [
    {time:"ALL DAY",label:"HOME · DAY OFF",tag:"OFF DUTY",status:"current",kind:"duty-free"},
    {time:"11:30 AM",label:"AVL → ORD",tag:"COMMUTE",status:"current",kind:"flight"},
    {time:"6:27 PM",label:"ORD → CMH",tag:"FLT 3917",status:"upcoming",kind:"flight"},
    {time:"8:50 PM",label:"CMH → ORD",tag:"FLT 3917",status:"upcoming",kind:"flight"},
    {time:"11:30 PM",label:"ORD → CMI",tag:"FLT 3375",status:"upcoming",kind:"flight"}
  ]
};
const mixedView = buildDutyCardView(mixedDutyFreeDay, 1024, {homeAirport:"AVL", rowCapacity:5});
assert.deepEqual(
  mixedView.rows.map((row) => row.route),
  [
    "AVL → ORD · COMMUTE",
    "ORD → CMH · FLT 3917",
    "CMH → ORD · FLT 3917",
    "ORD → CMI · FLT 3375"
  ],
  "A stale all-day day-off placeholder must not consume a Today’s Duty row when real flying exists."
);
assert.equal(mixedView.totalEntries, 4, "The physical card should count only the real assignment rows on a flying day.");

console.log(
  "Daily schedule layout tests passed."
);