let routeOverviewMap = null;
let routeOverviewMapReady = false;
let routeOverviewPendingPreviewStop = null;
let routeOverviewPreviewRequest = 0;
let routeOverviewMapPointMarkers = [];
let routeOverviewMapExpanded = false;

function getStopTypeClass(stop) {
  const typeClasses = {
    startPoint: "start",
    mainStop: "main",
    secretInstagrammableSpot: "secret",
    hiddenGem: "hidden"
  };

  return typeClasses[stop.typeKey] || "main";
}

function getRouteState(stop, completedStopIds, currentStopId) {
  const stopId = getStopAnalyticsId(stop);

  if (completedStopIds.has(stopId)) {
    return "completed";
  }

  if (stopId === currentStopId) {
    return "current";
  }

  return "upcoming";
}

function createStopTypeBadge(stop) {
  const badge = document.createElement("span");
  badge.className = `stop-type-chip stop-type-chip-${getStopTypeClass(stop)}`;
  badge.textContent = getLocalizedValue(stop.typeLabel) || translate(stop.typeKey);
  return badge;
}

function createRouteCard(stop, completedStopIds, currentStopId) {
  const state = getRouteState(stop, completedStopIds, currentStopId);
  const typeClass = getStopTypeClass(stop);
  const stopUrl = `stop.html?stop=${encodeURIComponent(stop.slug)}`;

  const card = document.createElement("a");
  card.className = `stop-card stop-card-${typeClass} is-${state}`;
  card.href = stopUrl;
  card.setAttribute("aria-label", `${getLocalizedValue(stop.displayName)}. ${translate("openStop")}`);

  const timelineMarker = document.createElement("div");
  timelineMarker.className = "route-timeline-marker";
  timelineMarker.textContent = state === "completed" ? "✓" : stop.number;
  timelineMarker.setAttribute("aria-hidden", "true");

  const imageWrap = document.createElement("div");
  imageWrap.className = "stop-card-image-wrap";

  const image = document.createElement("img");
  image.className = "stop-card-image";
  image.src = stop.media.heroImage;
  image.addEventListener("error", () => {
    const fallbackHero = getPlaceholderAsset("heroImage");
    if (fallbackHero && image.src !== new URL(fallbackHero, document.baseURI).href) {
      image.src = fallbackHero;
    }
  }, { once: true });
  image.alt = getLocalizedValue(stop.media.heroAlt || stop.displayName);
  image.loading = "lazy";
  image.decoding = "async";

  const imageNumber = document.createElement("span");
  imageNumber.className = "stop-card-image-number";
  imageNumber.textContent = stop.number;

  imageWrap.append(image, imageNumber);

  const content = document.createElement("div");
  content.className = "stop-card-content";

  const metaRow = document.createElement("div");
  metaRow.className = "stop-card-meta-row";
  metaRow.appendChild(createStopTypeBadge(stop));

  const status = document.createElement("span");
  status.className = `stop-status stop-status-${state}`;
  status.textContent = state === "completed"
    ? translate("completedStatus")
    : state === "current"
      ? translate("upNextStatus")
      : translate("upcomingStatus");
  metaRow.appendChild(status);

  const title = document.createElement("h3");
  title.textContent = getLocalizedValue(stop.displayName);

  const button = document.createElement("span");
  button.className = state === "current"
    ? "button stop-card-button"
    : "button button-ghost stop-card-button";
  button.textContent = state === "current" ? translate("continueTour") : translate("openStop");

  content.append(metaRow, title, button);
  card.append(timelineMarker, imageWrap, content);

  return card;
}

function getCurrentStop(stops, completedStopIds) {
  return stops.find((stop) => !completedStopIds.has(getStopAnalyticsId(stop))) || null;
}

function renderUpNextCard(currentStop) {
  const card = document.querySelector("#up-next-card");
  if (!card) {
    return;
  }

  if (!currentStop) {
    card.hidden = true;
    return;
  }

  const route = getRouteFromStop(currentStop);
  const image = document.querySelector("#up-next-image");
  const number = document.querySelector("#up-next-number");
  const heading = document.querySelector("#up-next-heading");
  const meta = document.querySelector("#up-next-meta");
  const openButton = document.querySelector("#up-next-open");
  const mapButton = document.querySelector("#up-next-map");

  card.hidden = false;
  image.src = currentStop.media.heroImage;
  image.alt = getLocalizedValue(currentStop.media.heroAlt || currentStop.displayName);
  number.textContent = currentStop.number;
  heading.textContent = getLocalizedValue(currentStop.displayName);
  openButton.href = `stop.html?stop=${encodeURIComponent(currentStop.slug)}`;
  openButton.textContent = translate("continueTo", {
    name: getLocalizedValue(currentStop.displayName)
  });

  if (route) {
    meta.textContent = translate("estimatedWalk", {
      minutes: route.walkingMinutes || "–",
      distance: route.distanceMetres || "–"
    });
  } else {
    meta.textContent = getLocalizedValue(currentStop.typeLabel) || translate(currentStop.typeKey);
  }

  mapButton.onclick = () => {
    activateRouteView("map", currentStop);

    window.setTimeout(() => {
      document.querySelector("#route-map-panel")?.scrollIntoView({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
          ? "auto"
          : "smooth",
        block: "start"
      });
    }, 80);
  };
}

