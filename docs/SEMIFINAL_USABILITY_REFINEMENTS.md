# Semifinal usability refinements

This update makes three requested interface changes:

1. Accidental double-tap page zoom is disabled on touch devices. Normal scrolling and pinch zoom remain available.
2. The Privacy Settings control is tucked into the right edge. Tap once to reveal it, then tap again to open the consent choices. It collapses automatically or when tapping elsewhere.
3. The app-wide offline/online header was removed. Offline download state and progress remain on the route overview page.

After installing the patch, unregister the old service worker, clear site storage, and reload so cache version v12 is activated.
