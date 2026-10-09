"use strict";
const assert = require('node:assert/strict');
const flap = require('./split-flap-state');
assert.equal(typeof flap.airlineBrandForState, 'function', 'Scheduled flight brand must be available independently of live callsign');
const brand = flight => flap.airlineBrandForState({flight});
for (const [carrier, expected] of [['AA','american'],['UA','united'],['DL','delta'],['WN','southwest'],['B6','jetblue'],['AS','alaska'],['G4','allegiant'],['MQ','american'],['ENY','american']]) {
  assert.equal(brand({carrierCode:carrier,number:'3761'}), expected, carrier);
}
assert.equal(brand({marketingCarrierCode:'UA',carrierCode:'OO',number:'SKW3761'}),'united');
assert.equal(brand({marketingCarrierCode:'DL',carrierCode:'YX',number:'RPA3761'}),'delta');
assert.equal(brand({carrierCode:'OO',number:'SKW3761'}),null,'Ambiguous operating carrier must remain blank');
assert.equal(brand({number:'ENY3761'}),null,'A live callsign alone is not scheduled branding');
assert.equal(brand({marketingCarrierCode:'ZZ',carrierCode:'AA'}),null,'Unknown explicit marketing carrier must not fall back to operator');
assert.equal(brand({carrierCode:'ZZ'}),null);
assert.equal(flap.airlineBrandForState({flight:null}),null);
console.log('Scheduled airline branding and ambiguous/unknown fallback passed.');
