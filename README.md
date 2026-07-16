# Reusable JSON Tour App with GA4

This version keeps the reusable JSON tour structure and adds Google Analytics 4 event tracking based on the Discover Corralejo PWA Analytics Plan.

## Run the project

Use VS Code **Live Server** and begin at `index.html`.

Do not double-click an HTML file and open it with a `file:///` address. The project loads JSON using `fetch()`.

## First GA4 setup

Open:

```text
data/tour.json
```

Replace:

```json
"measurementId": "G-REPLACE_ME"
```

with the Measurement ID from the GA4 web data stream.

Then follow:

```text
docs/GA4_SETUP.md
```

## Analytics privacy

- The Google tag loads only after analytics consent is accepted.
- Event parameters are controlled by an allowlist in `js/analytics.js`.
- Names, contact details, written feedback, and exact GPS coordinates are not sent to GA4.
- A Privacy settings button lets the tourist change the choice later.

## Main data files

### `data/tour.json`

Controls:

- App and route identifiers
- Route version
- App name
- Languages and translations
- GA4 Measurement ID and consent settings
- Feedback form configuration

### `data/stops.json`

Contains each stop, including its permanent analytics `id`, content, media, map information, and next-stop information.

### `data/stop-template.json`

Blank reusable stop object. Every real stop should receive a unique permanent `id`, such as `03-avenida-maritima`.

## Main analytics file

```text
js/analytics.js
```

It handles:

- Consent
- Safe event parameter filtering
- GA4 loading
- Pending events before consent
- Route entry source
- PWA installation
- Feedback links
- Debug console messages

## Reusing the app for another tour

Duplicate the folder and update:

- `data/tour.json`
- `data/stops.json`
- `assets/stops/`
- `manifest.webmanifest`
- App icons if required

Create a separate GA4 web data stream or property when Amazzzing wants the tours reported separately.
