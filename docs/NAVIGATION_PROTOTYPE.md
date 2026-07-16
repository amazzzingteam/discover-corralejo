# Discover Corralejo — In-app Navigation Prototype

## Included in this update

- A reusable in-app route preview on the stop-completion page.
- First working transition: Stop 01 (Supermercado Deseos) to Stop 02 (Corralejo Harbour).
- Local route geometry stored in `data/routes/01-to-02.geojson`.
- Route metadata for all 17 stop-to-stop transitions in `data/routes.json`.
- Correct Google Maps fallback route links imported from the Route Correlation CSV.
- Eight-language navigation labels.
- Offline caching of the route metadata, geometry and map JavaScript.
- A dependency-free SVG map, so the prototype does not need an external map library or online tiles.

## Important review note

The first route line is a prototype created from the confirmed start and destination coordinates. It must be compared with the approved walking path before public launch. The Google Maps route link remains available as a live-navigation fallback.

## Test flow

1. Run `index.html` with VS Code Live Server.
2. Select a language.
3. Open Stop 01 — Supermercado Deseos.
4. Complete the stop.
5. Confirm the completion page shows:
   - the next-stop route section;
   - an interactive map;
   - Stop 01 and Stop 02 markers;
   - the highlighted route line;
   - approximately 2 minutes / 80 metres;
   - Continue to Corralejo Harbour;
   - Open live directions.
6. Test the map `+`, `−` and reset controls.
7. Drag the map on desktop and mobile.
8. Use the offline-download button again, then test the route preview offline on desktop.

## Applying the system to later routes

For each transition:

1. Add a GeoJSON LineString in `data/routes/`.
2. Add `geometryFile`, `distanceMetres`, `walkingMinutes`, instructions and an approved status in `data/routes.json`.
3. The same completion-page component will load it automatically.

Example:

```json
{
  "id": "02-to-03",
  "fromStopId": "02-harbour",
  "toStopId": "03-avenida-maritima",
  "geometryFile": "data/routes/02-to-03.geojson",
  "distanceMetres": 250,
  "walkingMinutes": 4,
  "status": "approved"
}
```

## Files changed

- `completion.html`
- `css/styles.css`
- `data/content-extension.json`
- `data/stops.json`
- `data/routes.json`
- `data/routes/01-to-02.geojson`
- `js/common.js`
- `js/completion.js`
- `js/data-loader.js`
- `js/navigation-map.js`
- `js/offline.js`
- `service-worker.js`
