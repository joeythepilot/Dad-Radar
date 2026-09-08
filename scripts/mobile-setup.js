'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {Writable} = require('node:stream');
const readline = require('node:readline/promises');
const {accessConfiguration} = require('../server/mobile-access');
const {hashPassword} = require('../server/family-password');
function updateSettings(content, values) {
  for (const [key, value] of Object.entries(values)) {
    if (/[\r\n"\\]/.test(value)) throw new Error('Settings must be on one line without quotes.');
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, 'gm');
    // Replace duplicates too, so dotenv cannot select a stale earlier value.
    content = pattern.test(content) ? content.replace(pattern, () => line) : content.replace(/\s*$/, '') + '\n' + line + '\n';
  }
  return content;
}
async function main() {
  if (!process.stdin.isTTY) throw new Error('Run mobile:setup in an interactive terminal so the password can be entered privately.');
  let muted = false;
  const output = new Writable({write(chunk, encoding, done) {if (!muted) process.stdout.write(chunk, encoding); done();}});
  output.columns = process.stdout.columns;
  const rl = readline.createInterface({input: process.stdin, output, terminal: true});
  async function secret(prompt) {
    process.stdout.write(prompt);
    muted = true;
    try {return await rl.question('');} finally {muted = false; process.stdout.write('\n');}
  }
  try {
    console.log('Dad Radar family-password setup\nUse a few memorable words (12–128 characters). Typing the password will not display it.');
    const origin = (await rl.question('Family HTTPS address [https://family.joeymaxwell.com]: ')).trim() || 'https://family.joeymaxwell.com';
    const password = await secret('Choose family password: ');
    const confirmation = await secret('Enter it again: ');
    if (password !== confirmation) throw new Error('Passwords did not match. Nothing was changed.');
    const values = {DAD_RADAR_MOBILE_AUTH: 'password', DAD_RADAR_FAMILY_PASSWORD_HASH: await hashPassword(password),
      DAD_RADAR_MOBILE_ORIGIN: origin, DAD_RADAR_MOBILE_PORT: '4174',
      DAD_RADAR_ACCESS_TEAM: '', DAD_RADAR_ACCESS_AUD: '', DAD_RADAR_FAMILY_EMAILS: ''};
    accessConfiguration(values);
    const file = path.join(__dirname, '..', '.env');
    const content = updateSettings(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', values);
    fs.writeFileSync(`${file}.tmp`, content, {mode: 0o600});
    fs.renameSync(`${file}.tmp`, file);
    console.log('Saved the password hash. Existing Calendar and flight-provider settings were preserved.');
    console.log('Restart: npm.cmd run beta:autostart:restart\nTunnel destination: http://127.0.0.1:4174\nAfter restarting, remove the Cloudflare Access application for the family hostname to use this password login.');
    console.log('Running this setup again changes the password and signs out all devices after restart.');
  } finally {rl.close();}
}
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {updateSettings};
