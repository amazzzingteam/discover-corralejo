# Discover Corralejo — Varsha content/map update

1. Back up the current project.
2. Copy all files from the patch into the project root and choose **Replace files**.
3. Run `index.html` with Live Server.
4. In DevTools, unregister the previous service worker and clear site storage.
5. Reload and use **Update offline tour** so the new media is cached.

## Bus reference points

The reusable expanded-map feature and bus media are included. The three entries in
`data/map-points.json` remain unpublished because their decimal coordinates have not yet
been verified. Add `latitude` and `longitude`, then change `published` to `true`; the bus
icons will automatically appear only in the expanded map.
