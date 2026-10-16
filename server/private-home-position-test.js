'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const file=path.join(__dirname,'private-home-position.js');
assert.ok(fs.existsSync(file),'Private home-origin configuration and server projection are not implemented');
const {readPrivateHomePosition,publicHomePointerState,writePrivateHomePosition}=require(file);
const airports=require('../data/airport-catalog');
const math=require('../App/instrument-math');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'beacon-home-test-'));
const target=path.join(dir,'private-home-position.json');
const home={latitude:35.123456789,longitude:-82.987654321}; // Fictional, not a household.
const publicFile=path.join(__dirname,'..','config','private-home-position-test-fixture.json');
try {
  assert.throws(()=>writePrivateHomePosition(publicFile,home),{message:'Private home position file must be outside public directories.'});
} finally {try{fs.unlinkSync(publicFile);}catch(_) {}}
assert.equal(readPrivateHomePosition(target),null,'Unset origin preserves the airport fallback');
writePrivateHomePosition(target,home);
assert.deepEqual(readPrivateHomePosition(target),home,'Private configuration survives process restart');
if(process.platform!=='win32')assert.equal(fs.statSync(target).mode&0o777,0o600,'New local file is owner read/write on POSIX');
for(const invalid of [{latitude:null,longitude:2},{latitude:'',longitude:2},{latitude:91,longitude:2},{latitude:2,longitude:181},{latitude:2},{...home,address:'must not be retained'}]) {
 assert.throws(()=>writePrivateHomePosition(target,invalid),{message:'Private home position is invalid. Re-enter it locally.'});
 assert.deepEqual(readPrivateHomePosition(target),home,'Invalid input cannot replace the working setting');
}
const live={status:'EN ROUTE',homeAirport:'AVL',flight:{latitude:38,longitude:-80,heading:90}};
const projected=publicHomePointerState(live,home,airports.getAirportCoordinates);
assert.equal(projected.homePointerAngle,math.homePointerAngle({home,position:live.flight,heading:90}));
assert.notEqual(projected.homePointerAngle,math.homePointerAngle({home:airports.getAirportCoordinates('AVL'),position:live.flight,heading:90}),'House origin is distinct from the home airport');
assert.deepEqual(live,{status:'EN ROUTE',homeAirport:'AVL',flight:{latitude:38,longitude:-80,heading:90}},'Projection cannot mutate the source');
assert.equal(publicHomePointerState({status:'HOME'},home,airports.getAirportCoordinates).homePointerAngle,0);
assert.equal(publicHomePointerState({status:'EN ROUTE',flight:{...home,heading:90}},home,airports.getAirportCoordinates).homePointerResting,true);
assert.equal(publicHomePointerState({status:'UNKNOWN'},home,airports.getAirportCoordinates).homePointerAngle,null);
assert.equal(publicHomePointerState({status:'ARRIVED',locationAirport:'ORD'},home,airports.getAirportCoordinates).homePointerAngle,math.homePointerAngle({home,position:airports.getAirportCoordinates('ORD')}));
assert.equal(publicHomePointerState(live,null,airports.getAirportCoordinates),live,'No configured private origin keeps the legacy representation');
const exported=JSON.stringify(projected);
for(const secret of [String(home.latitude),String(home.longitude),'privateHomePosition','homePosition','address'])assert.ok(!exported.includes(secret),'Public state must not include private-origin fields');
fs.writeFileSync(target,'invalid JSON containing private inputs');
assert.throws(()=>readPrivateHomePosition(target),{message:'Private home position is invalid. Re-enter it locally.'});
console.log('Private home position: validation, persistence, bearing projection, fallback and non-disclosure passed.');
