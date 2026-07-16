
function disableTouchDoubleTapZoom() {
  if (!("maxTouchPoints" in navigator) || navigator.maxTouchPoints < 1) {
    return;
  }

  document.addEventListener(
    "dblclick",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
}

disableTouchDoubleTapZoom();

function getTourData() {
  if (!TOUR_APP_DATA) {
    throw new Error(
      "Tour data has not loaded yet. Call loadTourData() first."
    );
  }

  return TOUR_APP_DATA;
}

function getLanguageStorageKey() {
  return `tourApp:${getTourData().app.id}:language`;
}

function getTourSessionStorageKey(name) {
  return `tourApp:${getTourData().app.id}:session:${name}`;
}

function isValidLanguage(languageCode) {
  return Boolean(
    languageCode &&
    getTourData().languagesByCode[languageCode]
  );
}

function getSelectedLanguage() {
  const savedLanguage = localStorage.getItem(
    getLanguageStorageKey()
  );

  return isValidLanguage(savedLanguage)
    ? savedLanguage
    : null;
}

function getActiveLanguage() {
  return (
    getSelectedLanguage() ||
    getTourData().app.defaultLanguage ||
    "en"
  );
}

function saveSelectedLanguage(languageCode) {
  if (!isValidLanguage(languageCode)) {
    console.warn("Unknown language:", languageCode);
    return false;
  }

  localStorage.setItem(
    getLanguageStorageKey(),
    languageCode
  );

  return true;
}

function requireSelectedLanguage() {
  if (getSelectedLanguage()) {
    return true;
  }

  window.location.replace("index.html");
  return false;
}

function getLanguageData() {
  return getTourData().languagesByCode[
    getActiveLanguage()
  ];
}

function formatText(template, replacements = {}) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function translate(translationKey, replacements = {}) {
  const data = getTourData();
  const languageCode = getActiveLanguage();
  const fallbackLanguage = data.app.defaultLanguage || "en";

  const text =
    data.ui[languageCode]?.[translationKey] ||
    data.ui[fallbackLanguage]?.[translationKey] ||
    translationKey;

  return formatText(text, replacements);
}

function getLocalizedValue(localizedContent) {
  if (localizedContent === null || localizedContent === undefined) {
    return "";
  }

  if (typeof localizedContent === "string") {
    return localizedContent;
  }

  const languageCode = getActiveLanguage();
  const fallbackLanguage =
    getTourData().app.defaultLanguage || "en";

  return (
    localizedContent[languageCode] ||
    localizedContent[fallbackLanguage] ||
    Object.values(localizedContent)[0] ||
    ""
  );
}

function getAppName() {
  return getLocalizedValue(getTourData().app.name);
}

function applyPageTranslations() {
  document.documentElement.lang = getActiveLanguage();

  document
    .querySelectorAll("[data-i18n]")
    .forEach((element) => {
      element.textContent = translate(
        element.dataset.i18n
      );
    });

  document
    .querySelectorAll("[data-app-name]")
    .forEach((element) => {
      element.textContent = getAppName();
    });
}

function setTranslatedDocumentTitle(translationKey) {
  document.title =
    `${translate(translationKey)} | ${getAppName()}`;
}

function setCustomDocumentTitle(pageTitle) {
  document.title = `${pageTitle} | ${getAppName()}`;
}

function getQueryParameter(parameterName) {
  return new URLSearchParams(
    window.location.search
  ).get(parameterName);
}

function getStopBySlug(stopSlug) {
  return getTourData().stopsBySlug[stopSlug] || null;
}

function getPublishedStops() {
  return getTourData()
    .stops
    .filter((stop) => stop.published !== false)
    .sort((firstStop, secondStop) =>
      firstStop.position - secondStop.position
    );
}


function getRouteById(routeId) {
  if (!routeId) {
    return null;
  }

  return getTourData().routesById?.[routeId] || null;
}

function getRouteFromStop(stop) {
  if (!stop) {
    return null;
  }

  const routeId = stop.nextStop?.routeId;

  return (
    getRouteById(routeId) ||
    getTourData().routesByFromStopId?.[getStopAnalyticsId(stop)] ||
    getTourData().routesByFromSlug?.[stop.slug] ||
    null
  );
}

function getPublishedRoutes() {
  return (getTourData().routes || []).filter(
    (route) => route.status !== "disabled"
  );
}

function getProgressTotal() {
  const plannedStopCount =
    getTourData().app.route?.plannedStopCount;

  return plannedStopCount || getPublishedStops().length;
}

function getStopAnalyticsId(stop) {
  if (!stop) {
    return "unknown_stop";
  }

  return stop.id || `${stop.number}-${stop.slug}`;
}

function getCompletedStopIds() {
  const storedValue = sessionStorage.getItem(
    getTourSessionStorageKey("completedStops")
  );

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch (error) {
    console.warn("Could not read completed stops:", error);
    return [];
  }
}

function markStopCompleted(stop) {
  const stopId = getStopAnalyticsId(stop);
  const completedStops = new Set(getCompletedStopIds());
  completedStops.add(stopId);

  sessionStorage.setItem(
    getTourSessionStorageKey("completedStops"),
    JSON.stringify([...completedStops])
  );

  return completedStops.size;
}

function getCompletedStopCount() {
  return getCompletedStopIds().length;
}

function setLastStopId(stop) {
  sessionStorage.setItem(
    getTourSessionStorageKey("lastStopId"),
    getStopAnalyticsId(stop)
  );
}

function getLastStopId() {
  return sessionStorage.getItem(
    getTourSessionStorageKey("lastStopId")
  ) || "none";
}

function resetTourProgress() {
  sessionStorage.removeItem(
    getTourSessionStorageKey("completedStops")
  );
  sessionStorage.removeItem(
    getTourSessionStorageKey("lastStopId")
  );
  sessionStorage.removeItem(
    getTourSessionStorageKey("tourCompleteTracked")
  );
}

function isFinalStop(stop) {
  return Boolean(
    stop?.isFinal === true ||
    !stop?.nextStop?.slug
  );
}

function hasTrackedTourComplete() {
  return sessionStorage.getItem(
    getTourSessionStorageKey("tourCompleteTracked")
  ) === "true";
}

function setTourCompleteTracked() {
  sessionStorage.setItem(
    getTourSessionStorageKey("tourCompleteTracked"),
    "true"
  );
}

function getPlaceholderAssets() {
  return getTourData().app.placeholderAssets || {};
}

function getPlaceholderAsset(assetType, languageCode = null) {
  const assets = getPlaceholderAssets();

  if (assetType === "audio") {
    const language = languageCode || getActiveLanguage();
    const fallbackLanguage =
      getTourData().app.defaultLanguage || "en";

    return assets.audio?.[language] ||
      assets.audio?.[fallbackLanguage] ||
      "";
  }

  return assets[assetType] || "";
}

function isPlaceholderAudio(stop, languageCode = null) {
  const language = languageCode || getActiveLanguage();
  return Boolean(
    stop?.placeholderMedia?.audioLanguages?.includes(language)
  );
}
