const ANALYTICS_ALLOWED_PARAMETERS = Object.freeze({
  tour_start: ["selected_language", "entry_source"],
  language_selected: ["selected_language", "selection_location"],
  route_view: ["view_source"],
  stop_open: ["stop_id", "selected_language"],
  audio_play: ["stop_id", "audio_language"],
  audio_progress: ["stop_id", "progress_percent"],
  audio_complete: ["stop_id", "audio_language"],
  map_open: ["stop_id", "map_destination"],
  next_stop_click: ["from_stop_id", "to_stop_id"],
  stop_exit: ["stop_id", "time_on_stop_seconds", "exit_method"],
  tour_exit: ["last_stop_id", "completed_stop_count", "selected_language"],
  tour_complete: ["route_version", "selected_language", "completed_stop_count"],
  install_pwa: ["install_source"],
  feedback_open: ["source_page"],
  feedback_submit: ["has_comment"]
});

const ANALYTICS_COMMON_PARAMETERS = Object.freeze([
  "tour_id",
  "route_id",
  "route_version",
  "selected_language"
]);

let analyticsInitialised = false;
let analyticsConsentState = "pending";
let googleTagConfigured = false;
let deferredInstallPrompt = null;
let pwaInstallSource = "browser_ui";

function getAnalyticsConfig() {
  return getTourData().app.analytics || {};
}

function getFeedbackConfig() {
  return getTourData().app.feedback || {};
}

function getAnalyticsStorageKey(name) {
  return `tourApp:${getTourData().app.id}:analytics:${name}`;
}

function getStoredAnalyticsConsent() {
  const value = localStorage.getItem(
    getAnalyticsStorageKey("consent")
  );

  return value === "accepted" || value === "declined"
    ? value
    : null;
}

function isValidMeasurementId(measurementId) {
  return (
    typeof measurementId === "string" &&
    /^G-[A-Z0-9]+$/i.test(measurementId) &&
    !measurementId.includes("REPLACE")
  );
}

function isAnalyticsDebugMode() {
  const configuredDebugMode = Boolean(
    getAnalyticsConfig().debugMode
  );
  const localHostnames = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0"
  ]);

  return configuredDebugMode ||
    localHostnames.has(window.location.hostname);
}

function sanitiseSourceValue(value, fallback = "unknown") {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleanedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  return cleanedValue || fallback;
}

function normaliseParameterValue(value) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value === "string"
      ? value.slice(0, 100)
      : value;
  }

  return undefined;
}

function initialiseEntrySource() {
  const storageKey = getAnalyticsStorageKey("entrySource");
  const existingSource = sessionStorage.getItem(storageKey);

  if (existingSource) {
    return existingSource;
  }

  const configuredFallback = sanitiseSourceValue(
    getAnalyticsConfig().defaultEntrySource || "direct",
    "direct"
  );
  const querySource = getQueryParameter("source");
  const entrySource = querySource
    ? sanitiseSourceValue(querySource, configuredFallback)
    : configuredFallback;

  sessionStorage.setItem(storageKey, entrySource);
  return entrySource;
}

function getEntrySource() {
  return sessionStorage.getItem(
    getAnalyticsStorageKey("entrySource")
  ) || initialiseEntrySource();
}

function getCommonAnalyticsParameters() {
  const app = getTourData().app;

  return {
    tour_id: app.id,
    route_id: app.route?.id || "default_route",
    route_version: app.route?.version || "route-v1",
    selected_language: getActiveLanguage()
  };
}

function filterAnalyticsParameters(eventName, parameters = {}) {
  const allowedEventParameters =
    ANALYTICS_ALLOWED_PARAMETERS[eventName];

  if (!allowedEventParameters) {
    console.warn(
      `Analytics event is not registered: ${eventName}`
    );
    return null;
  }

  const allowedNames = new Set([
    ...ANALYTICS_COMMON_PARAMETERS,
    ...allowedEventParameters
  ]);
  const combinedParameters = {
    ...getCommonAnalyticsParameters(),
    ...parameters
  };
  const filteredParameters = {};

  Object.entries(combinedParameters).forEach(
    ([name, value]) => {
      if (!allowedNames.has(name)) {
        return;
      }

      const normalisedValue = normaliseParameterValue(value);

      if (normalisedValue !== undefined) {
        filteredParameters[name] = normalisedValue;
      }
    }
  );

  return filteredParameters;
}

