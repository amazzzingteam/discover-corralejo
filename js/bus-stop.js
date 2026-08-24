let activeBusPoint = null;

function showBusStopNotFound() {
  const main = document.querySelector("main");
  main.innerHTML = `
    <section class="content-section">
      <h1>${translate("busStopNotFound")}</h1>
      <p>${translate("busStopNotFoundBody")}</p>
      <a class="button" href="${buildTourUrl("route.html", { view_source: "bus_stop_not_found" })}">
        ${translate("backToRoute")}
      </a>
    </section>
  `;
}

function getGalleryText(current, total) {
  return translate("galleryItem", { current, total });
}

function createBusMediaLightbox() {
  let dialog = document.querySelector("#bus-media-lightbox");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "bus-media-lightbox";
  dialog.className = "media-lightbox";
  dialog.setAttribute("aria-label", translate("photos"));

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "media-lightbox-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";

  const image = document.createElement("img");
  image.className = "media-lightbox-image";
  image.alt = "";

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.append(closeButton, image);
  document.body.append(dialog);
  return dialog;
}

function openBusMediaLightbox(src, alt) {
  const dialog = createBusMediaLightbox();
  const image = dialog.querySelector(".media-lightbox-image");
  image.src = src;
  image.alt = alt || "";

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function setupBusGalleryStatus(gallery, counter, dotsContainer) {
  const items = [...gallery.children];
  if (!counter || !dotsContainer || items.length === 0) return;

  dotsContainer.replaceChildren();
  const dots = items.map((_, index) => {
    const dot = document.createElement("span");
    dot.className = `gallery-dot${index === 0 ? " is-active" : ""}`;
    dotsContainer.append(dot);
    return dot;
  });

  const update = () => {
    const galleryRect = gallery.getBoundingClientRect();
    const targetX = galleryRect.left + gallery.clientWidth / 2;
    let activeIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - targetX);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = index;
      }
    });

    counter.textContent = getGalleryText(activeIndex + 1, items.length);
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
  };

  gallery.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

function renderBusPhotos(point) {
  const section = document.querySelector("#bus-photo-section");
  const gallery = document.querySelector("#bus-photo-gallery");
  const counter = document.querySelector("#bus-photo-counter");
  const dots = document.querySelector("#bus-photo-dots");
  const photos = point.media?.photos || [];

  gallery.replaceChildren();
  section.hidden = photos.length === 0;

  photos.forEach((photoData, index) => {
    const src = typeof photoData === "string" ? photoData : photoData.src;
    if (!src) return;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "media-item media-item-button";

    const image = document.createElement("img");
    image.src = src;
    image.alt = getLocalizedValue(photoData.alt || point.displayName);
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    image.className = "content-image";
    image.addEventListener("load", () => {
      item.classList.toggle("is-portrait", image.naturalHeight > image.naturalWidth * 1.1);
    }, { once: true });

    const hint = document.createElement("span");
    hint.className = "media-expand-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "↗";

    item.setAttribute("aria-label", image.alt);
    item.addEventListener("click", () => {
      openBusMediaLightbox(image.currentSrc || image.src, image.alt);
      if (typeof trackAnalyticsEvent === "function") {
        trackAnalyticsEvent("bus_photo_open", {
          map_point_id: point.id,
          photo_index: index + 1
        });
      }
    });

    item.append(image, hint);
    gallery.append(item);
  });

  setupBusGalleryStatus(gallery, counter, dots);
}

