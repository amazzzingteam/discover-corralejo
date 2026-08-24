# Discover Corralejo PWA

Discover Corralejo is a mobile-first self-guided walking tour implemented as a static PWA.

## Run the project

Use VS Code **Live Server** and begin at `index.html`.

Do not open the HTML files with a `file:///` address. The app loads JSON and external media using `fetch()`.

## Hosting and media architecture

The application code is kept separately from tour media:

- GitHub: source control and the current GitHub Pages deployment
- Cloudflare R2: stop photos, videos, audio, transcripts, and bus-stop media
- `data/tours/corralejo/tour.json`: Corralejo media host and tour configuration
- `@media/...`: portable media paths used throughout the JSON data

Current media configuration:

```json
"media": {
  "baseUrl": "https://pub-a141a9ed023547fca5023101bb994921.r2.dev",
  "tourPath": "tours/corralejo"
}
```

A path such as:

```text
@media/stops/stop-02-harbour/photos/02-harbour-photo-hero.jpeg
```

is resolved at runtime to the configured media host. This keeps stop data independent from GitHub and makes a future R2 custom domain or another storage provider a single configuration change.

The `r2.dev` URL is the current development delivery URL. A production domain can be connected later without rewriting every stop.

R2 CORS must allow the website origin because the PWA fetches transcripts and caches R2 media for offline use. The deployed GitHub Pages origin is `https://amazzzingteam.github.io`. Add the exact Live Server origin as an additional allowed origin when testing transcript/offline fetches locally.

## R2 content structure

Tour media is organised under:

```text
tours/
  corralejo/
    stops/
      stop-01-...
      stop-02-...
      ...
      bus-stop-1/
      bus-stop-2/
      bus-stop-3/
```

Stop folders normally contain:

```text
photos/
videos/
audio/
transcript/
```

Stop 7 intentionally reuses the media, audio, and transcript files from Stop 6 while retaining its own stop identity and title.

The final asset filename contract used by this code is stored in `docs/ASSET_TREE_FINAL_2026-08-18.txt`.

Stop `id` and `slug` values are permanent application identifiers and may intentionally differ from the R2 folder name. `matchingFolder` records the current storage folder. Do not rename IDs/slugs just to make them match storage paths, because deep links, route data, progress state, and analytics may depend on them.

## Main data files

Corralejo-specific runtime data now lives under `data/tours/corralejo/`. `data/tours.json` is the tour registry. `data/stop-template.json` remains shared at the data root.

### `data/tours/corralejo/tour.json`

Controls:

- App and route identifiers
- Route version
- App name
- Languages and translations
- R2/media configuration
- Featured welcome/route images
- GA4 Measurement ID and consent settings
- Feedback form configuration

### Tour-aware local map configuration

Corralejo's runtime map settings now live in `data/tours/corralejo/tour.json` under `app.map`.

This includes:

- PMTiles archive path
- map centre and bounds
- minimum/maximum zoom
- route-overview zoom
- next-stop route-preview bounds/zoom
- bus/reference-point map zoom

The shared map scripts read the active tour configuration instead of hard-coding Corralejo coordinates or the Corralejo PMTiles path. When another tour is added, it should provide its own `app.map` values rather than adding tour-specific `if` statements to the shared JavaScript.

The page-side offline downloader is tour-aware: it reads the active tour's loaded data files, route geometry, and `app.map.pmtiles` configuration instead of hard-coding Corralejo paths. The service worker's install-time precache now contains only the shared application shell plus `data/tours.json`; selected-tour data and maps are left to the explicit offline download flow.

### `data/tours/corralejo/stops.json`

Contains the 18 tour stops, including permanent analytics IDs, tourist-facing content, R2 media paths, R2 transcript paths, map information, and next-stop information.

Transcripts are **not stored inline** in this file. `transcriptFiles` points to the language-specific `.txt` files in R2.

### `data/tours/corralejo/map-points.json`

Contains the three bus reference points and their R2 photo/video paths.

### `data/stop-template.json`

Reusable example for future stops. Media and transcript paths use the same `@media/` convention.

## Tour-aware navigation

Internal navigation is generated with the shared `buildTourUrl()` helper in `js/common.js`.

When Corralejo is active, new links carry the tour context explicitly, for example:

