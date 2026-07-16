let selectedLanguageCode = null;

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

function initialiseLanguagePage() {
  applyPageTranslations();
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
  updateLanguageSelection();
  setLanguageSheetOpen(!selectedLanguageCode);

  startButton.addEventListener("click", () => {
    if (!selectedLanguageCode) {
      setLanguageSheetOpen(true);
      updateLanguageSelection();
      return;
    }

    resetTourProgress();

    trackAnalyticsEventAndNavigate(
      "tour_start",
      {
        selected_language: selectedLanguageCode,
        entry_source: getEntrySource()
      },
      "route.html?view_source=tour_start"
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseLanguagePage);
});