function renderRouteSummary(stops) {
  const completedStopIds = new Set(getCompletedStopIds());
  const currentStop = getCurrentStop(stops, completedStopIds);
  const completedCount = stops.filter((stop) => completedStopIds.has(getStopAnalyticsId(stop))).length;
  const totalDistance = getPublishedRoutes().reduce((sum, route) => sum + Number(route.distanceMetres || 0), 0);
  const distanceKilometres = (totalDistance / 1000).toFixed(1);

  const meta = document.querySelector("#route-meta");
  if (meta) {
    meta.textContent = translate("routeMetaTemplate", {
      stops: stops.length,
      distance: distanceKilometres
    });
  }

  const progressTitle = document.querySelector("#route-progress-title");
  if (progressTitle) {
    progressTitle.textContent = translate("routeProgress", {
      completed: completedCount,
      total: stops.length
    });
  }

  const progressFill = document.querySelector("#route-progress-fill");
  if (progressFill) {
    const percentage = stops.length ? Math.round((completedCount / stops.length) * 100) : 0;
    requestAnimationFrame(() => {
      progressFill.style.width = `${percentage}%`;
    });
  }

  const continueButton = document.querySelector("#continue-tour-button");
  if (continueButton) {
    if (currentStop) {
      continueButton.hidden = false;
      continueButton.href = `stop.html?stop=${encodeURIComponent(currentStop.slug)}`;
      continueButton.textContent = translate("continueTo", {
        name: getLocalizedValue(currentStop.displayName)
      });
    } else {
      continueButton.hidden = true;
    }
  }

  renderUpNextCard(currentStop);

  return {
    completedStopIds,
    currentStop,
    currentStopId: currentStop ? getStopAnalyticsId(currentStop) : null
  };
}

function createOverviewMarker(stop, state) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = `overview-stop-marker is-${getStopTypeClass(stop)} is-${state}`;
  marker.setAttribute("aria-label", `${translate("stopNumber", { number: stop.number })}: ${getLocalizedValue(stop.displayName)}`);

  const number = document.createElement("span");
  number.textContent = stop.number;
  marker.append(number);
  return marker;
}


function addMapReferenceMarkers(map) {
  routeOverviewMapPointMarkers.forEach((entry) => entry.marker.remove());
  routeOverviewMapPointMarkers = [];

  if (typeof addMapReferenceMarkersToMap !== "function") {
    return;
  }

  routeOverviewMapPointMarkers = addMapReferenceMarkersToMap(map, {
    source: "route_overview_map"
  });
}

function syncMapReferenceVisibility() {
  routeOverviewMapPointMarkers.forEach(({ element }) => {
    element.hidden = false;
  });

  const hint = document.querySelector("#route-map-reference-hint");
  if (hint) {
    hint.hidden = routeOverviewMapPointMarkers.length === 0;
  }
}

function setRouteMapExpanded(expanded) {
  const shell = document.querySelector("#route-overview-map-shell");
  const button = document.querySelector("#route-map-expand");
  if (!shell || !button) return;

  routeOverviewMapExpanded = Boolean(expanded);
  shell.classList.toggle("is-map-expanded", routeOverviewMapExpanded);
  document.body.classList.toggle("route-map-modal-open", routeOverviewMapExpanded);
  button.setAttribute("aria-expanded", String(routeOverviewMapExpanded));
  button.textContent = translate(routeOverviewMapExpanded ? "closeExpandedMap" : "expandMap");
  syncMapReferenceVisibility();

  window.setTimeout(() => routeOverviewMap?.resize(), 50);
}

function setupRouteMapExpansion() {
  document.querySelector("#route-map-expand")?.addEventListener("click", () => {
    setRouteMapExpanded(!routeOverviewMapExpanded);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && routeOverviewMapExpanded) {
      setRouteMapExpanded(false);
    }
  });
}

