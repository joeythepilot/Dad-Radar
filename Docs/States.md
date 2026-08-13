# Dad Radar State Definitions

## Home
Daddy is home with the family in Asheville (AVL). This state requires location evidence: the most recently completed flight arrived at AVL or, when no completed flight is available, the next known flight originates at AVL. A blank Calendar never implies Home. The split-flap keeps Flight and From blank, displays `AVL` in To, and displays `HOME` in Status.

## Location Unknown
The schedule does not provide enough recent flight or airport context to confirm Daddy's location. Display this state instead of assuming Home. The split-flap keeps Flight, From, and To blank and displays `LOC UNKN` in Status.

## Commuting to Base
Traveling from Asheville (AVL) to Chicago (ORD) to begin a work trip.

## Boarding
Beginning 30 minutes before scheduled departure, Daddy and the passengers are preparing to board. This Calendar-owned state does not require paid airline-status data.

## Delayed
The scheduled departure time has passed by more than five minutes and Dad Radar has not yet confirmed that the aircraft is airborne. The split-flap remains Delayed while the aircraft is on the ground; Today's Duty shows the accumulated delay. Live airborne evidence immediately changes the state to En Route.

## Taxi Out
An on-time aircraft is moving near the departure airport. A delayed aircraft continues to display Delayed during ground movement so the family sees the most important information.

## En Route
Aircraft is airborne.

## Approach
Aircraft has descended below 10,000 feet.
Play the cabin chime and transition to Approach mode.

## Arrived
Aircraft has arrived at the destination gate.

## Layover
Daddy is on an overnight or extended layover between flight assignments. After a flight arrives away from AVL, the last destination remains Daddy's ground location even when no next flight is currently listed. The split-flap keeps Flight and From blank, displays the confirmed layover airport in To, and displays `LAYOVER` in Status.

## Deadhead
Deadhead is a role attached to a normal flight rather than a competing operational phase. Today's Duty labels it `DEADHEAD` and explains that Daddy is riding. The split-flap still progresses through Boarding, Delayed, Taxi Out, En Route, Approach, and Arrived.

## Commuting Home
Traveling from Chicago (ORD) back to Asheville (AVL) after completing a work trip.

## Diverted
Flight has landed at an alternate airport due to weather, maintenance, or operational reasons.

## Offline
Live flight information is unavailable.
Display the last known information and continue using the planned schedule until live data returns. If an airport remains confirmed, it stays in the split-flap To field; otherwise To is blank. Status displays `OFFLINE`.
