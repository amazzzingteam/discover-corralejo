const OFFLINE_APP_SHELL_URLS = Object.freeze([
  "./",
  "index.html",
  "tours.html",
  "tour.html",
  "route.html",
  "stop.html",
  "bus-stop.html",
  "completion.html",
  "feedback-complete.html",
  "manifest.webmanifest",
  "css/styles.css",
  "assets/screenshots/route-mobile.png",
  "assets/screenshots/welcome-mobile.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/icon-maskable-192.png",
  "assets/icons/apple-touch-icon.png",
  "css/platform-polish.css",
  "assets/vendor/maplibre-gl.css",
  "assets/vendor/maplibre-gl.js",
  "assets/vendor/pmtiles.js",
  "data/tours.json",
  "js/data-loader.js",
  "js/common.js",
  "js/analytics.js",
  "js/offline.js",
  "js/navigation-map.js",
  "js/map-points.js",
  "js/index.js",
  "js/route.js",
  "js/stop.js",
  "js/bus-stop.js",
  "js/completion.js",
  "js/feedback-complete.js",
  "js/register-sw.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
]);

function isOfflineTourDownloadEnabled() {
  return getTourData().app.offline?.enabled !== false;
}

const offlineUiState = {
  initialised: false,
  checking: false,
  downloading: false,
  ready: false,
  cachedCount: 0,
  total: 0,
  missingCount: null
};

function addOfflineUrl(urls, value) {
  if (typeof value !== "string" || !value.trim()) {
    return;
  }
  
  try {
    const url = new URL(value, document.baseURI);

    if (url.protocol === "http:" || url.protocol === "https:") {
      urls.add(url.href);
    }
  } catch (error) {
    console.warn("Invalid offline asset URL:", value, error);
  }
}

function addOfflineAssetTree(urls, value) {
  if (typeof value === "string") {
    addOfflineUrl(urls, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => addOfflineAssetTree(urls, item));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) =>
      addOfflineAssetTree(urls, item)
    );
  }
}

function addActiveTourInfrastructureUrls(urls) {
  const data = getTourData();

  Object.values(data.dataFiles || {}).forEach((filePath) => {
    addOfflineUrl(urls, filePath);
  });

  if (data.app.map?.enabled !== false) {
    addOfflineUrl(urls, data.app.map?.pmtiles);
  }

  addOfflineAssetTree(urls, data.app.featuredMedia || {});
  addOfflineAssetTree(urls, data.app.placeholderAssets || {});
}

function collectOfflineTourUrls() {
  const urls = new Set();

  OFFLINE_APP_SHELL_URLS.forEach((url) => addOfflineUrl(urls, url));
  addActiveTourInfrastructureUrls(urls);

  getPublishedStops().forEach((stop) => {
    addOfflineUrl(urls, stop.media?.heroImage);

    (stop.media?.photos || []).forEach((photo) => {
      addOfflineUrl(
        urls,
        typeof photo === "string" ? photo : photo?.src
      );
    });

    (stop.media?.videos || []).forEach((video) => {
      addOfflineUrl(
        urls,
        typeof video === "string" ? video : video?.src
      );
    });

    Object.values(stop.audio || {}).forEach((audioUrl) => {
      addOfflineUrl(urls, audioUrl);
    });

    Object.values(stop.transcriptFiles || {}).forEach((transcriptUrl) => {
      addOfflineUrl(urls, transcriptUrl);
    });
  });

  if (typeof getPublishedRoutes === "function") {
    getPublishedRoutes().forEach((route) => {
      addOfflineUrl(urls, route.geometryFile);
    });
  }

  if (typeof getPublishedMapPoints === "function") {
    getPublishedMapPoints().forEach((point) => {
      (point.media?.photos || []).forEach((photo) => {
        addOfflineUrl(urls, typeof photo === "string" ? photo : photo?.src);
      });
      (point.media?.videos || []).forEach((video) => {
        addOfflineUrl(urls, typeof video === "string" ? video : video?.src);
      });
    });
  }

  return [...urls];
}

function createOfflineRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatOfflineProgress(completed, total) {
  const percent = total > 0
    ? Math.round((completed / total) * 100)
    : 0;

  return translate("offlineDownloading", {
    completed,
    total,
    percent
  });
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent storage could not be requested:", error);
    return false;
  }
}

async function getOfflineStorageText() {
  if (!navigator.storage?.estimate) {
    return "";
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usageMb = (Number(estimate.usage || 0) / 1024 / 1024).toFixed(1);
    const quotaMb = (Number(estimate.quota || 0) / 1024 / 1024).toFixed(0);

    return translate("offlineStorageUsage", {
      usage: usageMb,
      quota: quotaMb
    });
  } catch (error) {
    console.warn("Offline storage usage could not be read:", error);
    return "";
  }
}