function initialiseRouteOverviewMap(stops, completedStopIds, currentStopId) {
  if (routeOverviewMapReady || !window.maplibregl || !window.pmtiles) {
    routeOverviewMap?.resize();
    return;
  }

  const container = document.querySelector("#route-overview-map");
  const loading = document.querySelector("#route-map-loading");
  if (!container) {
    return;
  }

  const archiveUrl = new URL("assets/maps/corralejo.pmtiles", window.location.href).href;
  initialisePmtilesProtocol(archiveUrl);

  routeOverviewMap = new maplibregl.Map({
    container,
    style: createCorralejoMapStyle(archiveUrl),
    center: [-13.865, 28.738],
    zoom: 13.2,
    minZoom: 11.5,
    maxZoom: 18,
    attributionControl: false,
    cooperativeGestures: false,
    dragRotate: false,
    pitchWithRotate: false,
    maxBounds: [[-13.89, 28.705], [-13.838, 28.764]]
  });

  routeOverviewMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  routeOverviewMap.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

  routeOverviewMap.on("load", () => {
    const bounds = new maplibregl.LngLatBounds();

    stops.forEach((stop) => {
      const state = getRouteState(stop, completedStopIds, currentStopId);
      const element = createOverviewMarker(stop, state);
      const coordinates = [Number(stop.coordinates.longitude), Number(stop.coordinates.latitude)];
      bounds.extend(coordinates);

      const popupContent = document.createElement("div");
      const popupTitle = document.createElement("p");
      popupTitle.className = "map-popup-title";
      popupTitle.textContent = `${stop.number}. ${getLocalizedValue(stop.displayName)}`;
      const popupLink = document.createElement("a");
      popupLink.className = "map-popup-link";
      popupLink.href = `stop.html?stop=${encodeURIComponent(stop.slug)}`;
      popupLink.textContent = translate("openStop");
      popupContent.append(popupTitle, popupLink);

      const popup = new maplibregl.Popup({ offset: 22, closeButton: false }).setDOMContent(popupContent);
      new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(routeOverviewMap);
    });

    const publishedReferencePoints = typeof getPublishedMapPoints === "function"
      ? getPublishedMapPoints()
      : [];

    publishedReferencePoints.forEach((point) => {
      bounds.extend([
        Number(point.coordinates.longitude),
        Number(point.coordinates.latitude)
      ]);
    });

    addMapReferenceMarkers(routeOverviewMap);
    syncMapReferenceVisibility();

    routeOverviewMap.fitBounds(bounds, {
      padding: { top: 70, right: 46, bottom: 70, left: 46 },
      maxZoom: 14.3,
      duration: 0
    });

    routeOverviewMapReady = true;
    if (loading) loading.hidden = true;

    if (routeOverviewPendingPreviewStop) {
      const pendingStop = routeOverviewPendingPreviewStop;
      routeOverviewPendingPreviewStop = null;
      showOverviewRoutePreview(pendingStop);
    }
  });

  routeOverviewMap.on("error", (event) => {
    console.warn("Route overview map warning:", event.error || event);
  });
}


async function showOverviewRoutePreview(stop) {
  if (!routeOverviewMap || !routeOverviewMapReady || !stop) {
    routeOverviewPendingPreviewStop = stop || null;
    return;
  }

  const requestId = ++routeOverviewPreviewRequest;
  const route = getRouteFromStop(stop);
  const coordinates = [
    Number(stop.coordinates.longitude),
    Number(stop.coordinates.latitude)
  ];

  if (!route?.geometryFile) {
    routeOverviewMap.easeTo({ center: coordinates, zoom: 16, duration: 450 });
    return;
  }

  try {
    const response = await fetch(new URL(route.geometryFile, document.baseURI).href);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const geoJson = await response.json();
    if (requestId !== routeOverviewPreviewRequest) {
      return;
    }

    const routeFeature = getLineStringFeature(geoJson);
    if (!routeFeature) {
      throw new Error("No LineString geometry was found.");
    }

    const source = routeOverviewMap.getSource("overview-preview-route");
    if (source) {
      source.setData(routeFeature);
    } else {
      routeOverviewMap.addSource("overview-preview-route", {
        type: "geojson",
        data: routeFeature
      });

      routeOverviewMap.addLayer({
        id: "overview-preview-route-halo",
        type: "line",
        source: "overview-preview-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "rgba(255, 253, 248, 0.95)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 17, 12]
        }
      });

      routeOverviewMap.addLayer({
        id: "overview-preview-route-line",
        type: "line",
        source: "overview-preview-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ff6c66",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 17, 7],
          "line-opacity": 0.98
        }
      });
    }

    const bounds = new maplibregl.LngLatBounds();
    routeFeature.geometry.coordinates.forEach((point) => bounds.extend(point));
    routeOverviewMap.fitBounds(bounds, {
      padding: { top: 72, right: 48, bottom: 72, left: 48 },
      maxZoom: 16.8,
      duration: 500
    });
  } catch (error) {
    console.warn("Route preview could not be displayed:", error);
    routeOverviewMap.easeTo({ center: coordinates, zoom: 16, duration: 450 });
  }
}

