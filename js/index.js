let selectedLanguageCode = null;
let nearestLocationStart = null;
let locationLookupInProgress = false;

function getLanguageSheet() {
  return document.querySelector("#language-sheet");
}

function setLanguageSheetOpen(isOpen) {
  const sheet = getLanguageSheet();
  const toggle = document.querySelector("#language-toggle-button");

  sheet?.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("language-sheet-open", isOpen);
  toggle?.setAttribute("aria-expanded", String(isOpen));
}

function updateSelectedLanguageCode() {
  const codeLabel = document.querySelector("#selected-language-code");

  if (codeLabel) {
    codeLabel.textContent = (
      selectedLanguageCode ||
      getTourData().app.defaultLanguage ||
      "en"
    ).toUpperCase();
  }
}

function updateLanguageSelection() {
  document
    .querySelectorAll(".language-button")
    .forEach((button) => {
      const isSelected =
        button.dataset.language === selectedLanguageCode;
      button.classList.toggle("selected", isSelected);
      button.setAttribute(
        "aria-pressed",
        String(isSelected)
      );
    });

  const startButton = document.querySelector(
    "#start-tour-button"
  );
  const helpText = document.querySelector(
    "#language-selection-message"
  );
  const closeButton = document.querySelector(
    "#language-sheet-close"
  );

  if (startButton) {
    startButton.disabled = !selectedLanguageCode;
  }

  const locationButton = document.querySelector(
    "#start-near-me-button"
  );

  if (locationButton) {
    const configured =
      typeof isLocationAwareStartConfigured === "function" &&
      isLocationAwareStartConfigured();

    locationButton.hidden = !configured;
    locationButton.disabled =
      !selectedLanguageCode || locationLookupInProgress;
  }

  if (helpText) {
    helpText.hidden = Boolean(selectedLanguageCode);
  }

  if (closeButton) {
    closeButton.disabled = !selectedLanguageCode;
    closeButton.hidden = !selectedLanguageCode;
  }

  document.body.classList.toggle(
    "has-selected-language",
    Boolean(selectedLanguageCode)
  );

  updateSelectedLanguageCode();
}

function createLanguageButton(language) {
  const button = document.createElement("button");
  button.className = "language-button";
  button.type = "button";
  button.dataset.language = language.code;
  button.setAttribute("aria-pressed", "false");

  const flagByLanguage = {
    en: "🇬🇧",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    it: "🇮🇹",
    pl: "🇵🇱",
    nl: "🇳🇱",
    pt: "🇵🇹"
  };

  const flag = document.createElement("span");
  flag.className = "language-flag";
  flag.setAttribute("aria-hidden", "true");
  flag.textContent = flagByLanguage[language.code] || "•";

  const languageName = document.createElement("span");
  languageName.className = "language-name";
  languageName.textContent = language.nativeName;

  const languageCode = document.createElement("strong");
  languageCode.className = "language-code";
  languageCode.textContent = language.code.toUpperCase();

  button.append(flag, languageName, languageCode);

  button.addEventListener("click", () => {
    const previousLanguage = selectedLanguageCode;

    if (!saveSelectedLanguage(language.code)) {
      return;
    }

    selectedLanguageCode = language.code;
    applyPageTranslations();
    applyWelcomeTourBranding();
    setTranslatedDocumentTitle("chooseLanguage");
    refreshAnalyticsConsentUi();
    updateLanguageSelection();

    if (previousLanguage !== language.code) {
      trackAnalyticsEvent("language_selected", {
        selected_language: language.code,
        selection_location: sanitiseSourceValue(
          getQueryParameter("from") || "welcome_screen",
          "welcome_screen"
        )
      });
    }

    window.setTimeout(() => {
      setLanguageSheetOpen(false);
      document.querySelector("#start-tour-button")?.focus();
    }, 160);
  });

  return button;
}

function setupLanguageSheetControls() {
  const toggleButton = document.querySelector(
    "#language-toggle-button"
  );
  const changeButton = document.querySelector(
    "#change-language-button"
  );
  const closeButton = document.querySelector(
    "#language-sheet-close"
  );

  const openSheet = () => setLanguageSheetOpen(true);

  toggleButton?.addEventListener("click", () => {
    const sheet = getLanguageSheet();
    setLanguageSheetOpen(
      !sheet?.classList.contains("is-open")
    );
  });

  changeButton?.addEventListener("click", openSheet);

  closeButton?.addEventListener("click", () => {
    if (selectedLanguageCode) {
      setLanguageSheetOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedLanguageCode) {
      setLanguageSheetOpen(false);
    }
  });
}


function applyWelcomeTourBranding() {
  const appName = String(getAppName() || "").trim();
  if (!appName) {
    return;
  }

  const brand = document.querySelector("[data-app-name-aria-label]");
  brand?.setAttribute("aria-label", appName);

  const prefix = document.querySelector("[data-welcome-title-prefix]");
  const place = document.querySelector("[data-welcome-title-place]");
  if (!prefix || !place) {
    return;
  }

  const [firstWord, ...remainingWords] = appName.split(/\s+/);
  prefix.textContent = firstWord || appName;
  place.textContent = remainingWords.join(" ") || "";
}

function applyWelcomeFeaturedMedia() {
  const imageUrl = getTourData().app.featuredMedia?.welcomeHero;

  if (!imageUrl) {
    return;
  }

  const cssImage = `url("${String(imageUrl).replace(/"/g, '\\"')}")`;

  document
    .querySelectorAll(".welcome-cover, .welcome-hero")
    .forEach((element) => {
      element.style.setProperty("--welcome-hero-image", cssImage);
    });
}


function setLocationStartStatus(message = "", state = "info") {
  const status = document.querySelector("#location-start-status");
  if (!status) {
    return;
  }

  status.hidden = !message;
  status.textContent = message;
  status.dataset.state = state;
}

