# Varsha content and map-reference update — 2026-08-05

## Content connected

- Stop 01 Supermercado Deseos now uses its own hero image, gallery image, two converted MP4 videos, eight audio tracks and eight transcripts.
- Stop 02 Corralejo Harbour uses the replacement hero, three gallery images and both horizontal and vertical videos.
- Stop 04 Monumento el Pescador keeps the stable hero path, so the replacement image is picked up after the cache update.
- Stop 17 Mama & You now uses its own vertical MP4 video. Italian audio remains the Harbour placeholder.
- All transcript text files currently present in stop folders were synchronised into `data/stops.json`.

## Bus-reference architecture

- Added `data/map-points.json` as a reusable data source for non-tour map references.
- Added a cross-platform expanded map mode that does not rely on the iPhone Fullscreen API.
- Added bus marker, popup image, short-description, video and Google Maps support.
- Bus media was normalised into `assets/map-points/` and converted to MP4/H.264/AAC where needed.
- Bus points are intentionally `published: false` because the supplied shortened Google Maps links could not be resolved to verified decimal coordinates in this environment. Add verified latitude/longitude and set `published: true` to activate them without further code changes.

## Recommended content rules

- Standard stop: one hero image, three to five gallery images and one edited highlight video.
- Highly visual stop: up to eight curated images and no more than two videos with clearly different purposes.
- Keep short descriptions separate from the full audio transcript.
- Supply future route data in the existing tracker format, with decimal coordinates, stable slugs, next-stop links, translations and reviewed GeoJSON paths.
