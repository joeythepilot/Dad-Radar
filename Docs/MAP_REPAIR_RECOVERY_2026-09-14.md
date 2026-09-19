> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Family-beta map repair recovery

Scope: `agent/mobile-companion` only. No production deployment, release package,
or installation on the home PC is performed by these commits.

## Recovered result

The saved application checkpoint `f31c38f706ffc87bb4045fa849ad08c06b3c7bec`
passed both jobs in Actions run `34803930859`. This includes the complete
application regression suite and 14 Chromium/WebKit desktop, Full-family,
and Compact-family cases. Four repeated-roll traces contain 339 and 239
Chromium motion frames, and 490 and 640 WebKit motion frames. Each four-move
trace contains exactly eight registration clack calls after visual movement.
PR #5 brings that repair into the beta branch.

The repair preserves the approved 2.8-second uneven roll, hesitation, blur,
lateral wander, worn splice, V3 gearmotor audio, and stationary bezel mounts.
Registration-gap reversals, WebKit fractional-edge coverage, current motion
preferences, hidden-startup measurements, and portrait poster/gauge containment
are covered by the repaired source and its regression checks.

## Last screenshot gap

The earlier geometry checks did not inspect Today's Duty route text. In a
narrow Full-family housing, the three-column row left only 6-13 pixels for
route labels. The mobile layout now uses the actual housing width to reflow
these rows onto two lines. The date and context wrap, and overflow scrolls
inside the existing housing. The housing is keyboard focusable when it scrolls.
The desktop cabinet, map-roll styling, and Compact layout are not redesigned.

`scripts/family-duty-browser-proof.js` runs in the existing browser workflow.
It checks complete route/time/tag/date/title text, keyboard reachability, and
access to the last row, and saves scrolled duty-detail screenshots. A local
real-CSS fixture reproduced the clipping before this fix and passed after it.
The containing beta commit must also pass both exact-SHA workflow jobs;
use that workflow result rather than treating an older green run as proof of
subsequent changes.

## Remove obsolete transfer scaffolding

The four `scripts/.map-repair-*.json` files and `apply-map-repair.yml` were an
unfinished alternative patch-transfer attempt. Their source guards failed;
they are not another pending application repair. They are removed after the
verified implementation is merged. The read-only verification workflow remains.
The owner confirmed no other session was running. The previous attribution of
these commits to another session was incorrect; their writes appear in this
conversation's own tool history.

## Installation boundary

These are source and automated browser checks, not hands-on validation of the
home PC or the family tablet. The home server still needs the beta update installed,
the browser bundle rebuilt, and its existing beta host restarted. Keep local
calendar credentials, provider keys, saved state, and family access settings.
Final perceived sound balance and physical-device approval remain owner checks.
