# Dad Radar Mobile: family-password setup

The current companion is one landscape screen: four split-flap rows and Today's Duty at left, a permanent map at right, arrival time on the map, and numerical speed/altitude. It uses the same Calendar and flight data as the home display. Mobile has no posters or Today/Live switch.

Family members enter one shared password. There are no email accounts or emailed codes. “Remember this device” keeps a sign-in for 30 days; unchecked sign-ins have a server-side maximum of 12 hours and a browser-session cookie. Clearing browser data or changing the family password requires signing in again. Remembered sessions survive normal PC/service restarts.

## 1. Install the update and choose the password

Run in Windows Command Prompt:

```bat
cd /d C:\Users\cfijo\Dad-Radar
git fetch origin agent/mobile-companion
git merge --ff-only FETCH_HEAD
npm.cmd test
npm.cmd run mobile:setup
```

Keep the suggested address `https://family.joeymaxwell.com`. Enter a family password of 12–128 characters, then confirm it. A few memorable words work well. The terminal deliberately hides the password while you type. Choose it on the PC; do not send it in chat.

Setup saves a salted scrypt hash in the local `.env`, selects password authentication, clears the old email-login settings, and preserves Calendar/provider settings. The plaintext password is not saved. Setup can be run again to change the password; this invalidates all prior sessions after restarting.

```bat
npm.cmd run beta:autostart:restart
```

The mobile gateway listens only on `127.0.0.1:4174`. To check that the login page is available before connecting the tunnel:

```bat
curl.exe -I -H "Host: family.joeymaxwell.com" http://127.0.0.1:4174/family/login
```

Expect `200 OK`. A request using a different Host is rejected intentionally. Password cookies require HTTPS, so actual sign-in is tested at the family address through the tunnel.

## 2. Finish Cloudflare Tunnel

The domain is now active on Cloudflare with nameservers `lorna.ns.cloudflare.com` and `max.ns.cloudflare.com`. The public `dadradar` CNAME continues to point to `joeythepilot.github.io`; leave that public information site in place. Use the separate hostname `family.joeymaxwell.com` for this app.

After the password gateway is installed, restarted and checked, remove the **Dad Radar Family** application under **Zero Trust → Access controls → Applications** for `family.joeymaxwell.com`. This removes Cloudflare's email/identity-provider prompt; DadRadar's password gateway now protects every remote page, asset and data request. Leave any unrelated Access applications in place. There is no need to add a broad Bypass policy.

In **Zero Trust → Networks → Connectors → Cloudflare Tunnels**, create a named tunnel called `Dad Radar` using the cloudflared connector. Select Windows and follow Cloudflare's installation instructions. Run the dashboard's service-install command in an Administrator terminal on the DadRadar PC. That command includes a private tunnel token: keep it on the PC, out of chat and Git.

Add a published application route:

| Field | Value |
| --- | --- |
| Subdomain | `family` |
| Domain | `joeymaxwell.com` |
| Path | Leave blank |
| Service type | HTTP |
| Service URL | `127.0.0.1:4174` |

Use **4174**. Port 4173 serves the local home display and does not have remote password protection. Keep the original public Host header; do not override it with localhost in the tunnel's HTTP settings. The tunnel handles external HTTPS; the HTTP hop stays on the PC. No router port forwarding is needed. Exclude the family hostname from any broad caching rules; the gateway sends `private, no-store` on all responses.

The home PC, DadRadar service and cloudflared service must stay running. Configure the PC to avoid sleeping while it serves the display.

## 3. Test and add the Home Screen icon

1. Turn off Wi-Fi on a phone to test cellular access.
2. Open `https://family.joeymaxwell.com`. The DadRadar password page should appear with no Cloudflare email prompt.
3. Enter the family password and keep “Remember this device” selected on a family-owned device.
4. Confirm flight number, arrival airport/time and position against the home display. Arrival is destination-local; duty times are Eastern.
5. In Safari, use **Share → Add to Home Screen**, and enable **Open as Web App** if offered. Open the new icon; if Safari asks for the password again in its separate app session, enter it there once.
6. Close and reopen the app, lock/unlock the phone, and confirm updates resume. A private browser window should still require the password. APIs must not show schedule or position without a valid session.

Delaney can use the same password on her iPad. Share it directly with Allison, Mom and your sister. They do not need Cloudflare accounts. An expired session returns the mobile app to its login page on the next protected data request. Offline mode displays an explicit offline screen; it does not save private flight data for offline use.

## Sign out or change the password

Visit `https://family.joeymaxwell.com/family/login` on a signed-in device and choose **Sign out of this device**. This revokes that session on the server, including after a restart.

To reset a forgotten password or revoke every device, run `npm.cmd run mobile:setup` on the PC and restart the service. There is no public password-reset endpoint or email dependency. Setting the same password again also creates a new salt and revokes old sessions after restart.

The server stores only hashes of random session tokens in the ignored `runtime/family-sessions.json` file. Deleting this file while DadRadar is stopped signs all devices out. A damaged/unreadable session file disables the remote gateway rather than opening access. Routine updates do not delete it.

## Validation and limits

Automated tests cover correct/incorrect passwords, cookie protection, remembered and short session expiry, restart persistence, logout replay, password rotation, origin/host checks, private APIs/artwork, diagnostic blocking, login rate limits and failure to write session storage. Existing Cloudflare JWT mode remains supported explicitly for other installations; password mode does not accept a Cloudflare token as a substitute for the password.

The shared password intentionally grants the same viewing access to each family member. Removing one person's access requires changing the shared password. Authentication grants viewing/flight lookup, not remote diagnostics or configuration. No additional flight-provider requests are introduced.

Physical iPhone/Home Screen and live tunnel validation are the final installation checks above; a browser preview cannot prove them.

## References

- [Cloudflare Tunnel setup](https://developers.cloudflare.com/tunnel/setup/)
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
