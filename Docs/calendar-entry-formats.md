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
flying still supersedes reserve. `Reserve ORD` blocks and standby formats retain
their existing behavior; this requirement changes RAP only.

## Other simple manual titles

| Purpose | Illustrative title |
| --- | --- |
| Operating, existing AA/MQ/ENY integration | `Flight 3761 ORD->AVL` |
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
