# Discover Corralejo offline setup

## Tourist flow

Before beginning the walking tour, the tourist should:

1. Connect to Wi-Fi.
2. Open the route overview.
3. Press **Download tour for offline use**.
4. Wait until the app says the full tour is ready.

After that, the app pages and downloaded stop media can be used without internet.

## Status messages

A status strip is displayed at the top of every page. It explains whether the device is online or offline and whether the full tour has been saved.

The route page also shows download progress, failed-file warnings and the option to update the saved tour when content changes.

## What is cached

The offline package is generated from the current JSON data and includes:

- Main app pages and styles
- App scripts and icons
- `tour.json`, `stops.json` and `content-extension.json`
- Every published stop hero image and gallery image
- Every published stop video
- Every available audio language path
- Placeholder media referenced by the tour

Audio and video byte-range requests are supported so cached media can play and seek offline.

## What still requires internet

- Google Maps and external navigation links
- The external feedback form
- Immediate delivery of Google Analytics events

Analytics events created offline can be queued by the analytics implementation and sent after reconnection when consent was accepted.

## Testing after an update

1. Serve the project through HTTPS or VS Code Live Server on localhost.
2. In Chrome/Edge DevTools, unregister the previous service worker and clear site data.
3. Reload the app.
4. Download the tour and wait for the ready message.
5. Switch DevTools Network throttling to **Offline**.
6. Refresh and test route pages, multiple stops, images, audio, video and next-stop navigation.
7. Reconnect and confirm the top status message updates.

See `OFFLINE_TASKS_T01_T03.md` for the full acceptance checklist.

## Deployment requirement

A public deployment must use HTTPS. Localhost is accepted for development, but a normal public HTTP address will not provide reliable service-worker/PWA functionality.
