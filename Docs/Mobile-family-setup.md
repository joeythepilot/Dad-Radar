# Dad Radar Mobile: family setup

The v11 mobile companion adds `/mobile` to the existing Windows server. It uses the recovered map, approved destination posters, Calendar controller, and live-flight reconciliation. The home console stays at `/display` or `/`.

## What this update provides

- Arrival airport/city, flight number, current status, live map and destination poster.
- Today's itinerary, with its time zone labeled.
- Commutes to the configured home airport automatically emphasize arrival time and airport.
- Arrival times formatted from absolute timestamps in the destination airport's IANA time zone, with the calendar date visible. They are labeled Scheduled, Expected, Last reported, Landed or Arrived according to available evidence.
- Position timestamp and flight/schedule freshness. No calculated curbside-ready time or terminal/gate fields.
- Refresh after foregrounding or restoring connectivity. The existing controller suspends polling while the mobile page is hidden.
- Installable app metadata/icon and an offline navigation page. No schedule, position, ETA, token or API response is cached by the service worker.
- A separate loopback-only remote gateway on port 4174. All requests must have a valid Cloudflare Access signature, application audience, issuer, expiration, and an email on the configured family allowlist. Invalid/missing configuration leaves it disabled.
- Same Google event id with changed flight identity now clears the previous live match and current track. The Calendar lock still uses the schedule event identity.

Sequence history/mileage and push notifications are not in this mobile-first package; the authorized sequence work remains pending integration from the older branch. No cloud account, DNS record, tunnel or Access policy was created by this code update.

## 1. Install and try it at home

Apply the accompanying Git bundle from the repaired cb3d4dc baseline, run `npm.cmd test`, and restart `npm.cmd run beta:autostart:restart`.

On the PC, open `http://127.0.0.1:4173/mobile`. For a phone on the same home Wi-Fi, run `npm.cmd run beta:address` on the PC, then append `/mobile` to the displayed home-network address. Local-network access does not require Cloudflare. Home Screen app/service-worker features are intended for the HTTPS address configured below.

## 2. Prepare Cloudflare and the domain

Use a Cloudflare account you control. Add `joeymaxwell.com` on its Free DNS plan. If DNS is still hosted at Wix, first copy/export and compare every existing DNS record: website records, the `dadradar` GitHub Pages CNAME, Google mail MX records, SPF, DKIM, DMARC, and verification records. Cloudflare's automatic scan is not proof that every record was copied.

Only after that comparison, update the domain's nameservers at the registrar to the two Cloudflare nameservers assigned to the zone. This changes DNS hosting, not domain ownership or your email provider. Keep mail-related hosts DNS-only. Preserve the GitHub Pages mapping and verify your existing email and public Dad Radar information page afterward. Do not delete or replace those services.

Use `family.joeymaxwell.com` for the private companion; leave `dadradar.joeymaxwell.com` serving the existing public information page. If the free plan cannot be activated without resolving DNS ownership, stop there and resolve the account access rather than publishing an unprotected substitute URL.

## 3. Create the family sign-in application

In Cloudflare Zero Trust, enable a suitable sign-in method, such as email one-time PIN. Under Access controls → Applications, add a Self-hosted application named Dad Radar Family for the entire hostname `family.joeymaxwell.com`, not only `/mobile`. APIs and artwork must be protected too.

Add an Allow policy for the exact family email addresses you choose. Do not use Everyone or Bypass. An adult can sign in on Delaney's iPad; a new child email account is not required. Choose the session duration appropriate for the family devices; sign-in will occasionally need renewal.

Record your Access team domain (`your-team.cloudflareaccess.com`) and the application's Audience (AUD) tag from its settings. The team domain is not the family website address. The audience is not a tunnel token.

## 4. Configure Dad Radar

On the PC in Command Prompt:

```bat
cd /d C:\Users\cfijo\Dad-Radar
npm.cmd run mobile:setup
```

Enter the team domain, AUD tag, `https://family.joeymaxwell.com`, and the allowed sign-in emails. The command updates only the mobile settings in the local `.env`; existing Calendar/flight-provider settings are preserved. Do not upload `.env`.

Then restart:

```bat
npm.cmd run beta:autostart:restart
```

Accept the Windows elevation prompt if shown. Port 4174 is restricted to loopback and requires Access even from the same PC. A plain request returning 401 is expected until it comes through authenticated Cloudflare Access.

## 5. Install the tunnel on the PC

Create a named Cloudflare Tunnel for the Dad Radar PC using Cloudflare's Windows instructions. Install `cloudflared` and run the service-install command provided by that dashboard in an Administrator terminal. The command contains a private tunnel token: do not paste that token into chat or put it in Git.

Add a published application route:

| Field | Value |
| --- | --- |
| Hostname | `family.joeymaxwell.com` |
| Service type | HTTP |
| Service URL | `127.0.0.1:4174` |

**Use 4174, not the unprotected local-display port 4173.** The tunnel encrypts the external transport; HTTP here is only the same-machine hop. Do not forward router ports. Do not use a temporary public quick-tunnel URL. Exclude the family hostname from any broad Cache Everything rules; private API responses must not be edge-cached.

The home PC, Dad Radar background service, and tunnel must stay running. Configure Windows to avoid sleeping while it is serving the family display.

## 6. Verify and add the Home Screen icon

1. Turn off Wi-Fi on Allison's phone to test cellular access.
2. Visit `https://family.joeymaxwell.com`. Sign in with an allowed address; it opens `/mobile`.
3. Verify the current flight number, arrival airport and time against the home display/provider information. Note that the mobile arrival time is destination-local; the home console uses Eastern time.
4. Try a private browser window without signing in. Neither schedule nor position should be visible. An address outside the allowlist must be denied.
5. On iPhone/iPad Safari, Share → Add to Home Screen. Choose Open as Web App if offered. Use the resulting Dad Radar icon.
6. Close/reopen it and test after screen lock. Confirm updates resume and the freshness text advances honestly. Briefly disconnect the phone; the page should show interrupted/stale information or the explicit offline screen, never claim a cached ETA is live.

If login has expired while the page is open, reopen the family address to renew it. The Refresh button reloads data; it cannot override Cloudflare's sign-in policy.

## Verification performed before delivery

The full Node regression suite passes, including tests for destination-local timestamps (Phoenix overnight/MST and Asheville/EDT), stale/failed data, incorrect endpoint matches, actual landing versus gate arrival, same-event route reassignment, mobile route/static assets, worker scope headers, and signed Access tokens/allowlisting/cross-origin POST rejection. No real family credentials, live tunnel, cellular device, or browser-rendered visual verification was available in the build session. Those deployment/device checks remain step 6 above.

## Official setup references

- [Cloudflare Tunnel setup](https://developers.cloudflare.com/tunnel/setup/)
- [Self-hosted Access application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Access JWT validation and audience](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
