# R2 Content Migration Summary — 2026-08-18

This release migrates Discover Corralejo tour content away from local stop/media folders and onto the configured Cloudflare R2 media layer.

## What changed

- All 18 stop hero images, galleries, videos and audio now use `@media/...` references.
- Stop 7 remains its own tour stop but intentionally reuses all Stop 6 media, audio and transcript files.
- All language transcripts now load from R2 `.txt` files through `transcriptFiles`; long transcript text is no longer embedded in `data/stops.json`.
- The three bus-stop photo/video sets now load from R2.
- The welcome and route hero backgrounds are configured through `data/tour.json` and resolve through the same media base URL.
- Local `assets/stops/` and `assets/map-points/` dependencies were removed from active code.
- The service-worker cache version is now `v25-r2-content-final`.
- Offline downloads now include transcript files in addition to photos, videos and audio.
- Historical stop IDs/slugs were preserved to avoid breaking route links, analytics and saved progress. `matchingFolder` reflects the final storage folder where it differs.
- The final asset filename contract is stored in `docs/ASSET_TREE_FINAL_2026-08-18.txt`.

## Important R2 configuration

The current media configuration lives only in `data/tour.json`:

```json
"media": {
  "baseUrl": "https://pub-a141a9ed023547fca5023101bb994921.r2.dev",
  "tourPath": "tours/corralejo"
}
```

R2 CORS must allow the deployed website origin so transcript fetches and offline caching work.

For local Live Server testing, add the exact localhost/127.0.0.1 origin you use to the R2 CORS policy as an additional allowed origin.

## Deployment test

After deploying this release:

1. Open the live site with DevTools.
2. Unregister/refresh the old service worker if necessary.
3. Confirm the active cache version is `v25-r2-content-final`.
4. Open several stops and verify images, video, audio and transcript text.
5. Run **Download Tour** while online.
6. Verify the download completes with zero failed files.
7. Switch DevTools Network to Offline.
8. Reload several stops and verify hero/gallery/video/audio/transcript content.
9. Check all 8 languages on at least one stop.
10. Check Stop 7 specifically: its title should be Plaza Patricio Calero while its content comes from Stop 6.

## Validation performed before packaging

- JSON files parse successfully.
- JavaScript files pass `node --check`.
- All runtime `@media/...` references were matched against the supplied final asset tree.
- No active application references remain to `assets/stops/` or `assets/map-points/`.
- Stop 3 uses the normalized `avenida-maritima` media names.
- No tour media references use `.mov`.
- Stop 14 uses `pop-corn` consistently.
- Stops 1–18 each have 8 audio paths and 8 transcript-file paths; Stop 7 intentionally points to Stop 6.
