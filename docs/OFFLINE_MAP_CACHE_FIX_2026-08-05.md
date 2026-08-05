# Offline Map Cache Fix — 5 August 2026

## Cause

The completion-page walking map requested each GeoJSON route with a new timestamp query string. The offline download cached the route using its normal filename, so Safari could not match the timestamped request after Wi-Fi was disabled. The map renderer stopped before MapLibre was created and displayed the “route preview is still being prepared” fallback.

## Changes

- Removed the timestamp query from completion-page GeoJSON requests.
- Normalised all local route-geometry fetches to stable same-origin URLs.
- Added a service-worker fallback that matches cached static files while ignoring harmless query strings.
- Added the same fallback for PMTiles range requests.
- Changed service-worker registration to check updates with `updateViaCache: none`.
- Updated the cache version to `v23-offline-map-cache-fix`.

## Required deployment steps

1. Replace the files from the patch.
2. Push the changes to GitHub Pages.
3. On the test phone, remove the existing website data or unregister the old service worker.
4. Open the updated site while online.
5. Download/update the offline tour again.
6. Wait for the app to confirm that the offline tour is ready.
7. Turn off Wi-Fi and mobile data, then reload and test a stop-completion route map.
