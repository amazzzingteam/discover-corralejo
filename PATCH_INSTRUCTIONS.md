# Discover Canarias — Step 7B: tour-aware analytics

This checkpoint makes the existing GA4 layer explicitly multi-tour aware while preserving the current consent requirement and event model.

## What changed

- GA4 `tour_id` now uses the active registry tour ID, so Corralejo reports `corralejo` instead of the legacy app ID `discover-corralejo`.
- Every registered analytics event receives the common parameters:
  - `tour_id`
  - `route_id`
  - `route_version`
  - `selected_language`
  - `interaction`
- `interaction` mirrors the GA4 event name.
- Stop-level interactions use a consistent common `stop_id` dimension. For `next_stop_click`, `from_stop_id` is also exposed as `stop_id`; for `tour_exit`, `last_stop_id` is exposed as `stop_id` when available.
- `tour_complete` now explicitly includes the final stop ID.
- Existing event names and event-specific parameters remain in place.
- Analytics consent is shared across the Discover application at:
  - `tourApp:analytics:consent`
- Existing Corralejo consent under:
  - `tourApp:discover-corralejo:analytics:consent`
  is read and migrated automatically.
- Tour-specific analytics session state now uses the active tour namespace:
  - `tourApp:corralejo:analytics:entrySource`
  - `tourApp:corralejo:analytics:pendingEvents`
- Consent is still required before GA4 events are sent.
- Ad storage/signals remain denied.
- Service-worker cache version: `v33-tour-aware-analytics`.

## Why this matters

The manager requirement is that analytics can distinguish:

```text
tour → stop → language → interaction
```

The shared analytics layer now provides that structure without creating Puerto-specific analytics code. A future Tour 02 will automatically report its own active tour ID.

## Live Server checks

1. Clear/unregister the previous service worker once so `v33-tour-aware-analytics` activates.
2. Open `route.html?tour=corralejo`.
3. In DevTools Console run:

```js
filterAnalyticsParameters("audio_play", {
  stop_id: "02-harbour",
  audio_language: getActiveLanguage()
});
```

Expected key values include:

```text
tour_id: "corralejo"
stop_id: "02-harbour"
selected_language: "<current language>"
interaction: "audio_play"
```

4. Run:

```js
filterAnalyticsParameters("next_stop_click", {
  from_stop_id: "01-supermercado-deseos",
  to_stop_id: "02-harbour"
});
```

Expected:
- `tour_id: "corralejo"`
- `stop_id: "01-supermercado-deseos"`
- `interaction: "next_stop_click"`
- original `from_stop_id` / `to_stop_id` remain present.

5. In Local Storage, accept analytics (or reopen privacy settings and accept) and confirm:
   - `tourApp:analytics:consent = accepted`
6. In Session Storage, confirm:
   - `tourApp:corralejo:analytics:entrySource`
7. Existing `tourApp:discover-corralejo:analytics:*` keys may remain as legacy data; their presence is not a failure.
8. Confirm normal navigation, progress, audio, map and offline UI still work.

## Notes

GA4 already treats the event name as the interaction type. The additional `interaction` parameter mirrors that event name deliberately so the manager's requested reporting chain can be used directly as event parameters/custom dimensions if desired.

No new analytics provider, backend, cookie framework, advertising tracking, or user account system is introduced.
