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
  badge.textContent =
    getLocalizedValue(stop.typeLabel) ||
    translate(stop.typeKey);
  return badge;
}

function createRouteCard(stop, completedStopIds, currentStopId) {
  const state = getRouteState(stop, completedStopIds, currentStopId);
  const typeClass = getStopTypeClass(stop);

  const card = document.createElement("article");
  card.className = `stop-card stop-card-${typeClass} is-${state}`;

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

  const button = document.createElement("a");
  button.className = state === "current"
    ? "button stop-card-button"
    : "button button-ghost stop-card-button";
  button.href = `stop.html?stop=${encodeURIComponent(stop.slug)}`;
  button.textContent = state === "current"
    ? translate("continueTour")
    : translate("openStop");

  content.append(metaRow, title, button);
  card.append(timelineMarker, imageWrap, content);

  return card;
}

function getCurrentStop(stops, completedStopIds) {
  return stops.find(
    (stop) => !completedStopIds.has(getStopAnalyticsId(stop))
  ) || null;
}

function renderRouteSummary(stops) {
  const completedStopIds = new Set(getCompletedStopIds());
  const currentStop = getCurrentStop(stops, completedStopIds);
  const completedCount = stops.filter(
    (stop) => completedStopIds.has(getStopAnalyticsId(stop))
  ).length;
  const totalDistance = getPublishedRoutes().reduce(
    (sum, route) => sum + Number(route.distanceMetres || 0),
    0
  );
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
    const percentage = stops.length
      ? Math.round((completedCount / stops.length) * 100)
      : 0;
    progressFill.style.width = `${percentage}%`;
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

  return {
    completedStopIds,
    currentStopId: currentStop ? getStopAnalyticsId(currentStop) : null
  };
}

function setupRouteActions() {
  const exitButton = document.querySelector("#exit-tour-button");
  const installButton = document.querySelector("#install-app-button");
  const offlineButton = document.querySelector("#download-offline-button");
  const offlineStatus = document.querySelector("#offline-download-status");
  const offlineProgress = document.querySelector("#offline-download-progress");

  setupPwaInstallButton(installButton);
  setupOfflineDownload(offlineButton, offlineStatus, offlineProgress);

  exitButton?.addEventListener("click", () => {
    const eventParameters = {
      last_stop_id: getLastStopId(),
      completed_stop_count: getCompletedStopCount(),
      selected_language: getActiveLanguage()
    };

    resetTourProgress();

    trackAnalyticsEventAndNavigate(
      "tour_exit",
      eventParameters,
      "index.html?from=route_overview"
    );
  });
}

function initialiseRoutePage() {
  if (!requireSelectedLanguage()) {
    return;
  }

  applyPageTranslations();
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
      routeList.appendChild(
        createRouteCard(
          stop,
          state.completedStopIds,
          state.currentStopId
        )
      );
    });
  }

  setupRouteActions();

  trackAnalyticsEvent("route_view", {
    view_source: sanitiseSourceValue(
      getQueryParameter("view_source") || "direct_navigation",
      "direct_navigation"
    )
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseRoutePage);
});
