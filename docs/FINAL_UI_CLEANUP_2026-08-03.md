# Discover Corralejo — Final UI cleanup

Date: 2026-08-03

## Fixes included

### Dark-mode readability

- Primary button text is explicitly light in dark mode.
- Completion text, route instructions, location text, transcripts and stop copy no longer inherit legacy near-black colours.
- Secondary controls retain the Atlantic accent with stronger contrast.
- Map markers, timeline numbers and completion symbols remain readable after the dark surface variables change.

### Bottom action area

- The light sand gradient behind fixed action buttons is replaced with a dark Atlantic fade when dark mode is active.
- Stop and completion page backgrounds continue behind the iPhone safe area.

### iPhone/iPad scroll range

- Route, stop, completion and feedback pages now use a single internal page scroller.
- The document body is locked to the dynamic viewport, preventing Safari from creating an empty scroll region below the content.
- Scroll ranges are clamped after page restoration, rotation, viewport resizing and dynamically loaded media.
- The route page's previous window-based scroll correction now targets the actual page scroller.

## Files changed

- `css/platform-polish.css`
- `js/common.js`
- `js/route.js`
- `feedback-complete.html`
- `service-worker.js`

## Testing after installation

1. Unregister the previous service worker.
2. Clear site data.
3. Reload the project.
4. Select dark mode.
5. Check route, stop and completion pages on iPhone Safari.
6. Scroll to the end of each page and confirm it stops immediately after the intended safe-area spacing.
7. Download/update the offline tour again.

The service-worker cache version is `v16-ios-scroll-dark-cleanup`.
