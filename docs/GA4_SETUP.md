# Google Analytics 4 setup

The project includes a privacy-conscious GA4 event layer based on the Discover Corralejo PWA Analytics Plan.

## 1. Create the GA4 property

1. Open Google Analytics.
2. Create or select the property for the tour.
3. Go to **Admin -> Data collection and modification -> Data streams**.
4. Create a **Web** data stream for the final website domain.
5. Copy the Measurement ID. It begins with `G-`.

## 2. Add the Measurement ID

Open `data/tour.json` and find:

```json
"analytics": {
  "enabled": true,
  "measurementId": "G-REPLACE_ME",
  "consentRequired": true,
  "debugMode": true,
  "defaultEntrySource": "direct",
  "privacyPolicyUrl": ""
}
```

Replace `G-REPLACE_ME` with the real Measurement ID.

During testing, keep:

```json
"debugMode": true
```

Before the public launch, change it to:

```json
"debugMode": false
```

Add the approved privacy-policy page to `privacyPolicyUrl` when it is available.

## 3. Route identity

The reusable route identifiers are also stored in `data/tour.json`:

```json
"route": {
  "id": "corralejo-walking-route",
  "version": "route-v1"
}
```

Increase the version when the route changes in a way that affects reporting, for example `route-v2`.

Each stop needs a permanent analytics ID in `data/stops.json`:

```json
"id": "02-harbour"
```

Do not reuse a stop ID for a different location.

## 4. Consent behaviour

The Google tag is not loaded until the tourist accepts analytics. A consent banner is shown on the first visit. The tourist can later reopen it using the **Privacy settings** button.

The analytics code uses an event and parameter allowlist. It does not accept arbitrary parameters, written feedback, names, contact details, or exact GPS coordinates.

## 5. Events implemented

| Event | Current trigger |
|---|---|
| `tour_start` | Start Tour button |
| `language_selected` | A language is selected or changed |
| `route_view` | Route overview loads |
| `stop_open` | A published stop page loads |
| `audio_play` | Audio begins for the first time on that page visit |
| `audio_progress` | Audio reaches 25%, 50%, 75%, and 90% |
| `audio_complete` | Audio reaches the end |
| `map_open` | Current-stop or next-stop map button |
| `next_stop_click` | Directions to the next stop button |
| `stop_exit` | The stop is left using route, map, next stop, exit, or browser navigation |
| `tour_exit` | Exit Tour button |
| `tour_complete` | Completion page for a final stop |
| `install_pwa` | Browser confirms successful PWA installation |
| `feedback_open` | Configured feedback link is opened |
| `feedback_submit` | Feedback system returns to the feedback completion page |

The current Harbour sample is not marked as the final stop, so `tour_complete` does not fire yet. A final stop should have either:

```json
"isFinal": true
```

or no `nextStop.slug`.

## 6. Entry source for QR codes

Add `source` to the entry URL:

```text
https://example.com/index.html?source=main_qr
```

Other examples:

```text
?source=hotel_qr
?source=harbour_sign
?source=tourism_office
```

Only lowercase letters, numbers, underscores, and hyphens are retained.

## 7. Feedback integration

Feedback is disabled until a real feedback form is available.

In `data/tour.json`:

```json
"feedback": {
  "enabled": true,
  "urlTemplate": "https://example.com/feedback?route_id={route_id}&selected_language={selected_language}"
}
```

The placeholders are automatically replaced. Written answers remain in the feedback system and are not sent to GA4.

To track a successful submission, configure the feedback system to return to:

```text
feedback-complete.html?has_comment=true
```

or:

```text
feedback-complete.html?has_comment=false
```

Only the boolean value is sent to GA4, never the comment.

## 8. Custom definitions in GA4

Custom event parameters can appear in DebugView before custom definitions are created. To use them conveniently in reports and Explorations, create event-scoped custom dimensions for the categorical values you need.

Recommended event-scoped custom dimensions:

- `tour_id`
- `route_id`
- `route_version`
- `selected_language`
- `entry_source`
- `selection_location`
- `view_source`
- `stop_id`
- `audio_language`
- `progress_percent`
- `map_destination`
- `from_stop_id`
- `to_stop_id`
- `exit_method`
- `last_stop_id`
- `install_source`
- `source_page`
- `has_comment`

Recommended custom metrics:

- `time_on_stop_seconds`
- `completed_stop_count`

Create only the definitions that will actually be used in reports.

## 9. Key events

After the events have appeared in GA4, mark these as key events:

- `tour_start`
- `tour_complete`
- `feedback_submit`

## 10. Testing

1. Run the project with VS Code Live Server.
2. Open Developer Tools -> Console.
3. Accept analytics.
4. Complete each action in the analytics plan.
5. Console messages beginning with `[GA4 ...]` show the event name and safe parameters.
6. In GA4, open **Admin -> DebugView**.
7. Confirm each event and its parameters.
8. Test declining consent and confirm that events are blocked.
9. Test changing the privacy preference from accepted to declined and back.
10. Test on a real HTTPS deployment because PWA installation is not fully testable through a normal local preview.

Standard GA4 reports can take longer to populate; use Realtime and DebugView while testing.
