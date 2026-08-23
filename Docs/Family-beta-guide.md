# Dad Radar Family Beta Guide

The family beta runs Dad Radar on the downstairs Windows desktop and uses the upstairs iPad as a dedicated display over the private home network. The desktop owns Google Calendar authorization and the Flightradar24 token. Those credentials are never sent to the iPad.

## What the beta includes

- The HP 23es 1920 × 1080 layout, scaled proportionally for the iPad in landscape
- Google Calendar schedule and Today's Duty timeline
- Live Flightradar24 position, instruments, map motion, ETA, and phase changes
- A distinct `LANDING` status below 3,000 feet AGL after Approach is confirmed
- Split-flap animation and sound after one iPad tap
- Boarding at 30 minutes before scheduled departure
- Calendar-inferred Delayed status beginning five minutes after scheduled departure unless an on-time Taxi Out was already confirmed; an existing delay remains until the aircraft is airborne
- Active-leg locking so an overlapping next flight cannot replace the current delayed or airborne flight
- Deadhead parsing with `DEADHEAD` in Today's Duty and family language that says Daddy is riding rather than operating
- A faceplate-safe split-flap that remains visible in every state; Home and Layover place the confirmed airport in To
- Approved destination posters and a deliberate missing-poster card

Startup sounds, cabinet lighting, power behavior, and other physical cues remain on the Raspberry Pi build timeline.

## What to install on the home desktop

The home desktop is the Dad Radar host, not a development workstation. It needs:

- Git for Windows, so it can download and later update the private Dad Radar repository
- The current Node.js LTS release, which includes `npm`

VS Code is optional. It can make the first setup more familiar, but Dad Radar does not require it to run. GitHub CLI is not required on the home desktop.

After the family-beta pull request has been merged into `main`, open PowerShell and run:

```powershell
cd $env:USERPROFILE
git clone https://github.com/joeythepilot/Dad-Radar.git
cd Dad-Radar
npm.cmd install
```

The repository is currently public, so cloning it does not require a GitHub login. Private runtime files such as `.env`, `credentials.json`, and `token.json` are excluded from the repository and must be configured separately on this desktop.

For later Dad Radar updates, open PowerShell in the `Dad-Radar` folder and run:

```powershell
git pull
npm.cmd install
npm.cmd run beta:autostart:restart
```

The restart command rebuilds the legacy iPad browser bundle and restarts the background server. Windows may request permission. There is no need to reinstall the startup task after an ordinary code update unless the repository or Node.js installation is moved.

If `.env` does not already exist, copy `.env.example` to `.env`, then add the real values:

```dotenv
PORT=4173
HOST=0.0.0.0
GOOGLE_CALENDAR_ID=your_calendar_id
FR24_API_TOKEN=your_token
```

Do not replace an existing `.env`; it may already contain the correct private values.

If `token.json` is not present, place the Google Desktop OAuth `credentials.json` file in the repository root and run:

```powershell
npm.cmd run calendar:authorize
```

The browser authorization flow creates `token.json`. `.env`, `credentials.json`, and `token.json` are excluded from Git and blocked from the family web display.

## Verify the installation

Run these commands before putting the iPad upstairs:

```powershell
npm.cmd run beta:check
npm.cmd test
npm.cmd run diagnose:live
```

`beta:check` reports only whether each private item is present; it never prints token values. The live diagnostic may report no aircraft match when the next flight is not yet active. That is normal.

## Install automatic startup

Run this once from the `Dad-Radar` folder:

```powershell
npm.cmd run beta:autostart:install
```

Windows displays one User Account Control permission prompt. Choose **Yes**. Dad Radar then runs as a background Windows task with no terminal window and automatically starts about 20 seconds after every boot, including a Windows Update restart. It starts even if nobody has signed into the PC yet and automatically retries after an unexpected failure.

Verify both the Windows task and the web server:

```powershell
npm.cmd run beta:autostart:status
```

The expected result is:

```text
[PASS] Windows startup task: Installed
[PASS] Dad Radar server: Responding
[PASS] Google Calendar: Authorized
```

