"use strict";
const assert = require('node:assert/strict');
const service = require('./scheduled-airline-service');
const start = '2026-10-09T12:20:00Z';
const event = {kind:'flight',id:'number-only',flightNumber:'3553',carrierCode:null,marketingCarrierCode:null,
  origin:'MIA',destination:'MSY',times:{startUtc:start,endUtc:'2026-10-09T14:20:00Z'},liveLookupCandidates:['AA3553','ENY3553']};
const record = (code, extra={}) => ({ident_iata:`${code}3553`,origin_iata:'MIA',destination_iata:'MSY',scheduled_out:start,...extra});
async function run() {
 for (const code of ['AA','UA','DL','WN','B6','AS','G4']) {
   const brand = service.matchScheduledAirline([record(code)],event);
   assert.equal(brand.marketingCarrierCode,code,`Number-only ${code} flight resolves without a pilot-specific default`);
 }
 const regional = service.matchScheduledAirline([record('UA',{actual_ident_icao:'SKW5501'})],event);
 assert.equal(regional.marketingCarrierCode,'UA');
 assert.equal(regional.operatingIdent,'SKW5501','United Express keeps its independently identified operator');
 assert.equal(service.matchScheduledAirline([record('AA'),record('UA')],event),null,'Same-number codeshare ambiguity stays unresolved');
 assert.equal(service.matchScheduledAirline([record('UA',{origin_iata:'MSY',destination_iata:'MIA'})],event),null,'Reverse leg cannot brand the scheduled flight');
 assert.equal(service.matchScheduledAirline([record('UA',{scheduled_out:'2026-10-10T12:20:00Z'})],event),null,'Next-day reuse cannot brand today');
 assert.equal(service.matchScheduledAirline([record('UA',{ident_iata:'UA3554'})],event),null,'Route alone cannot pick another number');
 assert.equal(service.matchScheduledAirline([record('OO',{actual_ident_icao:'SKW3553'})],event).marketingCarrierCode,'OO','An ambiguous regional operator is not presumed United');
 const cache=new Map();let calls=0;
 const options={apiKey:'fixture',now:()=>Date.parse(start),cache,fetchImpl:async url=>{
   calls++;const query=new URL(url);assert.equal(query.searchParams.get('flight_number'),'3553');
   assert.equal(query.searchParams.get('origin'),'MIA');assert.equal(query.searchParams.get('destination'),'MSY');
   assert.equal(query.searchParams.has('airline'),false,'Lookup cannot default to American');
   return {ok:true,json:async()=>({scheduled:[record('UA',{actual_ident_icao:'SKW5501'})],links:{next:null}})};
 }};
 const enriched=await service.enrichScheduledAirline(event,options);
 assert.equal(enriched.marketingCarrierCode,'UA');assert.equal(enriched.carrierCode,null,'Existing operator field remains intact');
 assert.deepEqual(enriched.times,event.times);assert.deepEqual(enriched.liveLookupCandidates,event.liveLookupCandidates,'Brand enrichment does not rewrite tracking candidates');
 const held=await service.enrichScheduledAirline(event,{...options,now:()=>Date.parse('2026-10-09T20:20:00.001Z')});
 assert.equal(held.marketingCarrierCode,'UA','A held flight retains valid cached schedule evidence past the lookup age cutoff');
 await service.enrichScheduledAirline(event,options);assert.equal(calls,1,'Repeated calendar polls reuse cached resolution');
 await service.enrichScheduledAirline({...event,marketingCarrierCode:'AA'},options);assert.equal(calls,1,'Explicit scheduled brand remains authoritative');
 const failed=await service.enrichScheduledAirline(event,{...options,cache:new Map(),fetchImpl:async()=>{throw Error('offline')}});
 assert.deepEqual(failed,event,'Lookup failure cannot prevent calendar flight publication');
 const partial=await service.enrichScheduledAirline(event,{...options,cache:new Map(),fetchImpl:async()=>({ok:true,json:async()=>({scheduled:[record('UA')],links:{next:'/aeroapi/schedules/next'}})})});
 assert.deepEqual(partial,event,'Truncated schedule results cannot establish uniqueness');
 const upcoming=await service.enrichScheduledAirline(event,{...options,cache:new Map(),now:()=>Date.parse(start)-3*24*3600000});
 assert.equal(upcoming.marketingCarrierCode,'UA','Upcoming weekly flights resolve before the prior twelve-hour limit');
 const timeout=await service.enrichScheduledAirline(event,{...options,cache:new Map(),timeoutMs:5,fetchImpl:()=>new Promise(()=>{})});
 assert.deepEqual(timeout,event,'An unresponsive provider cannot stall calendar publication');
 console.log('Scheduled airline resolution, all seven brands, regional operator separation, ambiguity, cache and outage tests passed.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