function closeLocationStartSheet() {
  const sheet = document.querySelector("#location-start-sheet");
  if (!sheet) {
    return;
  }

  sheet.classList.remove("is-open");
  document.body.classList.remove("location-start-open");

  window.setTimeout(() => {
    if (!sheet.classList.contains("is-open")) {
      sheet.hidden = true;
    }
  }, 220);
}

function openLocationStartSheet(nearest) {
  const sheet = document.querySelector("#location-start-sheet");
  const title = document.querySelector("#location-start-title");
  const distance = document.querySelector("#location-start-distance");
  const viewRoute = document.querySelector("#location-view-route");

  if (!sheet || !title || !distance) {
    return;
  }

  nearestLocationStart = nearest;
  title.textContent = `${translate("stopNumber", {
    number: nearest.stop.number
  })} — ${getLocalizedValue(nearest.stop.displayName)}`;

  distance.textContent = translate("locationDistance", {
    distance: formatLocationDistance(nearest.distanceMetres)
  });

  if (viewRoute) {
    viewRoute.href = buildTourUrl("route.html", {
      view_source: "location_suggestion"
    });
  }

  sheet.hidden = false;
  document.body.classList.add("location-start-open");

  window.requestAnimationFrame(() => {
    sheet.classList.add("is-open");
    document.querySelector("#location-start-confirm")?.focus();
  });
}

function navigateToTourStart(stop, startMode) {
  if (!stop || !selectedLanguageCode) {
    return;
  }

  resetTourProgress();
  setTourStartContext(startMode, stop);

  trackAnalyticsEventAndNavigate(
    "tour_start",
    {
      selected_language: selectedLanguageCode,
      entry_source: getEntrySource(),
      start_mode: startMode,
      stop_id: getStopAnalyticsId(stop)
    },
    startMode === "near_me"
      ? buildTourUrl("stop.html", {
          stop: stop.slug,
          start_mode: "near_me"
        })
      : buildTourUrl("route.html", {
          view_source: "tour_start"
        })
  );
}

async function handleStartNearMe() {
  if (!selectedLanguageCode) {
    setLanguageSheetOpen(true);
    updateLanguageSelection();
    return;
  }

  if (
    typeof isLocationAwareStartConfigured !== "function" ||
    !isLocationAwareStartConfigured()
  ) {
    setLocationStartStatus(
      translate("locationNoStops"),
      "warning"
    );
    return;
  }

  if (
    typeof isLocationAwareStartSupported !== "function" ||
    !isLocationAwareStartSupported()
  ) {
    setLocationStartStatus(
      translate("locationNotSupported"),
      "warning"
    );
    return;
  }

  locationLookupInProgress = true;
  nearestLocationStart = null;
  setLocationStartStatus(
    translate("locationChecking"),
    "checking"
  );
  updateLanguageSelection();

  try {
    const position = await requestCurrentTourPosition();
    const nearest = findNearestTourStop(
      position.coords.latitude,
      position.coords.longitude
    );

    if (!nearest) {
      setLocationStartStatus(
        translate("locationNoStops"),
        "warning"
      );
      return;
    }

    setLocationStartStatus("", "info");
    openLocationStartSheet(nearest);
  } catch (error) {
    console.warn("Nearest-stop location could not be determined:", error);
    setLocationStartStatus(
      translate(getLocationStartErrorTranslationKey(error)),
      "warning"
    );
  } finally {
    locationLookupInProgress = false;
    updateLanguageSelection();
  }
}

function setupLocationAwareStart() {
  const locationButton = document.querySelector(
    "#start-near-me-button"
  );
  const confirmButton = document.querySelector(
    "#location-start-confirm"
  );
  const cancelButton = document.querySelector(
    "#location-start-cancel"
  );
  const viewRoute = document.querySelector(
    "#location-view-route"
  );

  if (!locationButton) {
    return;
  }

  locationButton.hidden = !isLocationAwareStartConfigured();
  locationButton.addEventListener("click", handleStartNearMe);

  confirmButton?.addEventListener("click", () => {
    if (!nearestLocationStart) {
      return;
    }

    closeLocationStartSheet();
    navigateToTourStart(
      nearestLocationStart.stop,
      "near_me"
    );
  });

  cancelButton?.addEventListener(
    "click",
    closeLocationStartSheet
  );

  viewRoute?.addEventListener("click", () => {
    closeLocationStartSheet();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.querySelector("#location-start-sheet")?.classList.contains("is-open")
    ) {
      closeLocationStartSheet();
    }
  });
}

function initialiseLanguagePage() {
  applyPageTranslations();
  applyWelcomeTourBranding();
  applyWelcomeFeaturedMedia();
  setTranslatedDocumentTitle("chooseLanguage");

  const languageGrid = document.querySelector(
    "#language-grid"
  );
  const startButton = document.querySelector(
    "#start-tour-button"
  );

  if (!languageGrid || !startButton) {
    throw new Error(
      "The language page is missing required elements."
    );
  }

  languageGrid.innerHTML = "";
  selectedLanguageCode = getSelectedLanguage();

  getTourData().languages.forEach((language) => {
    languageGrid.appendChild(
      createLanguageButton(language)
    );
  });

  setupLanguageSheetControls();
  setupLocationAwareStart();
  updateLanguageSelection();
  setLanguageSheetOpen(!selectedLanguageCode);

  startButton.addEventListener("click", () => {
    if (!selectedLanguageCode) {
      setLanguageSheetOpen(true);
      updateLanguageSelection();
      return;
    }

    const firstStop = getPublishedStops()[0];

    if (!firstStop) {
      return;
    }

    navigateToTourStart(firstStop, "beginning");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseLanguagePage);
});