If `beta:start` was already running in another terminal during installation, the background host waits for that manual copy to stop and then takes over automatically. After installation reports success, close the old manual server with `Ctrl+C`, wait about 15 seconds, and run the status command again.

To print the iPad address, run:

```powershell
npm.cmd run beta:address
```

It prints an address similar to:

```text
http://192.168.1.44:4173
```

When Windows Defender Firewall asks, allow Node.js on **Private networks only**. Do not enable it for public networks.

The manual command remains available as an emergency fallback:

```powershell
npm.cmd run beta:start
```

When started manually, that terminal must remain open. The automatic-startup installation does not require an open terminal.

## Set up the iPad

1. Connect the iPad to the same home Wi-Fi as the desktop. A guest network may block devices from seeing one another.
2. Open Safari and enter the address printed by `beta:address`.
3. Rotate the iPad to landscape.
4. Tap **Tap once for split-flap sound**. Safari requires this one human gesture before it permits audio.
5. In Safari, choose Share → Add to Home Screen. Launching from that icon removes most browser chrome.
6. Keep the iPad plugged in and prevent automatic sleep while it is serving as the display.
7. Optional: use iPad Guided Access to prevent accidental navigation away from Dad Radar.

The desktop must remain awake and connected to the network. The monitor may turn off and Windows may be locked, but the PC itself must not sleep. Automatic startup survives restarts; sleep still suspends the home-network server until Windows wakes.

## Destination poster behavior

The approved display library currently includes:

| Airport | Destination |
|---|---|
| AVL | Asheville, North Carolina |
| CLT | Charlotte, North Carolina |
| CMH | Columbus, Ohio |
| DCA | Washington, District of Columbia |
| DFW | Dallas–Fort Worth, Texas |
| GRB | Green Bay, Wisconsin |
| LSE | La Crosse, Wisconsin |
| MIA | Miami, Florida |
| ORD | Chicago, Illinois |
| PHX | Phoenix, Arizona |
| ROC | Rochester, New York |
| SGF | Springfield, Missouri |
| XNA | Northwest Arkansas, Arkansas |

For any other airport, Dad Radar displays a designed vintage placeholder with the real city, state or province, and airport code. It does not show an unrelated poster. New artwork should be produced in small, schedule-driven batches and added to `config/posters.js` only after approval.

## Family field-test checklist

| Scenario | Expected display |
|---|---|
| No active flight, Daddy confirmed in AVL | Split-flap To shows `AVL`, Status shows `HOME`, and the AVL poster remains available below |
| Same-day gap between flights at ORD | Split-flap To shows `ORD`, Status shows `AT BASE`, and Today's Duty says Daddy is between flights in Chicago |
| No active flight, Daddy away from AVL | Split-flap To shows the confirmed airport and Status shows `LAYOVER`; never `HOME` |
| Daddy's location cannot be confirmed | Flight, From, and To are blank split-flap tiles; Status shows `LOC UNKN` |
| 30 minutes before departure | `BOARDING` |
| More than five minutes after scheduled departure, not airborne, and Taxi Out was not already confirmed | `DELAYED`; Today's Duty shows accumulated minutes late |
| On-time aircraft moving near the departure airport | `TAXI OUT`; once confirmed, it must remain `TAXI OUT` across the scheduled-departure-plus-five-minute boundary |
| Aircraft is low and slow immediately after departure | Remain `TAXI OUT` or advance to `EN ROUTE`; never show `APPROACH` or `LANDING` near the origin |
| Delayed aircraft moving on the ground | `DELAYED` remains until airborne |
| Airborne | `EN ROUTE` immediately |
| Descending toward the destination below the approach thresholds | `APPROACH`; a temporary level-off must not return to `EN ROUTE` |
| Confirmed approach below 3,000 feet above destination elevation | `LANDING`; a go-around returns to `APPROACH` after climbing above 3,500 feet AGL |
| Arrived at AVL | `ARRIVED`, followed later by `HOME` |
| Arrived away from AVL | `ARRIVED`, followed later by the away ground location or `LAYOVER` |
| Scheduled arrival time passes without live arrival confirmation | `NO TRACK` while Dad Radar keeps looking; the calendar clock alone must not show `ARRIVED` |
| Final live position becomes stale after Landing or Arrived | Retain the highest confirmed phase and destination position; never return to `DELAYED` or move the map back to the origin |
| Browser reloads during the Arrived hold | Restore `ARRIVED` at the destination from local confirmation, then complete the normal Home/Layover handoff |
| Next scheduled leg overlaps the current delay | Current leg remains displayed until arrival or the safety timeout |
| Prior leg is stuck in Landing and a later leg has started | Release the stale lock and track the later leg after the bounded handoff timeout |
| Deadhead event | Today's Duty shows `DEADHEAD` and describes Daddy as riding; the flap continues to show the operational phase |
| Destination has no approved poster | Vintage city/state/airport-code placeholder |
| Approved poster request fails on the iPad | Correct destination placeholder appears while Dad Radar retries the image with a fresh cache URL; no broken-image square |
| Aircraft gradually climbs or descends through 10,000 feet | Cabin chime plays once in each direction per flight after sound has been enabled with one tap |
| FR24 temporarily fails | Calendar plan remains visible |
| Calendar refresh fails after a successful load | Last known display state remains visible |
| Google Calendar authorization expires | Status shows `CAL AUTH`; reauthorize on the desktop instead of treating the schedule as generically offline |

