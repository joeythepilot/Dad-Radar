# Dad Radar next family update

Status: in development on `agent/mobile-reliability-update`.

## Product owner decisions

- Build on the latest family-beta display work at `4e20fefa8366e52fc1ce65fb1bd24e4898a0ec12`.
- The first-generation iPad Air / iOS 12.5.5 compatibility requirement is retired. The new baseline is modern Safari on current iPhone and iPad hardware plus the Windows/HP 23es home display.
- Preserve the physical-console experience on the home display. Mobile is a companion surface, not a shrunken copy of the 1920 x 1080 console.
- Route history and a mileage counter are included in this update.
- Route history is scoped to the active multi-day work sequence, not merely the current leg.
- Completed operating and deadhead legs remain visible across layovers and overnights while the sequence is active.
- Personal commute legs remain separate unless they are actually part of the assigned sequence.
- A sequence resets after 48 hours with no work-flight activity.
- No unrelated legacy compatibility work should block the release.

## Release goals

### 1. Flight-state and schedule reliability

- Google Calendar remains the source of truth for the planned itinerary.
- A changed, deleted, reassigned, misconnected, timed-out, deadhead, or otherwise revised calendar leg must be adopted cleanly during an active sequence.
- A Google Calendar event whose route or start time changes must reset provider matching and current-leg breadcrumb state even if its Google event id is unchanged.
- A deleted/replaced active leg must not remain pinned by the active-leg lock.
- Live-provider failure must never erase the current calendar plan.
- Landing, Arrived, and Layover behavior must remain stable.

### 2. Route fidelity and map behavior

- Keep the direct great-circle-style arc as the reliable fallback plan.
- Use a filed route only when it is positively matched to the current calendar leg.
- Never show a filed route from a different flight.
- Planned route remains visibly dashed; observed aircraft track remains solid.
- Camera behavior must keep the whole route useful in cruise and progressively favor the aircraft near the surface without distorting the map.
- Default non-flight geography remains a useful United States view; future international expansion must not be blocked by the design.

### 3. Active-sequence route history and mileage

- Treat the active work sequence as the history boundary.
- Group work flights into the same sequence while consecutive work-flight activity remains within 48 hours.
- Reset sequence history after 48 hours with no work-flight activity.
- Preserve completed operating and deadhead legs across layovers and overnight stops.
- Do not include ordinary personal commute legs in sequence mileage unless they are represented as assigned work/deadhead activity.
- Preserve or recover the current flight's observed breadcrumb history across browser reloads when provider data permits.
- FR24 `flight-tracks` may be used once per positively identified provider flight id to seed the current-leg track, then normal live polling extends it.
- Calculate observed mileage for each tracked leg and cumulative mileage for the active sequence.
- Keep the data lightweight and bounded. Do not turn this release into a permanent all-time flight-log database.

### 4. Destination weather

- Add destination airport weather from a server-side source so browser CORS restrictions do not affect the family displays.
- Prefer current METAR data from the Aviation Weather Center Data API. Weather failure is non-fatal and must not disturb flight tracking.
- Keep this separate from a later full graphical radar-overlay project.

### 5. Poster reliability

- A failed poster request must fall back cleanly without poisoning future poster loads.
- Returning to a previously available poster should retry and recover rather than remaining stuck on the fallback.
- No unrelated destination artwork may ever be substituted.

### 6. 10,000-foot chime reliability

- Fire once on climb through 10,000 feet and once on descent through 10,000 feet for each tracked flight when real altitude observations establish the crossing.
- Do not repeat the same directional crossing because of noisy samples around the threshold.
- A browser reload during a leg must not cause a burst of duplicate chimes.

### 7. Modern mobile companion / PWA

- Add a purpose-built mobile companion view for modern iPhone and iPad Safari.
- Provide installable PWA metadata and a standalone Add to Home Screen experience.
- Mobile should prioritize Dad's current status, current/next leg, map, destination poster, destination weather, and active-sequence mileage/history.
- Keep credentials and provider tokens on the home server.
- Remote access must be authenticated and encrypted before it is exposed outside the home network.
- Push notifications are a later layer unless they can be added without delaying the core mobile release.

## Explicitly retired requirement

The first-generation iPad Air / iOS 12.5.5 compatibility layer, including the ES5-only browser build and old Safari-specific fallbacks, is no longer a product requirement and should be removed or simplified where it complicates the modern release.