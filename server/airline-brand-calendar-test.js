"use strict";
const assert=require("node:assert/strict");
const {parsePilotEvent}=require("./pilot-schedule-parser");
const {airlineBrandForState}=require("../App/split-flap-state");
function event(description, extra={}) {
  return parsePilotEvent({summary:"Flight 3761 ORD->AVL",description,
    start:{dateTime:"2026-10-09T10:00:00Z"},end:{dateTime:"2026-10-09T12:00:00Z"},...extra});
}
const description=code=>`Flight: ${code}3761 Stations: ORD->AVL Time: 2026-10-09T10:00:00 - 2026-10-09T12:00:00`;
for(const [code,brand] of [["AA","american"],["UA","united"],["DL","delta"],["WN","southwest"],["B6","jetblue"],["AS","alaska"],["G4","allegiant"]]) {
  const parsed=event(description(code));
  assert.equal(parsed.carrierCode,code);
  assert.equal(airlineBrandForState({flight:parsed}),brand);
}
const branded=event(description("OO")+" Marketing carrier: United Express");
assert.equal(branded.carrierCode,"OO","Tracking carrier unchanged");
assert.equal(branded.marketingCarrierCode,"UA","Scheduled brand wins over ambiguous regional operator");
assert.equal(airlineBrandForState({flight:{...branded,number:"SKW3761"}}),"united");
assert.equal(airlineBrandForState({flight:event(description("OO")+" Operated by United Express")}),null,"Operator text is not marketing evidence");
assert.equal(airlineBrandForState({flight:event(description("AA")+" Marketing carrier: ZZ")}),null,"Unknown explicit brand remains blank");
assert.equal(airlineBrandForState({flight:event(description("AA"),{extendedProperties:{private:{marketingCarrierCode:"DL"}}})}),"delta","Authoritative calendar metadata");
assert.equal(airlineBrandForState({flight:event(description(""))}),null,"Unbranded calendar flight is safe blank, never presumed American");
const {reconcileScheduleWithLive}=require("../models/live-flight-state");
const now="2026-10-09T11:00:00Z";
const scheduled={mode:"EN_ROUTE",event:{id:"same-leg",origin:"ORD",destination:"AVL",flightNumber:"3761",
  times:{startUtc:"2026-10-09T10:00:00Z",endUtc:"2026-10-09T12:00:00Z"}},
  state:{eventId:"same-leg",status:"EN ROUTE",flight:{carrierCode:"OO",origin:"ORD",destination:"AVL",number:"OO3761",marketingCarrierCode:"DL"}}};
const previous={...scheduled,state:{...scheduled.state,livePhase:"EN_ROUTE",liveData:true,
  flight:{...scheduled.state.flight,number:"SKW3761",marketingCarrierCode:"UA",altitude:34000,progress:60}}};
for(const code of ["DL","UNKNOWN",null]) {
  const current={...scheduled,state:{...scheduled.state,flight:{...scheduled.state.flight,marketingCarrierCode:code}}};
  const held=reconcileScheduleWithLive(current,null,{now,previousResolved:previous});
  assert.equal(held.state.flight.marketingCarrierCode,code,"Current scheduled brand wins when tracking is held");
  assert.equal(held.state.flight.carrierCode,"OO");
  assert.equal(held.state.flight.altitude,34000,"Held telemetry remains unchanged");
}
console.log("Calendar marketing brands, alphanumeric IATA codes, unknown and operator separation passed.");
