# Offline tasks T01–T03 audit and acceptance report

Date: 15 July 2026

## Status summary

| Task | Result in this update | Acceptance evidence |
|---|---|---|
| T01 — Audit the current PWA and offline setup | Met | Manifest, service-worker registration, cache lists, JSON, scripts and asset paths audited. Results are listed below. |
| T02 — Fix offline caching for stop media and audio | Met in code; complete the manual device test below before marking fully tested | Every published stop image, video and language audio path is collected from `data/stops.json`; explicit downloads refresh cached copies; audio/video range requests are served from cache. |
| T03 — Add a clear offline status/message | Met | A translated status bar is shown on every app page, plus download progress and clear ready/partial/error messages on the route page. |

## T01 audit results

The following automated file and syntax checks passed:

- 18 published tour stops found.
- 8 languages found: English, Spanish, French, German, Italian, Polish, Dutch and Portuguese.
- 217 stop/placeholder asset references checked.
- 54 unique media files referenced.
- 0 referenced media files missing.
- Every stop contains audio entries for all 8 languages. Dutch and Portuguese may point to approved placeholder audio until final recordings arrive.
- 23 service-worker core files checked.
- 0 core files missing.
- `manifest.webmanifest` is linked from every HTML page.
- `js/register-sw.js` is loaded by every HTML page.
- `js/offline.js` is now loaded by every HTML page.
- All JavaScript files passed `node --check`.
- `tour.json`, `stops.json` and `content-extension.json` passed JSON validation.

## T02 caching changes

The service worker now:

1. Caches the core application shell during installation.
2. Keeps the installation from failing because of a missing optional file, while still requiring the essential pages, data and scripts.
3. Downloads every same-origin media path collected dynamically from `stops.json`.
4. Includes hero images, photo galleries, videos, all language audio files and placeholder media.
5. Refreshes files when **Update offline tour** is pressed, so an old cached image/audio file is not silently reused.
6. Reports failed files instead of incorrectly claiming that the full route is ready.
7. Supports byte-range responses for cached audio and video, allowing playback and seeking while offline.
8. Falls back to cached HTML pages when navigation includes stop query strings such as `stop.html?stop=harbour`.
9. Deletes obsolete Discover Corralejo cache versions when the new worker activates.

Google Maps, the external feedback form and immediate GA4 delivery still require internet. They are not part of the downloadable same-origin tour package.

## T03 status/message changes

A translated status strip now appears at the top of every page. It can show:

- Checking offline availability
- Online — tour not downloaded yet
- Online — full tour saved for offline use
- Downloading with file count and percentage
- Offline mode — downloaded pages and media available
- Offline mode — some files missing
- Offline mode unsupported

The route page additionally includes:

- A visible download progress bar
- Exact progress such as `42% — downloading 51 of 121 files…`
- A full-tour-ready confirmation
- A partial-download warning with the number of failed files
- **Update offline tour** after a successful download
- **Retry offline download** after a failed or partial download

All messages are included in the app's 8 languages.

## Required manual acceptance test

Run this once in Chrome or Edge before setting all three tracker rows to **Done**:

1. Replace the patch files and start the project using Live Server.
2. Open DevTools → Application → Service Workers.
3. Unregister the previous worker, then open Application → Storage and clear site data.
4. Reload the app and select a language.
5. On the route page, confirm the top message says the tour has not yet been downloaded.
6. Press **Download tour for offline use** while online.
7. Confirm the progress bar and percentage increase until the full-tour-ready message appears.
8. In DevTools → Network, select **Offline**.
9. Refresh `route.html`.
10. Open at least three stops, including one with its own supplied media, for example Stop 03 or Stop 14.
11. Confirm hero images and gallery images display.
12. Play audio and seek forward in it.
13. Play a video and seek forward in it.
14. Complete a stop and continue directly to the next stop.
15. Confirm the top status strip says the app is in offline mode and downloaded content is available.
16. Re-enable the network and confirm the status changes back to online/full-tour-ready.

If all sixteen checks pass, T01, T02 and T03 can be marked **Done**.