function readPendingAnalyticsEvents() {
  const storedValue = sessionStorage.getItem(
    getAnalyticsStorageKey("pendingEvents")
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
    console.warn("Could not read pending analytics events:", error);
    return [];
  }
}

function writePendingAnalyticsEvents(events) {
  sessionStorage.setItem(
    getAnalyticsStorageKey("pendingEvents"),
    JSON.stringify(events.slice(-100))
  );
}

function queuePendingAnalyticsEvent(eventName, parameters) {
  const pendingEvents = readPendingAnalyticsEvents();
  pendingEvents.push({
    eventName,
    parameters,
    queuedAt: Date.now()
  });
  writePendingAnalyticsEvents(pendingEvents);
}

function clearPendingAnalyticsEvents() {
  sessionStorage.removeItem(
    getAnalyticsStorageKey("pendingEvents")
  );
}

function configureGoogleTag() {
  const config = getAnalyticsConfig();

  if (
    googleTagConfigured ||
    config.enabled === false ||
    !isValidMeasurementId(config.measurementId)
  ) {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  window.gtag("js", new Date());
  window.gtag("config", config.measurementId, {
    send_page_view: false,
    debug_mode: isAnalyticsDebugMode(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  const script = document.createElement("script");
  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      config.measurementId
    )}`;
  script.onerror = () => {
    console.warn("Google Analytics script could not be loaded.");
  };
  document.head.appendChild(script);

  googleTagConfigured = true;
  return true;
}

function logAnalyticsEvent(eventName, parameters, status) {
  if (!isAnalyticsDebugMode()) {
    return;
  }

  console.info(
    `[GA4 ${status}] ${eventName}`,
    parameters
  );
}

function sendAnalyticsEvent(
  eventName,
  parameters,
  options = {}
) {
  const callback =
    typeof options.callback === "function"
      ? options.callback
      : null;
  const timeout = Number(options.timeout) || 700;

  if (
    !googleTagConfigured ||
    typeof window.gtag !== "function"
  ) {
    callback?.();
    return;
  }

  const eventParameters = { ...parameters };

  if (callback) {
    eventParameters.event_callback = callback;
    eventParameters.event_timeout = timeout;
  }

  window.gtag("event", eventName, eventParameters);
  logAnalyticsEvent(eventName, parameters, "sent");
}

function flushPendingAnalyticsEvents() {
  if (analyticsConsentState !== "accepted") {
    return;
  }

  const pendingEvents = readPendingAnalyticsEvents();
  clearPendingAnalyticsEvents();

  pendingEvents.forEach(({ eventName, parameters }) => {
    sendAnalyticsEvent(eventName, parameters);
  });
}

function trackAnalyticsEvent(
  eventName,
  parameters = {},
  options = {}
) {
  const filteredParameters = filterAnalyticsParameters(
    eventName,
    parameters
  );

  if (!filteredParameters) {
    options.callback?.();
    return;
  }

  const config = getAnalyticsConfig();

  if (config.enabled === false) {
    logAnalyticsEvent(eventName, filteredParameters, "disabled");
    options.callback?.();
    return;
  }

  if (analyticsConsentState === "declined") {
    logAnalyticsEvent(eventName, filteredParameters, "blocked");
    options.callback?.();
    return;
  }

  if (analyticsConsentState !== "accepted") {
    queuePendingAnalyticsEvent(eventName, filteredParameters);
    logAnalyticsEvent(eventName, filteredParameters, "queued");
    options.callback?.();
    return;
  }

  if (!isValidMeasurementId(config.measurementId)) {
    logAnalyticsEvent(
      eventName,
      filteredParameters,
      "measurement-id-missing"
    );
    options.callback?.();
    return;
  }

  configureGoogleTag();
  sendAnalyticsEvent(eventName, filteredParameters, options);
}

function trackAnalyticsEventAndNavigate(
  eventName,
  parameters,
  destinationUrl
) {
  let navigationStarted = false;

  const navigate = () => {
    if (navigationStarted) {
      return;
    }

    navigationStarted = true;
    window.location.href = destinationUrl;
  };

  trackAnalyticsEvent(eventName, parameters, {
    callback: navigate,
    timeout: 700
  });

  window.setTimeout(navigate, 800);
}

function removeAnalyticsConsentBanner() {
  document.querySelector(
    "#analytics-consent-banner"
  )?.remove();
}

function createAnalyticsPreferencesButton() {
  if (document.querySelector("#analytics-preferences-button")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "analytics-preferences-button";
  button.type = "button";
  button.className = "analytics-preferences-button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", translate("privacySettings"));
  button.innerHTML = `
    <span class="analytics-preferences-icon" aria-hidden="true">⚙</span>
    <span class="analytics-preferences-label"></span>
  `;

  const label = button.querySelector(".analytics-preferences-label");
  if (label) {
    label.textContent = translate("privacySettings");
  }

  let collapseTimer = null;

  const collapseButton = () => {
    button.classList.remove("is-expanded");
    button.setAttribute("aria-expanded", "false");

    if (collapseTimer) {
      window.clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  };

  const scheduleCollapse = () => {
    if (collapseTimer) {
      window.clearTimeout(collapseTimer);
    }

    collapseTimer = window.setTimeout(collapseButton, 5000);
  };

  button.addEventListener("click", () => {
    if (!button.classList.contains("is-expanded")) {
      button.classList.add("is-expanded");
      button.setAttribute("aria-expanded", "true");
      scheduleCollapse();
      return;
    }

    collapseButton();
    showAnalyticsConsentBanner();
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      button.classList.contains("is-expanded") &&
      !button.contains(event.target)
    ) {
      collapseButton();
    }
  });

  document.body.appendChild(button);
}

function showAnalyticsConsentBanner() {
  removeAnalyticsConsentBanner();

  const config = getAnalyticsConfig();
  const banner = document.createElement("section");
  banner.id = "analytics-consent-banner";
  banner.className = "analytics-consent-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-modal", "true");
  banner.setAttribute(
    "aria-labelledby",
    "analytics-consent-title"
  );

  const title = document.createElement("h2");
  title.id = "analytics-consent-title";
  title.textContent = translate("analyticsConsentTitle");

  const text = document.createElement("p");
  text.textContent = translate("analyticsConsentText");

  const actions = document.createElement("div");
  actions.className = "analytics-consent-actions";

  const acceptButton = document.createElement("button");
  acceptButton.type = "button";
  acceptButton.className = "button analytics-consent-button";
  acceptButton.textContent = translate("acceptAnalytics");
  acceptButton.addEventListener("click", () => {
    setAnalyticsConsent("accepted");
  });

  const declineButton = document.createElement("button");
  declineButton.type = "button";
  declineButton.className =
    "button button-secondary analytics-consent-button";
  declineButton.textContent = translate("declineAnalytics");
  declineButton.addEventListener("click", () => {
    setAnalyticsConsent("declined");
  });

  actions.append(acceptButton, declineButton);
  banner.append(title, text);

  if (config.privacyPolicyUrl) {
    const privacyLink = document.createElement("a");
    privacyLink.href = config.privacyPolicyUrl;
    privacyLink.target = "_blank";
    privacyLink.rel = "noopener noreferrer";
    privacyLink.className = "analytics-privacy-link";
    privacyLink.textContent = translate("privacyPolicy");
    banner.appendChild(privacyLink);
  }

  banner.appendChild(actions);
  document.body.appendChild(banner);
}


function refreshAnalyticsConsentUi() {
  const preferencesButton = document.querySelector(
    "#analytics-preferences-button"
  );

  if (preferencesButton) {
    preferencesButton.setAttribute(
      "aria-label",
      translate("privacySettings")
    );

    const label = preferencesButton.querySelector(
      ".analytics-preferences-label"
    );

    if (label) {
      label.textContent = translate("privacySettings");
    }
  }

  if (document.querySelector("#analytics-consent-banner")) {
    showAnalyticsConsentBanner();
  }
}

function setAnalyticsConsent(consentValue) {
  if (
    consentValue !== "accepted" &&
    consentValue !== "declined"
  ) {
    return;
  }

  analyticsConsentState = consentValue;
  localStorage.setItem(
    getAnalyticsStorageKey("consent"),
    consentValue
  );
  removeAnalyticsConsentBanner();
  createAnalyticsPreferencesButton();

  if (consentValue === "accepted") {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }

    configureGoogleTag();
    flushPendingAnalyticsEvents();
    return;
  }

  clearPendingAnalyticsEvents();

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }
}

function setupPwaInstallButton(button) {
  if (!button) {
    return;
  }

  const updateButtonVisibility = () => {
    button.hidden = !deferredInstallPrompt;
  };

  updateButtonVisibility();

  document.addEventListener(
    "tourapp:installpromptready",
    updateButtonVisibility
  );

  button.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    pwaInstallSource = "install_button";
    deferredInstallPrompt.prompt();

    try {
      await deferredInstallPrompt.userChoice;
    } finally {
      deferredInstallPrompt = null;
      updateButtonVisibility();
    }
  });
}

function buildFeedbackUrl(urlTemplate) {
  const replacements = {
    route_id: getTourData().app.route?.id || "default_route",
    selected_language: getActiveLanguage()
  };

  return Object.entries(replacements).reduce(
    (url, [name, value]) =>
      url.replaceAll(
        `{${name}}`,
        encodeURIComponent(value)
      ),
    urlTemplate
  );
}

function setupFeedbackLink(button, sourcePage) {
  if (!button) {
    return;
  }

  const feedbackConfig = getFeedbackConfig();

  if (
    feedbackConfig.enabled !== true ||
    !feedbackConfig.urlTemplate
  ) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  button.href = buildFeedbackUrl(
    feedbackConfig.urlTemplate
  );
  button.addEventListener("click", () => {
    trackAnalyticsEvent("feedback_open", {
      source_page: sanitiseSourceValue(
        sourcePage,
        "unknown_page"
      )
    });
  });
}

function trackFeedbackSubmit(hasComment) {
  trackAnalyticsEvent("feedback_submit", {
    has_comment: Boolean(hasComment)
  });
}

async function initialiseAnalytics() {
  if (analyticsInitialised) {
    return;
  }

  analyticsInitialised = true;
  initialiseEntrySource();

  const config = getAnalyticsConfig();
  const storedConsent = getStoredAnalyticsConsent();

  if (config.consentRequired === false) {
    analyticsConsentState = "accepted";
    configureGoogleTag();
    flushPendingAnalyticsEvents();
  } else if (storedConsent === "accepted") {
    analyticsConsentState = "accepted";
    configureGoogleTag();
    flushPendingAnalyticsEvents();
    createAnalyticsPreferencesButton();
  } else if (storedConsent === "declined") {
    analyticsConsentState = "declined";
    clearPendingAnalyticsEvents();
    createAnalyticsPreferencesButton();
  } else {
    analyticsConsentState = "pending";
    showAnalyticsConsentBanner();
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.dispatchEvent(
    new CustomEvent("tourapp:installpromptready")
  );
});

window.addEventListener("appinstalled", () => {
  trackAnalyticsEvent("install_pwa", {
    install_source: pwaInstallSource
  });
  deferredInstallPrompt = null;
});
