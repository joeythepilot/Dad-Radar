'use strict';
// Immutable artwork identity is a source contract. Actual CSS wiring, seam,
// printed ink and lamp behavior are owned by the two-engine split-flap proof.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const bytes=fs.readFileSync(path.join(__dirname,'../assets/split-flap/split-flap-tile.png'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
 '90ba3a2379a88321a9801c8032443c2e1dba111fc9baad40068c8e579c0e3829',
 'Preserve the approved photoreal split-flap artwork byte for byte');
assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[637,640]);
for(const [file,sha] of [
 ['experimental-v2/experimental-fixed.png','9c3307472028cf533369931e3045fe3ba5dfebb0a8deee11a685f7a32cb33ece'],
 ['experimental-v2/experimental-surface.png','86bd88001e13a0ac4b80c2b09dc80ae701033900e6ed682faa5d191eb14b34e3'],
 ['experimental-v3/warm-lighting.svg','51da47dadacaefeb4f28a191f7d71618a88de2aec985b14d1685a560c6bdba4f']
]){
 const asset=fs.readFileSync(path.join(__dirname,'../assets/split-flap',file));
 // Git's Windows text checkout can use CRLF. Normalize only SVG line endings;
 // PNGs remain byte-exact and every other SVG character remains protected.
 const identity=bytes=>crypto.createHash('sha256').update(file.endsWith('.svg')?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes).digest('hex');
 assert.equal(identity(asset),sha,'Preserve Joey-approved primary artwork: '+file);
 if(file.endsWith('.svg')){
  assert.equal(identity(Buffer.from(asset.toString('utf8').replace(/\r?\n/g,'\r\n'))),sha,'Windows CRLF preserves approved SVG identity');
  assert.notEqual(identity(Buffer.from(asset.toString('utf8').replace('#ffe5ba','#000000'))),sha,'Actual SVG lighting edits must still fail identity');
 }
}
console.log('Approved split-flap artwork identity passed; rendered style is checked in browsers.');
