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
console.log('Approved split-flap artwork identity passed; rendered style is checked in browsers.');
