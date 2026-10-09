"use strict";
// FlightAware published schedules, not live callsigns or a pilot-specific default.
// API schema: /schedules/{date_start}/{date_end}, include_regional/codeshares.
const {FLIGHTAWARE_AEROAPI_BASE_URL} = require('./flightaware-route-service');
const cache = new Map();
const pending = new Map();
const WINDOW_MS = 90 * 60 * 1000;
const aliases = {AAL:'AA',UAL:'UA',DAL:'DL',SWA:'WN',JBU:'B6',ASA:'AS',AAY:'G4'};
function ident(value) {
 const match=String(value||'').trim().toUpperCase().match(/^([A-Z][A-Z0-9]|[0-9][A-Z]|[A-Z]{3})(\d{1,4})$/);
 return match ? {code:aliases[match[1]]||match[1],number:Number(match[2])} : null;
}
function matchScheduledAirline(records,event) {
 const expected=Date.parse(event?.times?.startUtc||event?.startUtc||'');
 if(!Number.isFinite(expected))return null;
 const matches=new Map();
 for(const record of records||[]) {
   const marketed=ident(record.ident_iata)||ident(record.ident_icao)||ident(record.ident);
   const time=Date.parse(record.scheduled_out||'');
   if(!marketed||marketed.number!==Number(event.flightNumber)||!Number.isFinite(time)||Math.abs(time-expected)>WINDOW_MS)continue;
   if(String(record.origin_iata||record.origin||'').toUpperCase()!==event.origin||String(record.destination_iata||record.destination||'').toUpperCase()!==event.destination)continue;
   const marketingCarrierCode=({MQ:'AA',ENY:'AA'})[marketed.code]||marketed.code;
   const operatingIdent=record.actual_ident_icao||record.actual_ident_iata||record.actual_ident||record.ident_icao||record.ident_iata||record.ident;
   const operator=ident(operatingIdent);
   const key=[marketingCarrierCode,operator?`${operator.code}${operator.number}`:operatingIdent,time].join('|');
   matches.set(key,{marketingCarrierCode,operatingIdent,scheduledOut:record.scheduled_out,
     provider:'flightaware-schedules',origin:event.origin,destination:event.destination,flightNumber:event.flightNumber});
 }
 return matches.size===1?[...matches.values()][0]:null;
}
async function enrichScheduledAirline(event,options={}) {
 const apiKey=options.apiKey??process.env.FLIGHTAWARE_AEROAPI_KEY;
 const now=Number((options.now||Date.now)());
 const start=Date.parse(event?.times?.startUtc||event?.startUtc||'');
 const end=Date.parse(event?.times?.endUtc||event?.endUtc||'');
 if(!apiKey||event?.kind!=='flight'||event.marketingCarrierCode||!Number.isFinite(start)||!/^\d{1,4}$/.test(String(event.flightNumber))||!/^[A-Z]{3}$/.test(event.origin)||!/^[A-Z]{3}$/.test(event.destination))return event;
 const key=[event.flightNumber,event.origin,event.destination,start].join('|');
 const store=options.cache||cache;
 let entry=store.get(key);
 // Reuse authoritative evidence for held flights before restricting fresh lookups.
 if((!entry||entry.expires<=now)&&(start-now>7*24*3600000||now-(Number.isFinite(end)?end:start)>6*3600000))return event;
 if(!entry||entry.expires<=now) {
   const load=async()=>{
     const abort=new AbortController();let timer;
     try {
       const query=new URLSearchParams({origin:event.origin,destination:event.destination,flight_number:String(Number(event.flightNumber)),include_codeshares:'true',include_regional:'true',max_pages:'3'});
       const base=String(options.baseUrl||FLIGHTAWARE_AEROAPI_BASE_URL).replace(/\/$/,'');
       const url=`${base}/schedules/${encodeURIComponent(new Date(start-WINDOW_MS).toISOString())}/${encodeURIComponent(new Date(start+WINDOW_MS).toISOString())}?${query}`;
       const request=async()=>{
         const response=await (options.fetchImpl||fetch)(url,{headers:{Accept:'application/json','x-apikey':apiKey},signal:abort.signal});
         if(!response.ok)return null;
         const data=await response.json();
         return data.links?.next?null:matchScheduledAirline(data.scheduled,event);
       };
       const result=await Promise.race([request(),new Promise(resolve=>{timer=setTimeout(()=>{abort.abort();resolve(null);},options.timeoutMs??5000);})]);
       return {result,expires:now+(result?24*3600000:30*60000)};
     } catch {return {result:null,expires:now+30*60000};}
     finally {clearTimeout(timer);}
   };
   // Only the process cache shares in-flight work; injected test caches stay isolated.
   if(store===cache) {
     if(!pending.has(key))pending.set(key,load().finally(()=>pending.delete(key)));
     entry=await pending.get(key);
   } else entry=await load();
   store.delete(key);store.set(key,entry);
   while(store.size>128)store.delete(store.keys().next().value);
 }
 return entry.result?{...event,marketingCarrierCode:entry.result.marketingCarrierCode,airlineResolution:entry.result}:event;
}
async function enrichScheduledAirlines(schedule,options={}) {
 if(!Array.isArray(schedule?.events))return schedule;
 return {...schedule,events:await Promise.all(schedule.events.map(event=>enrichScheduledAirline(event,options)))};
}
module.exports={matchScheduledAirline,enrichScheduledAirline,enrichScheduledAirlines};
