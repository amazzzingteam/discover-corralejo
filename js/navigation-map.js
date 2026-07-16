function getLineStringFeature(geoJson) {
  if (geoJson?.type === "Feature" && geoJson.geometry?.type === "LineString") {
    return geoJson;
  }

  if (geoJson?.type === "FeatureCollection") {
    return geoJson.features?.find(
      (feature) => feature.geometry?.type === "LineString"
    ) || null;
  }

  return null;
}

function createCorralejoMapStyle(archiveUrl) {
  const roadWidth = [
    "interpolate",
    ["linear"],
    ["zoom"],
    11,
    0.7,
    13,
    1.8,
    15,
    4.6,
    17,
    9
  ];

  const roadCasingWidth = [
    "interpolate",
    ["linear"],
    ["zoom"],
    11,
    1.4,
    13,
    3.2,
    15,
    7,
    17,
    12
  ];

  return {
    version: 8,
    sources: {
      corralejo: {
        type: "vector",
        url: `pmtiles://${archiveUrl}`,
        attribution:
          '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
      }
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#b9dce4"
        }
      },
      {
        id: "earth",
        type: "fill",
        source: "corralejo",
        "source-layer": "earth",
        paint: {
          "fill-color": "#f4ebdd"
        }
      },
      {
        id: "landcover",
        type: "fill",
        source: "corralejo",
        "source-layer": "landcover",
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            "grass",
            "#dfe7d2",
            "wood",
            "#d8e2ce",
            "scrub",
            "#e3e4cf",
            "#eee5d7"
          ],
          "fill-opacity": 0.65
        }
      },
      {
        id: "landuse",
        type: "fill",
        source: "corralejo",
        "source-layer": "landuse",
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            ["park", "cemetery", "golf_course"],
            "#dce7d4",
            ["school", "hospital"],
            "#efe1d6",
            ["beach"],
            "#f2dfb7",
            "#eadfce"
          ],
          "fill-opacity": 0.68
        }
      },
      {
        id: "water",
        type: "fill",
        source: "corralejo",
        "source-layer": "water",
        paint: {
          "fill-color": "#9dced9",
          "fill-outline-color": "#72afc1"
        }
      },
      {
        id: "buildings",
        type: "fill",
        source: "corralejo",
        "source-layer": "buildings",
        minzoom: 12,
        paint: {
          "fill-color": "#d7cbb9",
          "fill-opacity": 0.82,
          "fill-outline-color": "#c2b49f"
        }
      },
      {
        id: "road-casing",
        type: "line",
        source: "corralejo",
        "source-layer": "roads",
        filter: ["!=", ["get", "kind"], "path"],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#d8cbb7",
          "line-width": roadCasingWidth,
          "line-opacity": 0.95
        }
      },
      {
        id: "roads",
        type: "line",
        source: "corralejo",
        "source-layer": "roads",
        filter: ["!=", ["get", "kind"], "path"],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": [
            "match",
            ["get", "kind"],
            ["highway", "major_road"],
            "#fffdf8",
            ["medium_road"],
            "#fffaf1",
            "#ffffff"
          ],
          "line-width": roadWidth,
          "line-opacity": 0.98
        }
      },
      {
        id: "paths",
        type: "line",
        source: "corralejo",
        "source-layer": "roads",
        filter: ["==", ["get", "kind"], "path"],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#c7b79d",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            0.8,
            15,
            2.4,
            17,
            4
          ],
          "line-dasharray": [1.5, 1.5],
          "line-opacity": 0.9
        }
      },
      {
        id: "boundaries",
        type: "line",
        source: "corralejo",
        "source-layer": "boundaries",
        paint: {
          "line-color": "#9aa8a8",
          "line-width": 1,
          "line-dasharray": [3, 3],
          "line-opacity": 0.45
        }
      }
    ]
  };
}

function getMapMarkerLabel(stop) {
  const label = document.createElement("span");
  label.className = "map-stop-marker-label";
  label.textContent = getLocalizedValue(stop.displayName);
  return label;
}

function createMapStopMarker(stop, markerType) {
  const marker = document.createElement("div");
  marker.className = `map-stop-marker map-stop-marker-${markerType}`;
  marker.setAttribute(
    "aria-label",
    `${markerType === "current" ? translate("currentStopMap") : translate("nextStopMap")}: ${getLocalizedValue(stop.displayName)}`
  );
  marker.setAttribute("role", "img");

  const pin = document.createElement("span");
  pin.className = "map-stop-marker-pin";
  pin.dataset.number = stop.number;

  marker.append(pin, getMapMarkerLabel(stop));
  return marker;
}

function getRouteBounds(routeFeature, currentStop, nextStop) {
  const bounds = new maplibregl.LngLatBounds();
  const coordinates = routeFeature.geometry.coordinates || [];

  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  bounds.extend([
    Number(currentStop.coordinates.longitude),
    Number(currentStop.coordinates.latitude)
  ]);
  bounds.extend([
    Number(nextStop.coordinates.longitude),
    Number(nextStop.coordinates.latitude)
  ]);

  return bounds;
}

function addRouteResetControl(map, fitRoute) {
  class RouteResetControl {
    onAdd(currentMap) {
      this.map = currentMap;
      this.container = document.createElement("div");
      this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      this.button = document.createElement("button");
      this.button.type = "button";
      this.button.className = "corralejo-map-reset";
      this.button.title = translate("mapReset");
      this.button.setAttribute("aria-label", translate("mapReset"));
      this.button.textContent = "↺";
      this.button.addEventListener("click", fitRoute);

      this.container.append(this.button);
      return this.container;
    }

    onRemove() {
      this.button?.removeEventListener("click", fitRoute);
      this.container?.remove();
      this.map = null;
    }
  }

  map.addControl(new RouteResetControl(), "top-right");
}

