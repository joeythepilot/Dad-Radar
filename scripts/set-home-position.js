'use strict';
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {writePrivateHomePosition,DEFAULT_FILE}=require('../server/private-home-position');

async function run() {
  if(process.argv.length>2)throw new Error('Enter coordinates at the local prompts, not as command-line arguments.');
  let latitude,longitude;
  if(process.stdin.isTTY) {
    const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
    try {
      latitude=await prompt.question('Home latitude (decimal degrees): ');
      longitude=await prompt.question('Home longitude (decimal degrees): ');
    } finally {prompt.close();}
  } else [latitude,longitude]=fs.readFileSync(0,'utf8').split(/\r?\n/);
  if(!latitude?.trim()||!longitude?.trim())throw new Error('Both latitude and longitude are required.');
  writePrivateHomePosition(process.env.DADRADAR_HOME_POSITION_FILE||DEFAULT_FILE,
    {latitude:Number(latitude),longitude:Number(longitude)});
  console.log('Private home position saved locally. Restart the Beacon server to activate it.');
  console.log('Home airport and time zone have not changed.');
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
