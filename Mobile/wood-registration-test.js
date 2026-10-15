'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const filename=path.join(__dirname,'wood-registration.js');
assert(fs.existsSync(filename),'Independent photographic wood registration must exist');
const {planWoodPieces,planWoodBacking}=require(filename);
const source={x:16,width:2140,rows:[[10,76],[100,75],[189,76],[278,77],[369,76],[458,76],[548,75],[636,76]]};
const regions=[{id:'map',x:10,y:20,width:200,height:100,trim:3}];
const pieces=planWoodPieces(regions,source);
assert.equal(pieces.length,4,'Four actual stock pieces form a frame');
assert.deepEqual(pieces.map(p=>p.side),['top','right','bottom','left']);
assert.deepEqual(pieces.map(p=>[p.x,p.y,p.width,p.height]),[[7,17,206,3],[210,20,3,100],[7,120,206,3],[7,20,3,100]]);
for(const p of pieces){
 assert(p.sw>0&&p.sh>0&&p.width>0&&p.height>0);
 const length=p.vertical?p.height:p.width,thickness=p.vertical?p.width:p.height;
 assert(Math.abs(length/p.sw-thickness/p.sh)<1e-10,'Photographic grain has one scale in both axes');
 assert(p.sx>=16&&p.sx+p.sw<=2156+1e-9);
 assert(p.sy>=source.rows[p.row][0]&&p.sy+p.sh<=source.rows[p.row][0]+source.rows[p.row][1]+1e-9);
 assert(p.x+p.width<=10||p.x>=210||p.y+p.height<=20||p.y>=120,'Trim cannot enter original aperture');
}
assert.equal(new Set(pieces.map(p=>p.row)).size,4,'Adjacent pieces use distinct photographed grain');
assert(planWoodPieces(regions,{...source,minScale:.5}).every(p=>p.scale===.5),'Broad infill and narrow stock can share one physical grain scale');
assert.deepEqual(planWoodPieces([{x:0,y:0,width:0,height:10,trim:3}],source),[]);
assert.deepEqual(planWoodPieces([],source),[]);
assert.throws(()=>planWoodPieces(regions,{width:0,rows:[]}),/source/);
assert.equal(typeof planWoodBacking,'function','A continuous photographic backing covers the whole faceplate');
const backing=planWoodBacking(600,900,{width:2400,height:800},0);
assert.deepEqual(backing,{x:0,y:0,width:600,height:900,scale:.75,sw:1200,sh:800,sx:600,sy:0});
assert.deepEqual(planWoodBacking(600,900,{width:2400,height:800},1),{x:0,y:0,width:600,height:900,scale:1,sw:900,sh:600,sx:750,sy:100});
for(const [w,h]of[[844,475],[390,1000],[320,1000],[1024,576]]){
 const p=planWoodBacking(w,h,{width:2172,height:724},0);
 assert(Math.abs(p.height/p.sw-p.width/p.sh)<1e-10,'Backing grain is never stretched');
 assert(p.sx>=0&&p.sy>=0&&p.sx+p.sw<=2172+1e-9&&p.sy+p.sh<=724+1e-9,'One genuine source crop, never padding or tiling');
}
assert.equal(planWoodBacking(0,900,{width:2400,height:800}),null);
assert.throws(()=>planWoodBacking(600,900,{width:0,height:800}),/source/);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Mobile_Walnut_Source_v1.png'))).digest('hex'),'b8bbdbb07e9459d7faf4b09314f536df6de0886e4f7fab132f55a5c147faaafc');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Mobile_Walnut_Infill_v1.png'))).digest('hex'),'1f3df9fb4c2703ed6629e46f6c107ed85a2cdb780300d20defdcdf2c711301d2');
console.log('Independent photographed walnut pieces: exact framing, isotropic crops, distinct stock, bounds and zero-size handling passed.');