function initialisePmtilesProtocol(archiveUrl) {
  if (!window.maplibregl || !window.pmtiles) {
    throw new Error("The local MapLibre or PMTiles library was not loaded.");
  }

  if (!window.__discoverCorralejoPmtilesProtocol) {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    window.__discoverCorralejoPmtilesProtocol = protocol;
  }

  const archive = new pmtiles.PMTiles(archiveUrl);
  window.__discoverCorralejoPmtilesProtocol.add(archive);
  return archive;
}

function renderRouteMap(container, routeFeature, currentStop, nextStop) {
  const shell = document.createElement("div");
  shell.className = "route-map-shell route-map-shell-real";

  const mapElement = document.createElement("div");
  mapElement.className = "route-map route-map-real";
  mapElement.setAttribute("aria-label", translate("simplifiedMap"));

  const loading = document.createElement("div");
  loading.className = "route-map-loading";
  loading.textContent = translate("mapLoading");

  const mapBadge = document.createElement("div");
  mapBadge.className = "route-map-badge";
  mapBadge.textContent = translate("routePreviewLabel");

  shell.append(mapElement, loading, mapBadge);
  container.replaceChildren(shell);

  const archiveUrl = new URL(
    "assets/maps/corralejo.pmtiles",
    window.location.href
  ).href;

  initialisePmtilesProtocol(archiveUrl);

  const map = new maplibregl.Map({
    container: mapElement,
    style: createCorralejoMapStyle(archiveUrl),
    center: [-13.865, 28.738],
    zoom: 15,
    minZoom: 12,
    maxZoom: 18,
    attributionControl: false,
    cooperativeGestures: false,
    dragRotate: false,
    pitchWithRotate: false,
    maxBounds: [
      [-13.886, 28.710],
      [-13.843, 28.759]
    ]
  });

  const routeBounds = getRouteBounds(routeFeature, currentStop, nextStop);
  const fitRoute = () => {
    map.fitBounds(routeBounds, {
      padding: {
        top: 88,
        right: 70,
        bottom: 92,
        left: 70
      },
      maxZoom: 17,
      duration: 450
    });
  };

  map.addControl(
    new maplibregl.NavigationControl({
      showCompass: false,
      visualizePitch: false
    }),
    "top-right"
  );
  addRouteResetControl(map, fitRoute);
  map.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    "bottom-right"
  );

  map.on("load", () => {
    map.addSource("walking-route", {
      type: "geojson",
      data: routeFeature
    });

    map.addLayer({
      id: "walking-route-halo",
      type: "line",
      source: "walking-route",
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "rgba(255, 253, 248, 0.96)",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          7,
          17,
          17
        ]
      }
    });

    map.addLayer({
      id: "walking-route",
      type: "line",
      source: "walking-route",
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#ff6c66",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          4,
          17,
          10
        ],
        "line-opacity": 0.98
      }
    });

    new maplibregl.Marker({
      element: createMapStopMarker(currentStop, "current"),
      anchor: "bottom"
    })
      .setLngLat([
        Number(currentStop.coordinates.longitude),
        Number(currentStop.coordinates.latitude)
      ])
      .addTo(map);

    new maplibregl.Marker({
      element: createMapStopMarker(nextStop, "next"),
      anchor: "bottom"
    })
      .setLngLat([
        Number(nextStop.coordinates.longitude),
        Number(nextStop.coordinates.latitude)
      ])
      .addTo(map);

    loading.hidden = true;
    fitRoute();
  });

  map.on("error", (event) => {
    console.warn("Corralejo map warning:", event.error || event);
  });

  window.addEventListener(
    "resize",
    () => map.resize(),
    { passive: true }
  );
}

async function initialiseNextStopRoutePreview(stop) {
  const section = document.querySelector("#next-stop-route-preview");
  const mapContainer = document.querySelector("#next-stop-map");
  const summary = document.querySelector("#next-stop-route-summary");
  const instructionList = document.querySelector("#next-stop-route-instructions");

  if (!section || !mapContainer || !stop?.nextStop?.slug) {
    return;
  }

  const route = getRouteFromStop(stop);
  const nextStop = getStopBySlug(stop.nextStop.slug);

  if (!route || !nextStop || !route.geometryFile) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  summary.textContent = translate("estimatedWalk", {
    minutes: route.walkingMinutes || "–",
    distance: route.distanceMetres || "–"
  });

  instructionList.replaceChildren();
  const instructions = getLocalizedValue(route.instructions);
  const instructionItems = Array.isArray(instructions)
    ? instructions
    : instructions
      ? [instructions]
      : [];

  instructionItems.forEach((instruction) => {
    const item = document.createElement("li");
    item.textContent = instruction;
    instructionList.append(item);
  });

try {
  const response = await fetch(route.geometryFile);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const geoJson = await response.json();
  const routeFeature = getLineStringFeature(geoJson);

  if (!routeFeature) {
    throw new Error("No LineString geometry was found.");
  }

  renderRouteMap(
    mapContainer,
    routeFeature,
    stop,
    nextStop
  );
} catch (error) {
  console.warn(
    "The in-app route preview could not be loaded:",
    error
  );

  mapContainer.innerHTML = `
    <p class="route-map-error">
      ${translate("mapUnavailable")}
    </p>
  `;
}