For each unexpected result, record the local time, flight number, expected result, actual result, and a photo or screenshot. Never include `.env`, `token.json`, `credentials.json`, or API-token text in a report.

## Troubleshooting

### The desktop works but the iPad cannot connect

- Confirm both devices are on the same non-guest network.
- Run `npm.cmd run beta:address` again; the desktop address may have changed.
- If the helper cannot find an address, run `ipconfig`, find the Wi-Fi or Ethernet `IPv4 Address`, and open `http://THAT_ADDRESS:4173` on the iPad.
- Run `npm.cmd run beta:autostart:status` and confirm that all three checks pass.
- If the Windows task is installed but the server is not responding, run `npm.cmd run beta:autostart:restart` and approve the permission prompt.
- The background log is available at `runtime\family-beta.log`; Dad Radar does not intentionally record configured token values there.
- In Windows Firewall, allow Node.js on Private networks only.

### The old iPad stops at startup or loses the flap and gauges

- Completely close the existing Safari tab, then reopen the address printed by `beta:address`. Dad Radar versions its browser bundle and stylesheets so Safari cannot reuse the incompatible copy.
- The first-generation iPad Air on iOS 12.5.5 uses a dedicated ES5 bundle and legacy CSS dimensions for the split-flap and instruments.
- If startup still fails, photograph the full `STARTUP ERROR` line. Include its `IPAD-ES5-8` version marker in the report; do not include credentials or token text.

### Dad Radar loads but has no schedule

- Run `npm.cmd run beta:check`.
- If `token.json` is missing, run `npm.cmd run calendar:authorize`.
- If the display or startup status reports `CAL AUTH`, run `npm.cmd run calendar:reauthorize` and complete the Google browser flow. The old token is preserved as a timestamped backup and credential values are not printed.
- Confirm `GOOGLE_CALENDAR_ID` in `.env` points to the Pilot Schedule calendar.

### Calendar works but there is no live aircraft

- Run `npm.cmd run diagnose:live`.
- Confirm `FR24_API_TOKEN` is present in `.env`.
- A missing live match is expected before the aircraft appears in FR24.

### There is no split-flap sound

- Tap the sound button once after every fresh browser or Home Screen session.
- Confirm iPad volume is up and Dad Radar remains the foreground app.

### Stop Dad Radar

For a manually started server, select the PowerShell window running `beta:start` and press `Ctrl+C`.

To stop the background server and permanently remove its Windows startup task, run:

```powershell
npm.cmd run beta:autostart:remove
```

Windows requests permission. Automatic startup can be restored later by running `npm.cmd run beta:autostart:install` again.

## Home-network safety

The beta is for a trusted private home network. Never forward port 4173 through the router, expose it to the public internet, or run it on public Wi-Fi. The server exposes only the display assets and required API routes; credential files and backend source are explicitly blocked.
