> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Dad Radar State Definitions

## State authority

DadRadar resolves state from multiple sources with explicit precedence:

- Google Calendar defines the planned flight/commute assignment and original schedule.
- FlightAware operational data, when matched and current, supplies airline timing/status evidence such as estimated/actual OUT, OFF, ON, and IN.
- ADSB.lol supplies movement and position evidence and may refine active airborne phases.
- Existing time/proximity/silence inference remains a fallback only when operational evidence is unavailable or incomplete.

A provider outage is never itself evidence of departure, landing, or arrival.

## Home

Daddy is home with the family in Asheville (AVL). This state requires location evidence: the most recently completed flight arrived at AVL or, when no completed flight is available, the next known flight originates at AVL. A blank Calendar never implies Home. The split-flap keeps Flight and From blank, displays `AVL` in To, and displays `HOME` in Status.

## Location Unknown

The schedule does not provide enough recent flight or airport context to confirm Daddy's location. Display this state instead of assuming Home. The split-flap keeps Flight, From, and To blank and displays `LOC UNKN` in Status.

## Commuting to Base

Traveling from Asheville (AVL) to Chicago (ORD) to begin a work trip. Commute identity comes from Calendar. FlightAware operational timing may revise the commute's departure/arrival times, while ADS-B may provide the moving-aircraft track.

## Boarding

Daddy and the passengers are preparing to depart. Calendar can establish the preflight window. When a matched FlightAware record exists, DadRadar does not convert Boarding to a fake Delayed state solely because the original planned departure time has passed if the operational record still reports no delay.

## Delayed

When FlightAware operational status is available, `DELAYED` is based on the matched airline record: a provider-reported delay or a revised estimated OUT later than planned by more than the grace period. Today's Duty uses the provider-derived delay amount when available. If the provider reports delay but no usable revised time, DadRadar may show `DELAYED` without inventing a number of minutes.

When FlightAware is unavailable or unmatched, the older Calendar clock-based delay behavior remains as a fallback safety net.

A real actual OUT/OFF report, or fresher ADS-B movement evidence, advances the flight out of pre-departure delay according to the applicable phase rules.

## Taxi Out

The aircraft has left the gate and is taxiing for departure. FlightAware `actualOut` is direct operational evidence for Taxi Out. ADS-B surface movement may also confirm the phase.

Once the current leg has confirmed departure movement, stale Calendar timing cannot pull it backward to Boarding or a fabricated delay.

## En Route

The aircraft is airborne. FlightAware `actualOff` is authoritative operational airborne evidence. Fresh ADS-B position remains the source of truth for where the aircraft actually is, its altitude, groundspeed, heading, and track.

For commute flights, the family-facing commute identity is preserved even while airborne movement is tracked.

## Approach

DadRadar has confirmed arrival progression through movement evidence such as descent, destination distance, route progress, groundspeed, and altitude. Once confirmed, a temporary level-off cannot return the same flight to En Route.

FlightAware estimated arrival timing can update ETA independently of this movement phase.

## Landing

During a confirmed Approach, the aircraft is below the landing-entry altitude above destination field elevation and is not climbing. A go-around can release Landing back to Approach after confirmed climb evidence. The hysteresis prevents noisy altitude reports from rapidly alternating phases.

## Taxi In

The aircraft is on the destination surface but has not yet reached the gate. FlightAware `actualOn` is direct operational evidence for Taxi In. ADS-B ground movement can also support this phase.

## Arrived

The flight has reached the destination gate. FlightAware `actualIn`, when available, is the authoritative gate-arrival time. It becomes the internal `confirmedArrivalAt` while the original planned Google Calendar end time remains preserved separately.

A previously inferred arrival checkpoint, terminal-coverage estimate, or taxi-silence workaround cannot override a later matched FlightAware `actualIn`.

If operational arrival data is unavailable, the existing ADS-B/proximity/silence arrival logic remains available as fallback. DadRadar retains destination location and 100% progress through the Arrived hold before yielding to Home, At Base, or Layover.

## At Base

Daddy is between same-day flights at ORD after the Arrived hold has ended. The split-flap keeps Flight and From blank, displays `ORD` in To, and displays `AT BASE` in Status. Today's Duty says Daddy is between flights in Chicago. Overnight or off-duty time away from AVL remains Layover.

## Layover

Daddy is on an overnight or extended layover between assignments. After a flight arrives away from AVL, the confirmed destination remains Daddy's ground location even when no next flight is currently listed.

## Deadhead

Deadhead is a role attached to a normal flight rather than a competing operational phase. Today's Duty labels it `DEADHEAD` and explains that Daddy is riding. The split-flap still progresses through the applicable operational phases.

## Commuting Home

Traveling from Chicago (ORD) back to Asheville (AVL) after completing a work trip. Calendar owns commute role; FlightAware may revise operational timing; ADS-B provides physical movement.

## Diverted

The active flight has diverted from its planned destination. A matched FlightAware diversion flag/status is operational evidence for `DIVERTED`; live movement may provide the aircraft's actual alternate routing/position.

## Cancelled

The planned flight has been cancelled. A matched FlightAware cancellation flag/status is authoritative when available. Calendar retains the original planned assignment in the schedule history, but DadRadar does not treat the cancelled leg as departed.

## Offline

Required live information is unavailable. DadRadar displays the last known trustworthy information and continues using whatever planned/operational data remains valid. Loss of a single optional provider does not automatically make the whole system Offline.
