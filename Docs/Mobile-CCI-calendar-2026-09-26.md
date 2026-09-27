# MOBILE CCI calendar compatibility

The September 27–October 1 import uses `FLT 3632`, description fields
`Flight#: 3632 Stations: ORD→EVV`, and `Layover in EVV`.
The parser now accepts these alongside the original export format.
New-format flights require a matching flight number, route, and valid ordered
explicit UTC pair in the description. These UTC values take precedence over
the event's single-zone local timestamps. Old-format time handling is unchanged.

Regression coverage includes the actual ORD–EVV description, UTC rollover,
lookup identifiers, invalid/mismatched records, and the Sunday EVV overnight wheel.

MaxwellHouse read-only diagnostic #140 confirmed calendar sync had recovered
after the reported internet outage (2026-09-26 23:55:32Z); missing new flights
were reproduced as parser classification failures, not a stopped refresh.
No calendar entries, network recovery behavior, or reserve/RAP behavior were
changed in this repair. Reserve remains a separate pending feature.
