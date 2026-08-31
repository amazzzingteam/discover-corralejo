# Step 11 — Location-aware Start

## Goal

Allow tourists to start a tour from the nearest confirmed stop instead of always beginning at Stop 1, while keeping the feature optional, privacy-friendly and offline-capable.

## Changes

- Added `js/location-start.js`.
- Corralejo enables `app.locationAwareStart`.
- Puerto del Rosario keeps location-aware start disabled until final approved coordinates arrive.
- `tour.html` now offers:
  - `Start from beginning`
  - `Start near me`
- `Start near me`:
  1. asks for browser location permission;
  2. calculates the nearest published stop locally;
  3. shows the suggested stop and approximate straight-line distance;
  4. waits for tourist confirmation before navigating.
- Exact GPS coordinates are not stored or sent to analytics.
- `tour_start` analytics can record `start_mode` plus the chosen `stop_id`.
- Session start context keeps the route "Up next" state aligned with the selected nearby start.
- Offline app-shell lists now include `js/location-start.js`.
- Service-worker cache version: `v38-location-aware-start`.
- New location UI strings exist for all 8 current languages. These new translations are draft and should be reviewed before permanent production release.

## Route behaviour

This step does **not** reorder or rotate the walking route. If the nearest stop is Stop 12, the existing Next Stop sequence continues from Stop 12 onward. Whether a future version should wrap back to earlier unvisited stops is a separate route/product decision.

## Test

1. Clear/unregister the old service worker once.
2. Open `tour.html?tour=corralejo`.
3. Choose a language.
4. Confirm both `Start from beginning` and `Start near me` appear.
5. Test `Start from beginning`.
   - It should still open the normal route from Stop 1.
6. Return to the Corralejo welcome screen and press `Start near me`.
7. Allow location access.
   - A bottom sheet should show the nearest stop and approximate distance.
8. Press `Start here`.
   - URL should open the suggested stop with `tour=corralejo`.
9. Complete that stop and return to the route.
   - "Up next" should continue from the chosen starting area, not jump back to Stop 1.
10. Deny location permission once.
    - The tour must remain usable and show a clear fallback message.
11. Open `tour.html?tour=puerto-del-rosario`.
    - `Start near me` must remain hidden because final Puerto coordinates are not yet approved.
12. On GitHub Pages after deployment, download Corralejo for offline use, go offline, and test `Start near me`.
    - If the phone can obtain a GPS fix, nearest-stop selection should work without internet.