```text
route.html?tour=corralejo
stop.html?tour=corralejo&stop=harbour
completion.html?tour=corralejo&stop=harbour
```

Legacy Corralejo URLs without a `tour` parameter continue to work because `data/tours.json` defines Corralejo as the default tour. Do not manually hard-code a tour ID into individual page links; use the shared helper so future tours keep their own context.

## Tour-aware progress and language storage

Tour-specific browser state now uses the active registry tour ID rather than `app.id`.

For Corralejo, new keys use the namespace:

```text
tourApp:corralejo:language
tourApp:corralejo:session:completedStops
tourApp:corralejo:session:lastStopId
tourApp:corralejo:session:tourCompleteTracked
```

This prevents future tours from sharing progress even if the reusable application later uses a common app identity.

`data/tours.json` gives Corralejo a temporary `legacyStorageId` of `discover-corralejo`. The storage helpers can read the old Corralejo keys as a backward-compatibility fallback, while all new writes use the `corralejo` namespace. Resetting Corralejo progress clears both the current and legacy Corralejo session keys so old state cannot reappear.

Theme storage remains a shared UI preference and analytics/consent storage is handled separately in `js/analytics.js`; analytics storage is intentionally left for the dedicated analytics refactor.

## Offline mode

`js/offline.js` builds the complete offline asset list from the active tour. Shared application-shell files are static, while tour JSON files, the configured PMTiles archive, route geometry, R2 photos/video/audio/transcripts, featured media, placeholder media, and reference-point media are collected dynamically.

`js/data-loader.js` exposes the selected tour's data files that actually loaded. Optional files such as `content-extension.json`, `routes.json`, and `map-points.json` are only included in the explicit offline download when present.

`service-worker.js` caches both same-origin application resources and CORS-enabled R2 tour media. Audio/video Range requests are handled so downloaded media can continue to play offline. Its **install-time** precache is now tour-neutral: Corralejo/Puerto tour JSON, route GeoJSON, PMTiles and R2 media are not automatically installed for every user. Those assets are cached through the selected tour's explicit offline download.

When changing offline caching behaviour, bump `CACHE_VERSION` in `service-worker.js` so clients receive a fresh cache generation.

## Analytics

The main analytics file is:

```text
js/analytics.js
```

It handles consent, safe GA4 event parameters, route entry sources, PWA installation, and feedback events.

Analytics is now multi-tour aware:

- `tour_id` uses the active registry tour ID (for example `corralejo`), not the legacy app ID.
- `selected_language` is attached as a common parameter to every registered interaction.
- `interaction` mirrors the GA4 event name so reports can explicitly group by interaction type.
- Stop-level events use `stop_id`; events such as `next_stop_click` and `tour_exit` also derive the current/last stop into the common `stop_id` dimension.
- Existing route identifiers and route versions remain unchanged.
- Analytics consent is stored once for the shared Discover application at `tourApp:analytics:consent`.
- Existing Corralejo consent under `tourApp:discover-corralejo:analytics:consent` is migrated automatically when found.
- Tour-specific analytics session state such as `entrySource` and queued events uses the active tour namespace, for example `tourApp:corralejo:analytics:entrySource`.

This gives GA4 a consistent reporting chain of tour → stop → language → interaction without changing the existing event names or consent requirement.

## Reusing the app for another tour

Do not copy large media into the application repository.

For another tour:

1. Create another R2 tour prefix such as `tours/another-tour/`.
2. Duplicate/adapt the tour data files.
3. Add the tour to `data/tours.json` and point its `dataPath` to a new `data/tours/<tour-id>/` folder.
4. Add the new stop/media data using `@media/...` paths.
5. Update route geometry, map data, branding, manifest, and icons as required.

The website can later move away from GitHub hosting without changing the R2 content model.


## Step 6B service-worker boundary

The current service-worker cache prefix remains `discover-corralejo-v3` intentionally so activation can remove older cache generations already stored on existing devices. The cache **version** is bumped for each offline change; the prefix can be renamed later with an explicit legacy-cache cleanup plan.

At install time, the core cache must not contain any `data/tours/corralejo/...` files, Corralejo route GeoJSON, or `assets/maps/corralejo.pmtiles`. `data/tours.json` remains part of the shared shell because it is the registry used to resolve available tours.
