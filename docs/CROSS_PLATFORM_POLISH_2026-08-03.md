# Discover Corralejo — Cross-Platform Polish

Updated: 2026-08-03

## Visual and UX changes

- Added a prominent **Up Next** card to the route page.
- Added **List / Map** route views. The map uses the existing local Corralejo PMTiles archive and all 18 stop coordinates.
- Made each route card one large accessible link.
- Added a consistent custom audio interface backed by the native HTML audio element:
  - play/pause
  - skip back/forward 15 seconds
  - seek bar and time display
  - playback speed
  - transcript shortcut
- Added photo counters, position dots and a full-screen image viewer.
- Added video poster images and retained native video controls.
- Added a review badge when a stop still uses placeholder media.
- Added restrained completion animation and optional Android haptic feedback.

## Apple and Android compatibility

- Added `viewport-fit=cover` and safe-area spacing for notches, rounded corners and the iPhone home indicator.
- Added Apple Home Screen metadata and a 180 × 180 Apple touch icon.
- Added separate regular and maskable Android icons.
- Added Android install screenshots and manifest categories.
- Added iPhone/iPad installation instructions because iOS does not expose Chromium's install prompt.
- Preserved pinch zoom accessibility while reducing accidental double-tap zoom.
- Added 44-pixel minimum touch targets for important controls.
- Added compact-phone, landscape and short-screen responsive rules.
- Added reduced-motion and forced-colour support.
- Confirmed all supplied MP4 videos use H.264 video, the safest shared format for Safari and Android Chrome.

## Performance

- Optimised nine oversized JPEG files to a maximum 1,800-pixel edge using progressive JPEG encoding.
- Image storage decreased from approximately 51.2 MB to 9.7 MB, saving around 41.5 MB.
- Added lazy loading and asynchronous decoding to route and gallery images.
- Added video posters to avoid blank or black gallery panels before playback.

## Files and validation

- All JavaScript files passed `node --check`.
- All JSON, GeoJSON and manifest files parsed successfully.
- All 149 media and route references resolve to existing files.
- All 54 service-worker core files exist.
- All HTML pages include the new viewport, Apple metadata and platform stylesheet.

## Required real-device tests after HTTPS deployment

1. iPhone Safari: language selection, route list, route map, audio, gallery, completion and Add to Home Screen.
2. Installed iPhone app: reopen in airplane mode after downloading the offline tour.
3. Android Chrome: install prompt, map, audio, video, vibration and airplane-mode reopening.
4. Android Brave: normal web use and offline download.
5. Compact width around 320–360 px and modern width around 390–430 px.
6. Landscape orientation and increased operating-system text size.

Mobile PWA installation and service-worker offline testing still require HTTPS. Local-network `http://192.168...` testing is not a valid mobile service-worker environment.
