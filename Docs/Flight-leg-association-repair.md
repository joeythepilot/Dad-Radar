# Keep reused flight numbers attached to the correct leg

September 12 report: Joey was at his hotel in Bloomington/Normal while the
display still said ORD–BMI, EN ROUTE. The picture showed northbound telemetry
at 377 knots and 17,000 feet. A later BMI–ORD flight using the same callsign is
a plausible explanation, not a confirmed identification from the screenshot.
The installed home build had not yet received the recent updates.

Code inspection confirmed that adsb.lol selection used callsign alone and the
adapter copied the scheduled origin/destination into its normalized report.
Those fields did not independently confirm which leg the airplane was flying.
This weakness remained in the server-master checkpoint.

## Repair

The home server now checks association before a provider report reaches flight
state, telemetry, or the actual track. The checks use the calendar event, route,
scheduled start, and lookup candidates as the leg identity. They:

- Reject a reported route that conflicts with the scheduled route.
- Hold a new callsign-only acquisition when the aircraft is travelling away from
  the destination and is outside both airport areas. This is uncertainty, not
  proof that the user has arrived.
- Preserve aircraft identity after airborne acquisition, while allowing aircraft
  changes before departure and a new association after a calendar reassignment.
- Reject later departure telemetry after sustained destination ground evidence,
  even when the next flight reuses both the callsign and aircraft.
- Do not reject an immediate go-around or bounce/touch-and-go after one ground
  report solely on the basis of association. Existing phase rules still apply.
- Treat an outward report after a long approach gap as uncertain. Uncertainty
  resets arrival-silence timers rather than counting as confirmation of parking.
- Close association when this leg reaches confirmed Arrived. A separate scheduled
  leg, including the same-number return, can acquire the aircraft normally.

The association is saved in the existing private `runtime/master-state.json`.
Viewer refreshes do not trigger extra aircraft lookups. Rejected reports produce
`flight-leg-rejected` diagnostics with a reason; they never enter the actual path.
Normal healthy absence after matched taxi-in still uses the existing five-minute
arrival timer. Provider outages continue to block that inference.

These are conservative continuity checks, not a unique flight ID supplied by
ADS-B. Without previous observations or independently verified route metadata,
some same-number flights remain ambiguous. No historical position or arrival is
reconstructed from the screenshot, and no paid data source is added.

## Verification

`server/flight-leg-guard-test.js` covers initial reverse-direction acquisition,
aircraft substitution, stationary taxiing, a same-aircraft return after restart,
unchanged inbound actual track, eventual Arrived, immediate go-around, touch-and-go,
long-gap uncertainty, completed-leg exclusion, and new/same-event reassignment.
The master integration fixture feeds normalized raw ADS-B records through the
controller, so it verifies that rejected return points never reach the display.
The complete `npm test` suite passed with this repair.

Install with the cumulative instructions in `Docs/Server-master-update.md`.
The home PC must be updated and restarted; this commit does not remotely update
the running Windows installation. Trip counters/history, physical shutters and
descent-aware zoom remain separate unfinished features.
