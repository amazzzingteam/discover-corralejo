# Discover Canarias — Step 6B: shared service-worker app shell

This checkpoint removes Corralejo-specific tour content from the service worker's automatic install-time precache.

## What changed

- `service-worker.js` now precaches only the shared application shell plus `data/tours.json`.
- Corralejo `tour.json`, `stops.json`, `content-extension.json`, `routes.json`, `map-points.json`, all 17 route GeoJSON files, and `assets/maps/corralejo.pmtiles` were removed from `CORE_FILES`.
- The same Corralejo-specific files were also removed from `REQUIRED_CORE_FILES`.
- Selected-tour data, route geometry, PMTiles, R2 photos/video/audio/transcripts, and reference-point media remain handled by the explicit tour-aware offline download flow from Step 6A.
- The proven same-origin/R2 caching logic and audio/video Range-request handling were not changed.
- Service-worker cache version: `v31-shared-app-shell`.

## Why the cache prefix still says `discover-corralejo-v3`

The legacy cache prefix is intentionally retained at this checkpoint. During activation, the service worker deletes older cache generations that use that prefix. Renaming it now without an explicit legacy-cache migration would leave old Corralejo caches behind on existing devices.

A future branding/cache-prefix migration can be done separately after the multi-tour engine is stable.

## Expected behaviour

Service-worker installation should now cache the reusable application shell only.

Opening a tour online may naturally runtime-cache files that the browser requests, but the service worker no longer downloads Corralejo tour data, Corralejo route geometry, or the Corralejo PMTiles archive automatically during installation.

The explicit **Download offline tour** action still builds the selected tour's full manifest dynamically. For Corralejo that remains roughly 400 URLs at the current content state.

## Live Server checks

1. Clear/unregister the previous service worker once.
2. Open `route.html?tour=corralejo`.
3. Confirm normal Corralejo browsing and maps still work.
4. In DevTools → Application → Cache Storage, inspect the `...core-v31-shared-app-shell` cache.
5. Confirm the core cache does **not** contain:
   - `data/tours/corralejo/...`
   - `assets/maps/corralejo.pmtiles`
   - Corralejo route `.geojson` files
6. Confirm it still contains the shared pages/CSS/JS/vendor files and `data/tours.json`.
7. Re-run:

   ```js
   const urls = collectOfflineTourUrls();
   console.log(urls.length);
   console.log(urls.filter((url) => url.includes("data/tours/corralejo")));
   console.log(urls.filter((url) => url.includes("corralejo.pmtiles")));
   ```

   The explicit tour manifest should still contain the Corralejo data and PMTiles.

Full R2/offline regression remains for Step 6C on GitHub Pages and a real phone/airplane-mode test.