function renderBusVideos(point) {
  const section = document.querySelector("#bus-video-section");
  const gallery = document.querySelector("#bus-video-gallery");
  const counter = document.querySelector("#bus-video-counter");
  const dots = document.querySelector("#bus-video-dots");
  const videos = point.media?.videos || [];

  gallery.replaceChildren();
  section.hidden = videos.length === 0;

  videos.forEach((videoData, index) => {
    const src = typeof videoData === "string" ? videoData : videoData.src;
    if (!src) return;

    const item = document.createElement("div");
    item.className = "media-item media-item-video";

    const video = document.createElement("video");
    video.src = src;
    video.poster = videoData.poster || point.media?.photos?.[0]?.src || "";
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.className = "content-video";

    const applyOrientation = () => {
      const declaredOrientation = videoData.orientation ||
        (/vertical|portrait/i.test(src) ? "portrait" :
          (/horizontal|landscape/i.test(src) ? "landscape" : ""));
      const isPortrait = declaredOrientation === "portrait" ||
        (!declaredOrientation && video.videoHeight > video.videoWidth);
      item.classList.toggle("is-portrait-video", isPortrait);
      item.classList.toggle("is-landscape-video", !isPortrait);
      video.style.aspectRatio = isPortrait ? "9 / 16" : "16 / 9";
    };

    video.addEventListener("loadedmetadata", applyOrientation);
    video.addEventListener("play", () => {
      if (typeof trackAnalyticsEvent === "function") {
        trackAnalyticsEvent("bus_video_play", {
          map_point_id: point.id,
          video_index: index + 1
        });
      }
    }, { once: true });
    applyOrientation();

    item.append(video);
    gallery.append(item);
  });

  setupBusGalleryStatus(gallery, counter, dots);
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function getDistanceMetres(first, second) {
  const earthRadius = 6371000;
  const latitude1 = toRadians(Number(first.latitude));
  const latitude2 = toRadians(Number(second.latitude));
  const deltaLatitude = latitude2 - latitude1;
  const deltaLongitude = toRadians(Number(second.longitude) - Number(first.longitude));

  const a = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestTourStop(point) {
  return getPublishedStops()
    .map((stop) => ({
      stop,
      distance: getDistanceMetres(point.coordinates, stop.coordinates)
    }))
    .sort((first, second) => first.distance - second.distance)[0] || null;
}

function formatWalkingDistance(distance) {
  if (!Number.isFinite(distance)) return "";
  if (distance < 1000) return `${Math.round(distance / 10) * 10} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

function createWalkingDirectionsUrl(point, stop) {
  const origin = `${point.coordinates.latitude},${point.coordinates.longitude}`;
  const destination = `${stop.coordinates.latitude},${stop.coordinates.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}

function createBusRouteStopMarker(stop, isNearest) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = `bus-route-stop-marker${isNearest ? " is-nearest" : ""}`;
  marker.textContent = stop.number;
  marker.setAttribute("aria-label", `${translate("stopNumber", { number: stop.number })}: ${getLocalizedValue(stop.displayName)}`);
  return marker;
}

function getRouteLineFeatures(geoJson) {
  if (geoJson?.type === "Feature" && geoJson.geometry?.type === "LineString") {
    return [geoJson];
  }
  if (geoJson?.type === "FeatureCollection") {
    return (geoJson.features || []).filter((feature) => feature.geometry?.type === "LineString");
  }
  return [];
}

async function loadFullRouteGeometry() {
  const routeResults = await Promise.allSettled(
    getPublishedRoutes()
      .filter((route) => route.geometryFile)
      .map(async (route) => {
        const response = await fetch(new URL(route.geometryFile, document.baseURI).href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
  );

  return {
    type: "FeatureCollection",
    features: routeResults.flatMap((result) =>
      result.status === "fulfilled" ? getRouteLineFeatures(result.value) : []
    )
  };
}

async function renderBusStopMap(point, nearestEntry) {
  const container = document.querySelector("#bus-stop-map");
  const loading = document.querySelector("#bus-stop-map-loading");
  if (!container || !window.maplibregl || !window.pmtiles) return;

  const mapConfig = getTourMapConfig();
  const viewConfig = getTourMapViewConfig("referencePoint");
  const archiveUrl = getTourMapArchiveUrl();
  initialisePmtilesProtocol(archiveUrl);

  const map = new maplibregl.Map({
    container,
    style: createTourMapStyle(archiveUrl),
    center: [Number(point.coordinates.longitude), Number(point.coordinates.latitude)],
    zoom: viewConfig.zoom,
    minZoom: viewConfig.minZoom ?? mapConfig.minZoom,
    maxZoom: viewConfig.maxZoom ?? mapConfig.maxZoom,
    attributionControl: false,
    cooperativeGestures: false,
    dragRotate: false,
    pitchWithRotate: false,
    maxBounds: viewConfig.bounds || mapConfig.bounds
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

  map.on("load", async () => {
    const fullRoute = await loadFullRouteGeometry();
    if (fullRoute.features.length > 0) {
      map.addSource("full-tour-route", { type: "geojson", data: fullRoute });
      map.addLayer({
        id: "full-tour-route-halo",
        type: "line",
        source: "full-tour-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "rgba(255, 253, 248, 0.92)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 17, 10]
        }
      });
      map.addLayer({
        id: "full-tour-route",
        type: "line",
        source: "full-tour-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#72afc1",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.8, 17, 6],
          "line-opacity": 0.88
        }
      });
    }

    const stops = getPublishedStops();
    const bounds = new maplibregl.LngLatBounds();

    stops.forEach((stop) => {
      const isNearest = nearestEntry?.stop?.slug === stop.slug;
      const element = createBusRouteStopMarker(stop, isNearest);
      const popupContent = document.createElement("div");
      const title = document.createElement("p");
      title.className = "map-popup-title";
      title.textContent = `${stop.number}. ${getLocalizedValue(stop.displayName)}`;
      const link = document.createElement("a");
      link.className = "map-popup-link";
      link.href = buildTourUrl("stop.html", { stop: stop.slug, from: "bus_stop_map" });
      link.textContent = translate("openStop");
      popupContent.append(title, link);

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setDOMContent(popupContent);
      const coordinates = [Number(stop.coordinates.longitude), Number(stop.coordinates.latitude)];
      new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map);
      bounds.extend(coordinates);
    });

    const busCoordinates = [Number(point.coordinates.longitude), Number(point.coordinates.latitude)];
    const busElement = createMapReferenceMarker(point);
    new maplibregl.Marker({ element: busElement, anchor: "bottom" })
      .setLngLat(busCoordinates)
      .addTo(map);
    bounds.extend(busCoordinates);

    if (nearestEntry?.stop) {
      const nearestCoordinates = [
        Number(nearestEntry.stop.coordinates.longitude),
        Number(nearestEntry.stop.coordinates.latitude)
      ];
      map.addSource("bus-rejoin-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [busCoordinates, nearestCoordinates] }
        }
      });
      map.addLayer({
        id: "bus-rejoin-line",
        type: "line",
        source: "bus-rejoin-line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ff6c66",
          "line-width": 4,
          "line-dasharray": [1.5, 1.5]
        }
      });
    }

    map.fitBounds(bounds, {
      padding: { top: 56, right: 44, bottom: 56, left: 44 },
      maxZoom: viewConfig.fitMaxZoom ?? mapConfig.maxZoom,
      duration: 0
    });

    loading.hidden = true;
  });

  map.on("error", (event) => {
    console.warn("Bus stop map warning:", event.error || event);
  });

  window.addEventListener("resize", () => map.resize(), { passive: true });
}