async function getActiveServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported.");
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("The service worker did not become ready in time."));
    }, 15000);
  });

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    timeoutPromise
  ]).finally(() => window.clearTimeout(timeoutId));

  const worker =
    registration.active ||
    registration.waiting ||
    registration.installing;

  if (!worker) {
    throw new Error("No active service worker is available.");
  }

  return worker;
}

function waitForOfflineMessage(requestId, acceptedTypes, onProgress) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      reject(new Error("The offline request timed out."));
    }, 10 * 60 * 1000);

    function handleMessage(event) {
      const message = event.data || {};

      if (message.requestId !== requestId) {
        return;
      }

      if (message.type === "OFFLINE_DOWNLOAD_PROGRESS") {
        onProgress?.(message);
        return;
      }

      if (!acceptedTypes.includes(message.type)) {
        return;
      }

      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      resolve(message);
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
  });
}

async function checkOfflineDownload(urls) {
  const worker = await getActiveServiceWorker();
  const requestId = createOfflineRequestId();
  const resultPromise = waitForOfflineMessage(
    requestId,
    ["OFFLINE_STATUS_RESULT"]
  );

  worker.postMessage({
    type: "CHECK_OFFLINE_TOUR",
    requestId,
    urls
  });

  return resultPromise;
}

function ensureOfflineStatusBanner() {
  // The full-width global connection banner was intentionally removed.
  // Offline readiness and download progress remain available on route.html.
  return document.querySelector("#global-offline-status");
}

function setGlobalOfflineStatus(state, message) {
  const banner = ensureOfflineStatusBanner();

  if (!banner) {
    return;
  }

  const text = banner.querySelector(".offline-status-text");
  banner.className = `global-offline-status is-${state}`;

  if (text) {
    text.textContent = message;
  }
}

function updateGlobalConnectivityMessage() {
  if (offlineUiState.downloading) {
    return;
  }

  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    setGlobalOfflineStatus(
      "warning",
      translate("offlineStatusUnsupported")
    );
    return;
  }

  if (!navigator.onLine) {
    if (offlineUiState.ready) {
      setGlobalOfflineStatus(
        "offline-ready",
        translate("offlineStatusOfflineReady")
      );
    } else {
      setGlobalOfflineStatus(
        "warning",
        translate("offlineStatusOfflinePartial", {
          missing: offlineUiState.missingCount ?? "?"
        })
      );
    }
    return;
  }

  if (offlineUiState.checking) {
    setGlobalOfflineStatus(
      "checking",
      translate("offlineStatusChecking")
    );
    return;
  }

  if (offlineUiState.ready) {
    setGlobalOfflineStatus(
      "online-ready",
      translate("offlineStatusOnlineReady")
    );
  } else {
    setGlobalOfflineStatus(
      "online",
      translate("offlineStatusOnlineNotReady")
    );
  }
}

function updateDownloadControls() {
  const button = document.querySelector("#download-offline-button");
  const statusElement = document.querySelector("#offline-download-status");
  const progressElement = document.querySelector("#offline-download-progress");

  if (!button || !statusElement || offlineUiState.downloading) {
    return;
  }

  if (!isOfflineTourDownloadEnabled()) {
    button.disabled = true;
    button.textContent = translate("offlinePendingButton");
    statusElement.textContent = translate("offlinePending");
    statusElement.dataset.state = "warning";
    progressElement?.setAttribute("hidden", "");
    return;
  }

  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    button.disabled = true;
    button.textContent = translate("downloadOfflineButton");
    statusElement.textContent = translate("offlineUnsupported");
    statusElement.dataset.state = "warning";
    progressElement?.setAttribute("hidden", "");
    return;
  }

  if (!navigator.onLine) {
    button.disabled = true;
    button.textContent = offlineUiState.ready
      ? translate("offlineReadyButton")
      : translate("downloadOfflineButton");
    statusElement.textContent = offlineUiState.ready
      ? translate("offlineReady")
      : translate("offlineDownloadNeedsInternet");
    statusElement.dataset.state = offlineUiState.ready ? "success" : "warning";
    progressElement?.setAttribute("hidden", "");
    return;
  }

  button.disabled = false;
  progressElement?.setAttribute("hidden", "");

  if (offlineUiState.ready) {
    button.textContent = translate("updateOfflineButton");
    statusElement.textContent = translate("offlineReady");
    statusElement.dataset.state = "success";
  } else {
    button.textContent = translate("downloadOfflineButton");
    statusElement.textContent = translate("offlineDownloadHelp");
    statusElement.dataset.state = "info";
  }
}

