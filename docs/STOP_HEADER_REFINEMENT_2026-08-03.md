# Stop Header Refinement — 2026-08-03

## Changes

- The stop progress label (for example, `Stop 03 of 18`) now always uses white text over the hero image in light and dark mode.
- The stop navigation header was moved outside the scrolling content and fixed to the visible viewport.
- Mobile header layout is now intentional and aligned:
  - Row 1: Back to route / theme button
  - Row 2: Change language / Exit tour
- Wider screens use one aligned horizontal row.
- The stop content receives exact top spacing for the fixed header, including iPhone safe-area insets.
- The service-worker cache version was updated to `v17-fixed-aligned-stop-header`.

## Test checklist

1. Open a stop on a 320–430 px phone-sized screen.
2. Confirm `Stop ## of 18` remains white in both themes.
3. Scroll through the entire stop page and confirm the header remains fixed.
4. Confirm the header does not overlap the progress bar or hero image.
5. Test Back to route, Change language, Exit tour and the theme toggle.
6. Test both portrait and landscape orientation.
7. Unregister the previous service worker and update the offline tour before testing cached mode.
