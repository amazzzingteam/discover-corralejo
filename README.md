# Discover Corralejo PWA

Discover Corralejo is a mobile-first self-guided walking tour implemented as a static PWA.

## Run the project

Use VS Code **Live Server** and begin at `index.html`.

Do not open the HTML files with a `file:///` address. The app loads JSON and external media using `fetch()`.

## Hosting and media architecture

The application code is kept separately from tour media:

- GitHub: source control and the current GitHub Pages deployment
- Cloudflare R2: stop photos, videos, audio, transcripts, and bus-stop media
- `data/tour.json`: central media host configuration
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

### `data/tour.json`

Controls:

- App and route identifiers
- Route version
- App name
- Languages and translations
- R2/media configuration
- Featured welcome/route images
- GA4 Measurement ID and consent settings
- Feedback form configuration

### `data/stops.json`

Contains the 18 tour stops, including permanent analytics IDs, tourist-facing content, R2 media paths, R2 transcript paths, map information, and next-stop information.

Transcripts are **not stored inline** in this file. `transcriptFiles` points to the language-specific `.txt` files in R2.

### `data/map-points.json`

Contains the three bus reference points and their R2 photo/video paths.

### `data/stop-template.json`

Reusable example for future stops. Media and transcript paths use the same `@media/` convention.

## Offline mode

`js/offline.js` builds the complete offline asset list, including R2 photos, video, audio, transcript files, bus-stop media, route geometry, and application files.

`service-worker.js` caches both same-origin application resources and CORS-enabled R2 tour media. Audio/video Range requests are handled so downloaded media can continue to play offline.

When changing offline caching behaviour, bump `CACHE_VERSION` in `service-worker.js` so clients receive a fresh cache generation.

## Analytics

The main analytics file is:

```text
js/analytics.js
```

It handles consent, safe GA4 event parameters, route entry sources, PWA installation, and feedback events.

## Reusing the app for another tour

Do not copy large media into the application repository.

For another tour:

1. Create another R2 tour prefix such as `tours/another-tour/`.
2. Duplicate/adapt the tour data files.
3. Update `data/tour.json` (`app.id`, route settings, `media.tourPath`, featured media, and analytics configuration).
4. Add the new stop/media data using `@media/...` paths.
5. Update route geometry, map data, branding, manifest, and icons as required.

The website can later move away from GitHub hosting without changing the R2 content model.
