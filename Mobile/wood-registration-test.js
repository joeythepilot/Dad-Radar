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
const {planProfileFrames}=require(filename);
assert.equal(typeof planProfileFrames,'function','Profiled frame joinery must be planned independently from flat trim');
const profileSource={x:16,width:1500,rows:[[8,54],[70,54],[132,54],[194,54]],minScale:.1};
const joined=planProfileFrames([{id:'map',x:20,y:30,width:100,height:50,trim:5}],profileSource,200,150);
assert.equal(joined.length,4);
assert.deepEqual(joined.map(p=>p.polygon),[
 [[15,25],[125,25],[120,30],[20,30]],
 [[125,25],[125,85],[120,80],[120,30]],
 [[125,85],[15,85],[20,80],[120,80]],
 [[15,85],[15,25],[20,30],[20,80]]
],'Four actual miter cuts meet at common inner/outer corners, not overlapping rectangular strips');
assert.deepEqual(joined.map(p=>p.rotation),[0,90,180,270],'Profiled inner edges all face their opening');
assert.deepEqual(joined.map(p=>[p.length,p.thickness]),[[110,5],[60,5],[110,5],[60,5]]);
for(const p of joined){assert(Math.abs(p.length/p.sw-p.thickness/p.sh)<1e-10);assert.equal(p.scale,.1);assert(p.sx>=16&&p.sx+p.sw<=1516);assert(p.sy>=profileSource.rows[p.row][0]&&p.sy+p.sh<=profileSource.rows[p.row][0]+54);}
const adjacent=planProfileFrames([{id:'left',x:10,y:10,width:30,height:20,trim:5},{id:'right',x:46,y:10,width:30,height:20,trim:5}],profileSource,100,100);
assert.equal(Math.max(...adjacent.filter(p=>p.id==='left').flatMap(p=>p.polygon.map(v=>v[0]))),43);
assert.equal(Math.min(...adjacent.filter(p=>p.id==='right').flatMap(p=>p.polygon.map(v=>v[0]))),43,'Adjacent frames share the available stile without overpainting each other');
assert.deepEqual(planProfileFrames([{x:1,y:1,width:0,height:5,trim:2}],profileSource,100,100),[]);
const stacked=planProfileFrames([{id:'above',x:10,y:10,width:30,height:20,trim:5},{id:'below',x:10,y:36,width:30,height:20,trim:5}],profileSource,100,100);
assert.equal(Math.max(...stacked.filter(p=>p.id==='above').flatMap(p=>p.polygon.map(v=>v[1]))),33);
assert.equal(Math.min(...stacked.filter(p=>p.id==='below').flatMap(p=>p.polygon.map(v=>v[1]))),33,'Stacked frames share available rail without overpainting');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Walnut_Profile_Atlas_v2.png'))).digest('hex'),'a299c20f3b474f334f3af223352d0e1dd26e2c6520d296a300135e7f69ef3e8d','Profiled photographic stock must remain byte-identical');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/hardware/HomingBeacon_Map_Walnut_Frame_Study_v3.png'))).digest('hex'),'071b84c85cd915090ec28e211fb0f31b434f5347a644bfb0701d09e7bc993364','The approved complete map photograph must remain byte-identical');
console.log('Profiled photographic joinery: literal miter corners, inward-facing returns, shared rails/stiles, uniform crops and preserved approved material passed.');
