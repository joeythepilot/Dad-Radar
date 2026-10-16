'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const math=require('../App/instrument-math');
const DEFAULT_FILE=path.join(__dirname,'..','runtime','private-home-position.json');
const INVALID='Private home position is invalid. Re-enter it locally.';
const PUBLIC_DIRECTORIES=['Mobile','App','UI','assets','config','data','models','services'];

function privateFile(file) {
  const resolved=path.resolve(file);
  // Resolve existing symlinks too, including a parent of a not-yet-created file.
  function canonical(value) {
    try{return fs.realpathSync(value);}catch(error) {
      if(error.code!=='ENOENT')throw new Error(INVALID);
      const parent=path.dirname(value);
      return parent===value?value:path.join(canonical(parent),path.basename(value));
    }
  }
  const candidate=canonical(resolved);
  for(const directory of PUBLIC_DIRECTORIES) {
    const root=canonical(path.join(__dirname,'..',directory));
    const relative=path.relative(root,candidate);
    if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))) {
      throw new Error('Private home position file must be outside public directories.');
    }
  }
  return resolved;
}

function validated(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='latitude,longitude'||
    typeof value.latitude!=='number'||typeof value.longitude!=='number'||
    !Number.isFinite(value.latitude)||!Number.isFinite(value.longitude)||
    Math.abs(value.latitude)>90||Math.abs(value.longitude)>180)throw new Error(INVALID);
  return Object.freeze({latitude:value.latitude,longitude:value.longitude});
}
function readPrivateHomePosition(file=DEFAULT_FILE) {
  file=privateFile(file);
  try{return validated(JSON.parse(fs.readFileSync(file,'utf8')));}
  catch(error){if(error.code==='ENOENT')return null;throw new Error(INVALID);}
}
function writePrivateHomePosition(file=DEFAULT_FILE,value) {
  file=privateFile(file);
  const position=validated(value);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temporary=file+'.'+crypto.randomUUID()+'.tmp';
  try {
    fs.writeFileSync(temporary,JSON.stringify(position)+'\n',{mode:0o600,flag:'wx'});
    fs.renameSync(temporary,file);
  } catch (_) {
    try{fs.unlinkSync(temporary);}catch(_){}
    throw new Error('Private home position could not be saved. Check local file permissions.');
  }
}
function publicHomePointerState(state,home,lookupAirportCoordinates) {
  if(!home)return state;
  const position=math.homePointerPosition(state,lookupAirportCoordinates);
  const atHome=String(state?.status??'').toUpperCase()==='HOME';
  const angle=atHome?0:math.homePointerAngle({home,position,
    heading:math.flightForInstruments(state)?.heading});
  // The existing near-origin tolerance returns upright at every card heading.
  // Keep that rest state distinct from a genuine zero-degree geographic bearing.
  const resting=atHome||(math.homePointerAngle({home,position,heading:0})===0&&
    math.homePointerAngle({home,position,heading:90})===0);
  // Only the derived angle crosses the server/display boundary. Never add home
  // coordinates, an address, configuration objects or a copy of these inputs.
  return {...state,homePointerAngle:angle,homePointerResting:resting};
}
module.exports={readPrivateHomePosition,writePrivateHomePosition,publicHomePointerState,DEFAULT_FILE};
