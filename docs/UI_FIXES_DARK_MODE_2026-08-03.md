# Discover Corralejo — UI fixes and dark mode

Implemented on 2026-08-03.

## Changes

- Removed the unexplained chevron from every Open stop button.
- Fixed Preview route so it opens the Map view, scrolls to it and highlights the selected walking route.
- Added scroll-range correction and CSS safeguards for the large trailing blank area seen after the final route card on iPhone Safari.
- Added a persistent light/dark theme toggle on all app pages.
- Dark mode follows the Atlantic brand palette, updates the browser theme colour, supports system preference and works offline.
- Increased the service-worker cache version so updated HTML, CSS and JavaScript replace the previous offline copy.

## Test checklist

1. Open the route page on iPhone and scroll to Stop 18. Confirm only normal bottom padding remains.
2. Press Preview route in the Up Next card. Confirm the Map tab opens, the page scrolls to the map and the coral route line appears.
3. Confirm route cards no longer show a chevron beside Open stop.
4. Toggle dark mode on the welcome, route, stop and completion pages. Reload and confirm the preference is preserved.
5. Repeat in Android Chrome and desktop Chrome/Safari/Edge.
6. Unregister the previous service worker, clear site data and update the offline tour before testing offline mode.
