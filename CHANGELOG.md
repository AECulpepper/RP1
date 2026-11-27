# Change log

Versions cover the page, `js/` and `apps-script/Code.gs` together.

## v0.1.1 · 2026-11-27
Google sign-in.

- **Page** opens on **Sign in with Google**; nothing else shows until you're signed in. Sign-in lasts about an hour and renews automatically; **Sign out** in the header.
- **Backend** refuses any request without a valid Google sign-in for the allowed account, on top of the key. Sign-ins are checked with Google once, then remembered until they expire.
- `setup()` stores your email as the allowed account (so it isn't in the public repo) and reports whether `CLIENT_ID` is set.
- **New `js/config.js`** holds the Client ID and script URL, so each browser only needs the key.

## v0.1.0 · 2026-11-27
First release: backend and connection test.

- **Apps Script backend** (`Code.gs`):
  - `setup()` creates the key and the **NAAC-X Flight Log** Sheet in `NAAC-X`, with every tab and header.
  - Requests: ping, read tabs, write (save, delete, replace child rows), list Craft / CSV Export files, read a file, upload a file.
  - Writes run under a lock. Unknown fields add a new column at the right; columns are never removed.
  - Dates, times, IDs and codes are stored as plain text so the Sheet doesn't convert them; numeric fields stay numbers.
- **Sheet tabs:** Flights, Flight engines, Launch vehicles, Spacecraft, Aircraft, Stages, Aircraft engines, Aircraft tanks, Spacecraft events, Syncs, Sync engines, Milestones, Tech, Settings, and one `Profile - <type>` tab per mission type.
- **Page:** connection test (`index.html`) that writes, reads back and deletes a test flight, and lists and reads Drive files.