async function refreshOfflineReadiness() {
  if (!isOfflineTourDownloadEnabled()) {
    offlineUiState.ready = false;
    offlineUiState.checking = false;
    offlineUiState.missingCount = null;
    updateDownloadControls();
    updateGlobalConnectivityMessage();
    return;
  }

  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    offlineUiState.ready = false;
    offlineUiState.missingCount = null;
    updateGlobalConnectivityMessage();
    updateDownloadControls();
    return offlineUiState;
  }

  offlineUiState.checking = true;
  updateGlobalConnectivityMessage();

  try {
    const urls = collectOfflineTourUrls();
    const result = await checkOfflineDownload(urls);

    offlineUiState.total = result.total;
    offlineUiState.cachedCount = result.cachedCount;
    offlineUiState.missingCount = result.missingUrls.length;
    offlineUiState.ready = result.missingUrls.length === 0;
  } catch (error) {
    console.warn("Offline status could not be checked:", error);
    offlineUiState.ready = false;
    offlineUiState.missingCount = null;
  } finally {
    offlineUiState.checking = false;
    updateGlobalConnectivityMessage();
    updateDownloadControls();
  }

  return offlineUiState;
}

async function downloadTourForOfflineUse(button, statusElement, progressElement) {
  if (!navigator.onLine) {
    statusElement.textContent = translate("offlineDownloadNeedsInternet");
    statusElement.dataset.state = "warning";
    return;
  }

  const urls = collectOfflineTourUrls();
  offlineUiState.downloading = true;
  offlineUiState.total = urls.length;
  offlineUiState.cachedCount = 0;
  button.disabled = true;
  statusElement.dataset.state = "info";
  statusElement.textContent = formatOfflineProgress(0, urls.length);

  if (progressElement) {
    progressElement.hidden = false;
    progressElement.max = urls.length || 1;
    progressElement.value = 0;
  }

  setGlobalOfflineStatus(
    "downloading",
    formatOfflineProgress(0, urls.length)
  );

  await requestPersistentStorage();

  const worker = await getActiveServiceWorker();
  const requestId = createOfflineRequestId();
  const resultPromise = waitForOfflineMessage(
    requestId,
    ["OFFLINE_DOWNLOAD_COMPLETE"],
    (message) => {
      offlineUiState.cachedCount = message.completed - message.failedCount;
      const progressText = formatOfflineProgress(
        message.completed,
        message.total
      );
      statusElement.textContent = progressText;
      setGlobalOfflineStatus("downloading", progressText);

      if (progressElement) {
        progressElement.value = message.completed;
      }
    }
  );

  worker.postMessage({
    type: "CACHE_OFFLINE_TOUR",
    requestId,
    urls
  });

  const result = await resultPromise;
  offlineUiState.downloading = false;
  offlineUiState.total = result.total;
  offlineUiState.cachedCount = result.total - result.failedUrls.length;
  offlineUiState.missingCount = result.failedUrls.length;
  offlineUiState.ready = result.failedUrls.length === 0;

  if (progressElement) {
    progressElement.hidden = true;
  }

  if (!offlineUiState.ready) {
    button.disabled = false;
    button.textContent = translate("retryOfflineButton");
    statusElement.textContent = translate("offlinePartialDownload", {
      failed: result.failedUrls.length,
      total: result.total
    });
    statusElement.dataset.state = "warning";
    updateGlobalConnectivityMessage();
    return;
  }

  button.disabled = false;
  button.textContent = translate("updateOfflineButton");
  statusElement.textContent = translate("offlineReady");
  statusElement.dataset.state = "success";

  const storageText = await getOfflineStorageText();

  if (storageText) {
    statusElement.textContent += ` ${storageText}`;
  }

  updateGlobalConnectivityMessage();
}

async function setupOfflineDownload(button, statusElement, progressElement = null) {
  if (!button || !statusElement || button.dataset.offlineSetup === "true") {
    return;
  }

  button.dataset.offlineSetup = "true";

  if (!isOfflineTourDownloadEnabled()) {
    updateDownloadControls();
    return;
  }

  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    updateDownloadControls();
    return;
  }

  button.addEventListener("click", async () => {
    try {
      await downloadTourForOfflineUse(
        button,
        statusElement,
        progressElement || document.querySelector("#offline-download-progress")
      );
    } catch (error) {
      console.error("Offline tour download failed:", error);
      offlineUiState.downloading = false;
      offlineUiState.ready = false;
      button.disabled = !navigator.onLine;
      button.textContent = translate("retryOfflineButton");
      statusElement.textContent = translate("offlineDownloadFailed");
      statusElement.dataset.state = "warning";
      progressElement?.setAttribute("hidden", "");
      updateGlobalConnectivityMessage();
    }
  });

  updateDownloadControls();
  await refreshOfflineReadiness();
}

async function initialiseOfflineExperience() {
  if (offlineUiState.initialised) {
    return;
  }

  offlineUiState.initialised = true;

  window.addEventListener("online", () => {
    refreshOfflineReadiness();
  });

  window.addEventListener("offline", () => {
    updateGlobalConnectivityMessage();
    updateDownloadControls();
  });

  await refreshOfflineReadiness();
}

window.addEventListener("load", async () => {
  try {
    await loadTourData();
    await initialiseOfflineExperience();
  } catch (error) {
    console.warn("Offline status could not be initialised:", error);
  }
});