function setupBusStopActions(point, nearestEntry) {
  const backLink = document.querySelector("#back-to-route-link");
  const languageLink = document.querySelector("#change-language-link");
  const exitButton = document.querySelector("#exit-tour-button");
  const mapsButton = document.querySelector("#bus-maps-button");
  const rejoinButton = document.querySelector("#rejoin-tour-button");
  const directionsButton = document.querySelector("#walking-directions-button");

  mapsButton.href = point.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.coordinates.latitude},${point.coordinates.longitude}`)}`;
  mapsButton.addEventListener("click", () => {
    trackAnalyticsEvent("map_open", {
      map_point_id: point.id,
      map_destination: "bus_stop"
    });
  });

  if (nearestEntry?.stop) {
    const nearestName = getLocalizedValue(nearestEntry.stop.displayName);
    const stopUrl = buildTourUrl("stop.html", { stop: nearestEntry.stop.slug, from: "bus_stop_page" });
    rejoinButton.href = stopUrl;
    rejoinButton.textContent = translate("rejoinTourAt", { name: nearestName });
    directionsButton.href = createWalkingDirectionsUrl(point, nearestEntry.stop);

    rejoinButton.addEventListener("click", () => {
      trackAnalyticsEvent("bus_rejoin_click", {
        map_point_id: point.id,
        to_stop_id: getStopAnalyticsId(nearestEntry.stop)
      });
    });
  } else {
    rejoinButton.href = buildTourUrl("route.html", { view_source: "bus_stop_page" });
    rejoinButton.textContent = translate("backToRoute");
    directionsButton.hidden = true;
  }

  backLink?.addEventListener("click", () => {
    trackAnalyticsEvent("bus_reference_exit", { map_point_id: point.id, destination: "route" });
  });

  languageLink?.addEventListener("click", () => {
    trackAnalyticsEvent("bus_reference_exit", { map_point_id: point.id, destination: "language" });
  });

  exitButton?.addEventListener("click", () => {
    const parameters = {
      last_map_point_id: point.id,
      completed_stop_count: getCompletedStopCount(),
      selected_language: getActiveLanguage()
    };
    resetTourProgress();
    trackAnalyticsEventAndNavigate(
      "tour_exit",
      parameters,
      buildTourUrl("index.html", { from: "exit_tour" })
    );
  });
}

function renderBusStop(point) {
  const pointName = getLocalizedValue(point.displayName);
  const firstPhoto = point.media?.photos?.[0];
  const heroSrc = typeof firstPhoto === "string" ? firstPhoto : firstPhoto?.src;

  setCustomDocumentTitle(pointName);
  document.querySelector("#bus-stop-title").textContent = pointName;
  document.querySelector("#bus-stop-description").textContent = getLocalizedValue(point.description);

  const hero = document.querySelector("#bus-stop-hero");
  hero.src = heroSrc || getPlaceholderAsset("heroImage");
  hero.alt = pointName;
  hero.addEventListener("error", () => {
    const fallback = getPlaceholderAsset("heroImage");
    if (fallback && hero.src !== new URL(fallback, document.baseURI).href) hero.src = fallback;
  }, { once: true });

  renderBusPhotos(point);
  renderBusVideos(point);

  const nearestEntry = findNearestTourStop(point);
  const nearestCard = document.querySelector("#nearest-stop-card");
  if (nearestEntry?.stop) {
    nearestCard.hidden = false;
    document.querySelector("#nearest-stop-name").textContent = getLocalizedValue(nearestEntry.stop.displayName);
    document.querySelector("#nearest-stop-distance").textContent = translate("walkingDistanceToTour", {
      distance: formatWalkingDistance(nearestEntry.distance)
    });
  }

  setupBusStopActions(point, nearestEntry);
  renderBusStopMap(point, nearestEntry);

  trackAnalyticsEvent("bus_reference_view", {
    map_point_id: point.id,
    selected_language: getActiveLanguage()
  });
}

function initialiseBusStopPage() {
  if (!requireSelectedLanguage()) return;
  applyPageTranslations();

  const pointId = getQueryParameter("point");
  const point = getTourData().mapPointsById?.[pointId] || null;
  if (!point || point.published === false) {
    showBusStopNotFound();
    return;
  }

  activeBusPoint = point;
  renderBusStop(point);
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseBusStopPage);
});
