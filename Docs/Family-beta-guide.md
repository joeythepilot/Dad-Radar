# Dad Radar Family Beta Guide

The family beta runs Dad Radar on the downstairs Windows desktop and uses the upstairs iPad as a dedicated display over the private home network. The desktop owns Google Calendar authorization and the Flightradar24 token. Those credentials are never sent to the iPad.

## What the beta includes

- The HP 23es 1920 × 1080 layout, scaled proportionally for the iPad in landscape
- Google Calendar schedule and Today's Duty timeline
- Live Flightradar24 position, instruments, map motion, ETA, and phase changes
- Split-flap animation and sound after one iPad tap
- Boarding at 30 minutes before scheduled departure
- Calendar-inferred Delayed status beginning five minutes after scheduled departure, until the aircraft is airborne
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

Because the repository is private, Git may open a browser and ask Joey to sign in to GitHub during the clone. This is a one-time authorization on that desktop.

For later Dad Radar updates, open PowerShell in the `Dad-Radar` folder and run:

```powershell
git pull
npm.cmd install
```

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

## Start the family display

In the first PowerShell window, from the `Dad-Radar` folder, run:

```powershell
npm.cmd run beta:start
```

Leave that window running. In a second PowerShell window, return to the `Dad-Radar` folder and run:

```powershell
npm.cmd run beta:address
```

It prints an address similar to:

```text
http://192.168.1.44:4173
```

When Windows Defender Firewall asks, allow Node.js on **Private networks only**. Do not enable it for public networks.

## Set up the iPad

1. Connect the iPad to the same home Wi-Fi as the desktop. A guest network may block devices from seeing one another.
2. Open Safari and enter the address printed by `beta:address`.
3. Rotate the iPad to landscape.
4. Tap **Tap once for split-flap sound**. Safari requires this one human gesture before it permits audio.
5. In Safari, choose Share → Add to Home Screen. Launching from that icon removes most browser chrome.
6. Keep the iPad plugged in and prevent automatic sleep while it is serving as the display.
7. Optional: use iPad Guided Access to prevent accidental navigation away from Dad Radar.

The desktop must remain awake, connected to the network, and running `beta:start`. Closing the terminal or putting the desktop to sleep stops the upstairs display.

## Destination poster behavior

The approved display library currently includes:

| Airport | Destination |
|---|---|
| AVL | Asheville, North Carolina |
| CLT | Charlotte, North Carolina |
| CMH | Columbus, Ohio |
| DCA | Washington, District of Columbia |
| DFW | Dallas–Fort Worth, Texas |
| MIA | Miami, Florida |
| ORD | Chicago, Illinois |
| PHX | Phoenix, Arizona |
| ROC | Rochester, New York |
| XNA | Northwest Arkansas, Arkansas |

For any other airport, Dad Radar displays a designed vintage placeholder with the real city, state or province, and airport code. It does not show an unrelated poster. New artwork should be produced in small, schedule-driven batches and added to `config/posters.js` only after approval.

## Family field-test checklist

| Scenario | Expected display |
|---|---|
| No active flight, Daddy confirmed in AVL | Split-flap To shows `AVL`, Status shows `HOME`, and the AVL poster remains available below |
| No active flight, Daddy away from AVL | Split-flap To shows the confirmed airport and Status shows `LAYOVER`; never `HOME` |
| Daddy's location cannot be confirmed | Flight, From, and To are blank split-flap tiles; Status shows `LOC UNKN` |
| 30 minutes before departure | `BOARDING` |
| More than five minutes after scheduled departure, not airborne | `DELAYED`; Today's Duty shows accumulated minutes late |
| On-time aircraft moving near the departure airport | `TAXI OUT` |
| Delayed aircraft moving on the ground | `DELAYED` remains until airborne |
| Airborne | `EN ROUTE` immediately |
| Descending toward the destination below the approach thresholds | `APPROACH`; a temporary level-off must not return to `EN ROUTE` |
| Arrived at AVL | `ARRIVED`, followed later by `HOME` |
| Arrived away from AVL | `ARRIVED`, followed later by the away ground location or `LAYOVER` |
| Next scheduled leg overlaps the current delay | Current leg remains displayed until arrival or the safety timeout |
| Deadhead event | Today's Duty shows `DEADHEAD` and describes Daddy as riding; the flap continues to show the operational phase |
| Destination has no approved poster | Vintage city/state/airport-code placeholder |
| FR24 temporarily fails | Calendar plan remains visible |
| Calendar refresh fails after a successful load | Last known display state remains visible |

For each unexpected result, record the local time, flight number, expected result, actual result, and a photo or screenshot. Never include `.env`, `token.json`, `credentials.json`, or API-token text in a report.

## Troubleshooting

### The desktop works but the iPad cannot connect

- Confirm both devices are on the same non-guest network.
- Run `npm.cmd run beta:address` again; the desktop address may have changed.
- If the helper cannot find an address, run `ipconfig`, find the Wi-Fi or Ethernet `IPv4 Address`, and open `http://THAT_ADDRESS:4173` on the iPad.
- Confirm `beta:start` is still running.
- In Windows Firewall, allow Node.js on Private networks only.

### Dad Radar loads but has no schedule

- Run `npm.cmd run beta:check`.
- If `token.json` is missing, run `npm.cmd run calendar:authorize`.
- Confirm `GOOGLE_CALENDAR_ID` in `.env` points to the Pilot Schedule calendar.

### Calendar works but there is no live aircraft

- Run `npm.cmd run diagnose:live`.
- Confirm `FR24_API_TOKEN` is present in `.env`.
- A missing live match is expected before the aircraft appears in FR24.

### There is no split-flap sound

- Tap the sound button once after every fresh browser or Home Screen session.
- Confirm iPad volume is up and Dad Radar remains the foreground app.

### Stop Dad Radar

Select the PowerShell window running `beta:start` and press `Ctrl+C`.

## Home-network safety

The beta is for a trusted private home network. Never forward port 4173 through the router, expose it to the public internet, or run it on public Wi-Fi. The server exposes only the display assets and required API routes; credential files and backend source are explicitly blocked.
