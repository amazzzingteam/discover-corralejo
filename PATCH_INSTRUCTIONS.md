# Step 10 — Discover Canarias Main Entry Screen

## Goal

Make Discover Canarias the primary app/home screen and make the provisional Puerto del Rosario Tour 02 preview directly accessible for tomorrow's demonstration, without presenting it as production-ready.

## Changes

- `index.html` is now the Discover Canarias tour selector.
- The per-tour welcome/language screen moved to `tour.html`.
- Corralejo is available as Tour 01.
- Puerto del Rosario is available as Tour 02 with a visible `Technical preview` status and `Preview tour` button.
- Legacy `index.html?tour=<tour-id>` links redirect to `tour.html?tour=<tour-id>`.
- Change-language links stay inside the active tour.
- Exit-tour actions return to the Discover Canarias selector.
- The PWA manifest uses the Discover Canarias platform identity.
- Service-worker cache version: `v37-discover-canarias-home`.

## Test

1. Open `index.html`.
   - It must show Discover Canarias first.
   - Corralejo must show `Open tour`.
   - Puerto del Rosario must show `Technical preview` and `Preview tour`.
2. Open Corralejo from the selector.
   - URL should use `tour.html?tour=corralejo`.
   - Start tour and confirm route/stop navigation works.
3. Open Puerto from the selector.
   - URL should use `tour.html?tour=puerto-del-rosario`.
   - Confirm the 12 provisional stops load.
4. Test legacy `index.html?tour=corralejo`.
   - It should redirect to the Corralejo `tour.html` landing screen.
5. Use Change language from a tour page.
   - It should return to `tour.html` for the same tour.
6. Use Exit tour.
   - It should return to the Discover Canarias `index.html` selector.
7. Confirm Corralejo map/offline controls are unchanged.
8. Confirm Puerto remains clearly labelled provisional/technical preview.
