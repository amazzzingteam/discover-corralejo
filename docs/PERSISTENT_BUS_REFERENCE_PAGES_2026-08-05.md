# Persistent bus references and dedicated bus-stop pages

## Changes implemented

- Bus icons are now displayed whenever a route map is visible; expanding the map is no longer required.
- Bus references are also added to the stop-to-stop walking route maps.
- Map popups were simplified and no longer contain both photos and videos.
- Each popup now contains the bus-stop name, a short description and an **Open bus stop** button.
- Added a reusable `bus-stop.html` page for all published bus references.
- Each bus-stop page includes:
  - hero image;
  - full photo gallery;
  - video gallery with portrait-video support;
  - description;
  - in-app map showing the full walking route and all tour stops;
  - nearest-tour-stop information;
  - walking directions to the nearest tour stop;
  - Google Maps link;
  - a direct **Rejoin tour** button.
- Added analytics events for bus-reference views, popup opens, photo/video engagement and rejoining the tour.
- Added translations for all new interface text in English, Spanish, French, German, Italian, Polish, Dutch and Portuguese.
- Updated offline caching so the new page and scripts work after the tour is downloaded.

## Cache version

`v22-persistent-bus-pages`

## Main new files

- `bus-stop.html`
- `js/bus-stop.js`
- `js/map-points.js`

## Validation completed

- JavaScript syntax checked with Node.
- JSON, GeoJSON and manifest files parsed successfully.
- Local HTML references checked.
- Service-worker core file references checked.
