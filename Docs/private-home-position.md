# Private origin for the relative bearing pointer

The pointer can use the household's latitude/longitude instead of the Home
airport coordinates. Home airport, schedule rules, maps and time zone are unchanged.

## Configure on the unit

Run `node scripts/set-home-position.js` in the Dad-Radar directory on the unit.
Enter latitude and longitude in decimal degrees at the prompts, including the
minus sign for west or south. Use a map pin at the house, not the airport. The
command does not accept coordinates as arguments, print them in its result, or
retain a street address. If obtaining coordinates through a mapping provider,
that provider receives the location you enter there; the Beacon does not perform
address geocoding or contact a new location service.

Restart the Beacon server using its existing restart procedure. Existing
authorized deployment/restart controls are unchanged. A browser refresh alone
does not reload this server-side setting.

An optional local `DADRADAR_HOME_POSITION_FILE` environment variable selects a
different private file for both the entry command and server. Keep it outside
the public directories. It contains a file path, never coordinates.

By default, configuration is stored in `runtime/private-home-position.json`, outside
the static routes and ignored by Git. It is separate from calendar credentials
and the public `config/settings.js`. Never put home coordinates in public settings,
issues, screenshots, support logs or the repository. POSIX files are created
owner-read/write. On Windows, the existing directory ACL applies: use the unit's
account, restrict folder access, and allow the server account to read the file.
This command does not alter service accounts, executor code or Windows ACLs.
If using a custom path, keep it outside Git repositories or in an explicitly
ignored private directory. Never add that file to source control.

Re-run the command to replace the point. Invalid input preserves the prior
setting. A malformed existing file stops server startup with a generic error;
repair it locally rather than silently using a wrong origin. With no file,
the previous Home-airport calculation remains unchanged. Remove the local
configuration file and restart to restore that fallback.

## Display behavior and privacy boundary

- The unit computes the pointer angle. State sent to the display/companion
  contains only `homePointerAngle`, not home coordinates or a street address.
- At a known ground airport, the pointer uses that airport as the traveler's
  available location. During a tracked flight it uses the reported aircraft
  position. Unknown position hides the pointer. When state is `HOME` it rests
  upright. Confirmed arrival alone is not a household location report.
- The existing approximately one-mile near-origin noise tolerance is retained.
- Only the relative pointer changes; the heading card still shows flight heading.
- The private origin is not copied into master-state persistence, calendar data
  or diagnostics. There is no new remote configuration endpoint.
- A bearing is location-derived information. Authorized viewers already see the
  traveler's position; repeated bearings may permit inference about the origin.
  Not transmitting raw coordinates is not a guarantee against location inference.

No actual household position is included in source code, tests or this document.
