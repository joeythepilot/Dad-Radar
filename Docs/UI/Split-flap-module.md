# Split-Flap Module

## Physical constraint

The final Dad Radar faceplate covers the upper portion of the monitor. Only the split-flap tile openings are exposed. Browser text, banners, alerts, or other full-width content placed behind that faceplate are physically invisible and therefore prohibited.

The split-flap row remains mounted and visible in every software state. A state transition changes tile characters; it never replaces the mechanical row with another presentation.

## Permanent fields

| Field | Tiles | Flight state | Ground or system state |
|---|---:|---|---|
| Flight | 4 | Numeric flight number | Blank tiles |
| From | 3 | Origin airport | Blank tiles |
| To | 3 | Destination airport | Last confirmed airport, otherwise blank |
| Status | 8 | Operational status | Ground or system status |

Blank means blank split-flap tiles remain visible—not that the field or row disappears.

## Non-flight examples

| State | Flight | From | To | Status |
|---|---|---|---|---|
| Home | blank | blank | `AVL` | `HOME` |
| Same-day sit at base | blank | blank | `ORD` | `AT BASE` |
| Layover in Rochester | blank | blank | `ROC` | `LAYOVER` |
| Location Unknown | blank | blank | blank | `LOC UNKN` |
| Offline with last known BIL | blank | blank | `BIL` | `OFFLINE` |

Home may display `AVL` only when the schedule model has Asheville location evidence. An empty Calendar is not sufficient.

## Status labels

Status copy must fit the existing eight-tile field. Approved compact forms include `LOC UNKN`, `TO BASE`, `TO HOME`, `TAXI OUT`, and `EN ROUTE`.

The split-flap animation and its shared mechanical audio apply to non-flight transitions exactly as they do to flight transitions.
