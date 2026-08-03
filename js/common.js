
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


/* =========================================================
   Theme preference: light, dark, or the device default.
   ========================================================= */

const DISCOVER_THEME_STORAGE_KEY = "discoverCorralejo:theme";

function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

function getSavedTheme() {
  const savedTheme = localStorage.getItem(DISCOVER_THEME_STORAGE_KEY);
  return savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : null;
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme || getSavedTheme() || getSystemTheme();
}

function getThemeLabels(theme) {
  const language = document.documentElement.lang || "en";
  const labels = {
    en: { dark: "Switch to dark mode", light: "Switch to light mode" },
    es: { dark: "Cambiar al modo oscuro", light: "Cambiar al modo claro" },
    fr: { dark: "Passer au mode sombre", light: "Passer au mode clair" },
    de: { dark: "Zum Dunkelmodus wechseln", light: "Zum Hellmodus wechseln" },
    it: { dark: "Passa alla modalità scura", light: "Passa alla modalità chiara" },
    pl: { dark: "Włącz tryb ciemny", light: "Włącz tryb jasny" },
    nl: { dark: "Schakel naar donkere modus", light: "Schakel naar lichte modus" },
    pt: { dark: "Mudar para o modo escuro", light: "Mudar para o modo claro" }
  };

  return labels[language] || labels.en;
}

function updateThemeButtons(theme) {
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const labels = getThemeLabels(nextTheme);
    const label = labels[nextTheme];
    const icon = button.querySelector(".theme-toggle-icon");
    const accessibleText = button.querySelector(".theme-toggle-text");

    if (icon) {
      icon.textContent = theme === "dark" ? "☀" : "☾";
    }
    if (accessibleText) {
      accessibleText.textContent = label;
    }

    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-pressed", String(theme === "dark"));
  });
}

function applyDiscoverTheme(theme, { persist = false } = {}) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;

  if (persist) {
    localStorage.setItem(DISCOVER_THEME_STORAGE_KEY, resolvedTheme);
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = resolvedTheme === "dark" ? "#101b1e" : "#155d6c";
  }

  updateThemeButtons(resolvedTheme);
  window.dispatchEvent(new CustomEvent("discover-theme-change", {
    detail: { theme: resolvedTheme }
  }));
}

function createThemeToggleButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle-button";
  button.dataset.themeToggle = "";
  button.innerHTML = `
    <span class="theme-toggle-icon" aria-hidden="true">☾</span>
    <span class="theme-toggle-text sr-only">Switch theme</span>
  `;
  button.addEventListener("click", () => {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyDiscoverTheme(nextTheme, { persist: true });
  });
  return button;
}

function setupThemeToggle() {
  if (document.querySelector("[data-theme-toggle]")) {
    updateThemeButtons(getCurrentTheme());
    return;
  }

  const button = createThemeToggleButton();
  const topBarActions = document.querySelector(".top-bar-actions");
  const welcomeHeader = document.querySelector(".welcome-cover-header");
  const topBar = document.querySelector(".top-bar");

  if (topBarActions) {
    topBarActions.prepend(button);
  } else if (welcomeHeader) {
    welcomeHeader.append(button);
  } else if (topBar) {
    topBar.append(button);
  } else {
    button.classList.add("theme-toggle-floating");
    document.body.append(button);
  }

  applyDiscoverTheme(getCurrentTheme());
}

const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
systemThemeQuery?.addEventListener?.("change", (event) => {
  if (!getSavedTheme()) {
    applyDiscoverTheme(event.matches ? "dark" : "light");
  }
});

document.addEventListener("DOMContentLoaded", setupThemeToggle);

/* =========================================================
   Stable page scrolling for iPhone/iPad Safari.
   ========================================================= */

function setupStableAppScrollShell() {
  const supportedScreens = [
    "route-screen",
    "stop-screen",
    "completion-screen",
    "feedback-screen"
  ];

  if (!supportedScreens.some((className) => document.body.classList.contains(className))) {
    return;
  }

  const scroller = document.querySelector("body > .page-container");
  if (!scroller) {
    return;
  }

  document.documentElement.classList.add("app-scroll-shell");
  scroller.dataset.appScroller = "true";

  let clampFrame = 0;
  const clampScrollRange = () => {
    cancelAnimationFrame(clampFrame);
    clampFrame = requestAnimationFrame(() => {
      const maximumScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);

      if (scroller.scrollTop > maximumScroll) {
        scroller.scrollTop = maximumScroll;
      }
      if (scroller.scrollTop < 0) {
        scroller.scrollTop = 0;
      }

      /* The document itself must never become the scrolling surface. */
      if (window.scrollX || window.scrollY) {
        window.scrollTo(0, 0);
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };

  const scheduleClamp = () => {
    clampScrollRange();
    window.setTimeout(clampScrollRange, 80);
    window.setTimeout(clampScrollRange, 260);
  };

  window.addEventListener("pageshow", scheduleClamp, { passive: true });
  window.addEventListener("resize", scheduleClamp, { passive: true });
  window.addEventListener("orientationchange", scheduleClamp, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleClamp, { passive: true });

  /* Safari may attempt to restore the old document scroll position. */
  window.addEventListener("scroll", () => {
    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo(0, 0);
    }
  }, { passive: true });

  scroller.querySelectorAll("img, video").forEach((media) => {
    media.addEventListener("load", scheduleClamp, { once: true, passive: true });
    media.addEventListener("loadedmetadata", scheduleClamp, { once: true, passive: true });
    media.addEventListener("error", scheduleClamp, { once: true, passive: true });
  });

  const observer = new MutationObserver(scheduleClamp);
  observer.observe(scroller, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "class", "style", "src"]
  });

  scheduleClamp();
}

document.addEventListener("DOMContentLoaded", setupStableAppScrollShell);
