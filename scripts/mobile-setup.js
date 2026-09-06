'use strict';
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline/promises');
const {accessConfiguration}=require('../server/mobile-access');
async function main() {
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  try {
    console.log('Dad Radar private mobile setup\nComplete the Cloudflare Access application first. No API keys or tunnel tokens are needed here.');
    const team=(await rl.question('Access team domain (example: your-team.cloudflareaccess.com): ')).trim().replace(/^https:\/\//,'').replace(/\/$/,'');
    const audience=(await rl.question('Application Audience (AUD) tag: ')).trim();
    const origin=(await rl.question('Family HTTPS address [https://family.joeymaxwell.com]: ')).trim() || 'https://family.joeymaxwell.com';
    const emails=(await rl.question('Allowed family sign-in email addresses, separated by commas: ')).trim();
    const values={DAD_RADAR_ACCESS_TEAM:team,DAD_RADAR_ACCESS_AUD:audience,DAD_RADAR_MOBILE_ORIGIN:origin,DAD_RADAR_FAMILY_EMAILS:emails,DAD_RADAR_MOBILE_PORT:'4174'};
    if(Object.values(values).some(v=>/[\r\n"\\]/.test(v))) throw new Error('Please enter each value on one line without quotes.');
    accessConfiguration(values);
    const file=path.join(__dirname,'..','.env');
    let content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
    for(const [key,value] of Object.entries(values)) {
      const line=`${key}="${value}"`;
      const pattern=new RegExp(`^${key}=.*$`,'m');
      content=pattern.test(content)?content.replace(pattern,()=>line):content.replace(/\s*$/,'')+'\n'+line+'\n';
    }
    fs.writeFileSync(file,content,{mode:0o600});
    console.log('Saved. Restart with npm.cmd run beta:autostart:restart. Point the Cloudflare Tunnel at http://127.0.0.1:4174.');
  } finally {rl.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
