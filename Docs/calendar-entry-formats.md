# Calendar entry formats

## RAP requires a station

Use `RAP ORD`, `RAP DFW`, or `RAP` followed by the assignment's three-letter
station. Set the event start/end to the assigned availability period.
Matching ignores case and accepts extra whitespace between RAP and the station.

A bare `RAP`, a non-three-letter station, or trailing prose is not recognized as
a reserve assignment. The original event is retained as `other`, without a
fabricated reserve station. It cannot independently establish RESERVE mode.

Before installing this change, review imported or manually entered bare-RAP
events and add their actual stations. An imported `RAP` title must be corrected
in the connected calendar after import unless the source export supplies the
station. Do not infer a station from a nearby assignment or silently assume ORD.
This change does not edit any calendar records.

The station and existing event times pass through normal reserve resolution.
An assigned standby still takes precedence over overlapping RAP, and assigned
flying still supersedes reserve. `Reserve ORD` blocks and explicit standby stations retain
their existing behavior. Standby titles without a station remain reserve duty
without inventing a location. Configure `baseAirport` in `config/settings.js`
only when a confirmed base should supply that context; its default is unset.

## Other simple manual titles

| Purpose | Illustrative title |
| --- | --- |
| Operating flight on any carrier | `Flight UA1234 DEN->SEA` |
| Other-airline deadhead | `DEADHEAD UA2456 ORD->ROC` |
| Commute to base | `COMMUTE UA1234 AVL->ORD` |
| Commute Home | `COMMUTE AA3963 ORD->AVL` |
| Layover | `Layover ROC` |
| Reserve block | `Reserve ORD` |
| Assigned standby | `STBY ORD` |
| Day off | `Duty free period` |
| Vacation | `Vacation` or `VAC` |

Create one timed event per flight. With a simple manual title, leave Description
blank unless deliberately supplying the supported structured flight description:
structured details can take precedence over title and event timing. Select the
correct start/end time zones and dates. Use all-day date ranges for explicit
full days off. These are example identifiers, not actual airline schedules.

The family guide's traveler chapter includes filled-out calendar examples,
cross-zone/overnight timing, import checks and the copyable title reference.

## Carrier identity and existing imports

Operating titles accept `Flight UA1234 DEN->SEA` or `FLT UA 1234 DEN→SEA`.
Matching ignores case. Use a two-character airline code (including codes such as
`B6`) or a three-letter carrier code, followed by a one-to-four-digit flight
number. Commute and deadhead titles also retain their explicit carrier.

Carrierless titles such as `Flight 3761 ORD->AVL` and recognized imported
`FLT 3761` records remain valid scheduled flights. They retain route and timing,
but do not acquire an airline or live lookup candidates automatically. No AA,
MQ, or ENY fallback is applied. An explicit carrier in the supported structured
`Flight:` description also supplies identity.

For a roster whose carrierless records all use one known carrier, set
`PILOT_CARRIER_CODE=UA` (replace `UA` with that carrier) in the server environment
or `.env`, then restart the server. Leave it blank when carrier identity is
unknown or the import mixes airlines. An explicit title or structured-description
carrier takes precedence. This is an import default, not a pilot-employer or
marketing-brand guess. For mixed-carrier imports, add the actual carrier to each
flight's title or structured description.

The browser's `baseAirport` setting defaults to unset. Explicit RAP, reserve-block
and standby stations, routes, and layovers still establish their stated airports.
ORD remains a supported airport and AA/MQ/ENY remain supported carrier codes;
neither is an operational default. Home airport and display time-zone settings
are independent.