function activateRouteView(viewName, previewStop = null) {
  const listButton = document.querySelector("#route-view-list");
  const mapButton = document.querySelector("#route-view-map");
  const listPanel = document.querySelector("#route-list-panel");
  const mapPanel = document.querySelector("#route-map-panel");
  const showMap = viewName === "map";

  listButton?.classList.toggle("is-active", !showMap);
  mapButton?.classList.toggle("is-active", showMap);
  listButton?.setAttribute("aria-selected", String(!showMap));
  mapButton?.setAttribute("aria-selected", String(showMap));
  if (listPanel) listPanel.hidden = showMap;
  if (mapPanel) mapPanel.hidden = !showMap;

  if (showMap) {
    const stops = getPublishedStops();
    const completed = new Set(getCompletedStopIds());
    const current = getCurrentStop(stops, completed);
    initialiseRouteOverviewMap(stops, completed, current ? getStopAnalyticsId(current) : null);
    routeOverviewPendingPreviewStop = previewStop || routeOverviewPendingPreviewStop;
    requestAnimationFrame(() => {
      routeOverviewMap?.resize();
      if (routeOverviewMapReady && routeOverviewPendingPreviewStop) {
        const pendingStop = routeOverviewPendingPreviewStop;
        routeOverviewPendingPreviewStop = null;
        showOverviewRoutePreview(pendingStop);
      }
    });
  }
}

function setupRouteViewSwitch() {
  document.querySelector("#route-view-list")?.addEventListener("click", () => activateRouteView("list"));
  document.querySelector("#route-view-map")?.addEventListener("click", () => activateRouteView("map"));
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function setupRouteActions() {
  const exitButton = document.querySelector("#exit-tour-button");
  const installButton = document.querySelector("#install-app-button");
  const iosHelp = document.querySelector("#ios-install-help");
  const offlineButton = document.querySelector("#download-offline-button");
  const offlineStatus = document.querySelector("#offline-download-status");
  const offlineProgress = document.querySelector("#offline-download-progress");

  setupPwaInstallButton(installButton);
  setupOfflineDownload(offlineButton, offlineStatus, offlineProgress);

  if (iosHelp) {
    iosHelp.hidden = !(isIosDevice() && !isStandaloneDisplay());
  }

  exitButton?.addEventListener("click", () => {
    const eventParameters = {
      last_stop_id: getLastStopId(),
      completed_stop_count: getCompletedStopCount(),
      selected_language: getActiveLanguage()
    };

    resetTourProgress();
    trackAnalyticsEventAndNavigate("tour_exit", eventParameters, "index.html?from=route_overview");
  });
}


function clampRouteScrollPosition() {
  window.requestAnimationFrame(() => {
    const scroller = document.querySelector("[data-app-scroller], .route-page-container");
    if (!scroller) {
      return;
    }

    const maximumScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (scroller.scrollTop > maximumScroll + 2) {
      scroller.scrollTop = maximumScroll;
    }

    if (window.scrollY || window.scrollX) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  });
}

function applyRouteFeaturedMedia() {
  const imageUrl = getTourData().app.featuredMedia?.routeHero;
  const hero = document.querySelector(".route-hero-card");

  if (!imageUrl || !hero) {
    return;
  }

  const cssImage = `url("${String(imageUrl).replace(/"/g, '\\"')}")`;
  hero.style.setProperty("--route-hero-image", cssImage);
}

function initialiseRoutePage() {
  if (!requireSelectedLanguage()) {
    return;
  }

  applyPageTranslations();
  applyRouteFeaturedMedia();
  setTranslatedDocumentTitle("routeOverview");

  const routeList = document.querySelector("#route-list");
  if (!routeList) {
    throw new Error('Missing element with id="route-list".');
  }

  const stops = getPublishedStops();
  routeList.innerHTML = "";

  if (stops.length === 0) {
    const message = document.createElement("p");
    message.className = "content-section";
    message.textContent = translate("routeEmpty");
    routeList.appendChild(message);
  } else {
    const state = renderRouteSummary(stops);
    stops.forEach((stop) => {
      routeList.appendChild(createRouteCard(stop, state.completedStopIds, state.currentStopId));
    });
  }

  setupRouteViewSwitch();
  setupRouteMapExpansion();
  setupRouteActions();

  window.setTimeout(clampRouteScrollPosition, 80);
  window.addEventListener("pageshow", clampRouteScrollPosition, { passive: true });
  window.addEventListener("resize", clampRouteScrollPosition, { passive: true });
  document.querySelectorAll(".stop-card-image").forEach((image) => {
    image.addEventListener("load", clampRouteScrollPosition, { once: true, passive: true });
    image.addEventListener("error", clampRouteScrollPosition, { once: true, passive: true });
  });

  trackAnalyticsEvent("route_view", {
    view_source: sanitiseSourceValue(getQueryParameter("view_source") || "direct_navigation", "direct_navigation")
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseRoutePage);
});
