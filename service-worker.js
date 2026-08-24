// Keep the legacy cache prefix for now so activation can delete older
// Discover Corralejo cache generations created before the multi-tour refactor.
const CACHE_PREFIX = "discover-corralejo-v3";
const CACHE_VERSION = "v31-shared-app-shell";
const CORE_CACHE = `${CACHE_PREFIX}-core-${CACHE_VERSION}`;
const CONTENT_CACHE = `${CACHE_PREFIX}-content-${CACHE_VERSION}`;
const OFFLINE_MANIFEST_URL = "__offline-tour-manifest__.json";

// Install-time precache is intentionally limited to the shared application
// shell. Selected-tour data, route geometry, PMTiles and R2 media are cached
// by the explicit tour-aware offline download flow.
const CORE_FILES = [
  "./",
  "./index.html",
  "./route.html",
  "./stop.html",
  "./bus-stop.html",
  "./completion.html",
  "./feedback-complete.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/platform-polish.css",
  "./assets/screenshots/route-mobile.png",
  "./assets/screenshots/welcome-mobile.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/vendor/maplibre-gl.css",
  "./assets/vendor/maplibre-gl.js",
  "./assets/vendor/pmtiles.js",
  "./data/tours.json",
  "./js/data-loader.js",
  "./js/common.js",
  "./js/analytics.js",
  "./js/offline.js",
  "./js/navigation-map.js",
  "./js/map-points.js",
  "./js/index.js",
  "./js/route.js",
  "./js/stop.js",
  "./js/bus-stop.js",
  "./js/completion.js",
  "./js/feedback-complete.js",
  "./js/register-sw.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

const REQUIRED_CORE_FILES = new Set([
  "./index.html",
  "./route.html",
  "./stop.html",
  "./bus-stop.html",
  "./completion.html",
  "./css/styles.css",
  "./css/platform-polish.css",
  "./assets/vendor/maplibre-gl.css",
  "./assets/vendor/maplibre-gl.js",
  "./assets/vendor/pmtiles.js",
  "./data/tours.json",
  "./js/data-loader.js",
  "./js/common.js",
  "./js/map-points.js",
  "./js/offline.js",
  "./js/register-sw.js"
]);

function toAbsoluteUrl(value) {
  return new URL(value, self.registration.scope).href;
}

async function postToClient(clientId, message) {
  if (!clientId) {
    return;
  }

  const client = await self.clients.get(clientId);
  client?.postMessage(message);
}

async function cacheResponse(request, response, cacheName = CONTENT_CACHE) {
  if (!response || !response.ok || response.type === "opaque") {
    return response;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  return response;
}

async function getCachedResponse(request, options = {}) {
  const contentCache = await caches.open(CONTENT_CACHE);
  const coreCache = await caches.open(CORE_CACHE);

  return (
    (await contentCache.match(request, options)) ||
    (await coreCache.match(request, options))
  );
}

async function installCoreFiles() {
  const cache = await caches.open(CORE_CACHE);
  const failedRequired = [];

  for (const file of CORE_FILES) {
    try {
      const request = new Request(toAbsoluteUrl(file), {
        method: "GET",
        credentials: "same-origin",
        cache: "reload"
      });
      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await cache.put(request, response);
    } catch (error) {
      console.warn("Core offline file could not be cached:", file, error);

      if (REQUIRED_CORE_FILES.has(file)) {
        failedRequired.push(file);
      }
    }
  }

  if (failedRequired.length > 0) {
    throw new Error(
      `Required offline files failed: ${failedRequired.join(", ")}`
    );
  }
}

async function handleRangeRequest(request) {
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    return null;
  }

  const requestUrl = new URL(request.url);
  
  const isSameOrigin =
    requestUrl.origin === self.location.origin;
  
  const fullRequest = new Request(request.url, {
    method: "GET",
    headers: {
      Accept:
        request.headers.get("accept") || "*/*"
    },
    credentials: isSameOrigin
      ? "same-origin"
      : "omit",
    mode: isSameOrigin
      ? "same-origin"
      : "cors",
    redirect: "follow"
  });

  let cachedResponse = await getCachedResponse(fullRequest);

  // PMTiles and media players may add harmless query parameters. Fall back
  // to the downloaded same-path response when the exact request is absent.
  if (!cachedResponse) {
    cachedResponse = await getCachedResponse(fullRequest, {
      ignoreSearch: true
    });
  }

  if (!cachedResponse) {
    try {
      const networkResponse = await fetch(fullRequest);
      cachedResponse = await cacheResponse(
        fullRequest,
        networkResponse,
        CONTENT_CACHE
      );
    } catch (error) {
      return new Response("Media is not available offline.", {
        status: 503,
        statusText: "Offline"
      });
    }
  }

  const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader);

  if (!match) {
    return cachedResponse;
  }

  const blob = await cachedResponse.blob();
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : blob.size - 1;
  const end = Math.min(requestedEnd, blob.size - 1);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    start > end ||
    start >= blob.size
  ) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${blob.size}`
      }
    });
  }

  const slicedBlob = blob.slice(start, end + 1);
  const headers = new Headers(cachedResponse.headers);

  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${start}-${end}/${blob.size}`);
  headers.set("Content-Length", String(slicedBlob.size));

  return new Response(slicedBlob, {
    status: 206,
    statusText: "Partial Content",
    headers
  });
}

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    await cacheResponse(request, networkResponse, CONTENT_CACHE);
    return networkResponse;
  } catch (error) {
    return (
      (await getCachedResponse(request, { ignoreSearch: true })) ||
      (await getCachedResponse(toAbsoluteUrl("./index.html"))) ||
      new Response("The tour has not been downloaded for offline use yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    );
  }
}

async function handleAssetRequest(request) {
  let cachedResponse = await getCachedResponse(request);

  if (!cachedResponse) {
    // Static files can occasionally be requested with cache-busting query
    // parameters. The offline download stores the same file without that
    // query, so allow a same-path fallback before attempting the network.
    cachedResponse = await getCachedResponse(request, {
      ignoreSearch: true
    });
  }

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    await cacheResponse(request, networkResponse, CONTENT_CACHE);
    return networkResponse;
  } catch (error) {
    return new Response("Resource unavailable offline.", {
      status: 503,
      statusText: "Offline"
    });
  }
}

async function saveOfflineManifest(total, failedUrls) {
  const cache = await caches.open(CONTENT_CACHE);
  const manifestRequest = new Request(toAbsoluteUrl(OFFLINE_MANIFEST_URL));
  const manifestResponse = new Response(
    JSON.stringify({
      cacheVersion: CACHE_VERSION,
      cachedAt: new Date().toISOString(),
      total,
      failedUrls
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );

  await cache.put(manifestRequest, manifestResponse);
}

async function cacheOfflineTour(urls, clientId, requestId) {
  const uniqueUrls = [...new Set(urls)].filter(Boolean);
  const cache = await caches.open(CONTENT_CACHE);
  const failedUrls = [];
  let completed = 0;

  for (const url of uniqueUrls) {
    try {
      const absoluteUrl = new URL(url, self.registration.scope);
      const isSameOrigin =
        absoluteUrl.origin === self.location.origin;

      if (
        absoluteUrl.protocol !== "http:" &&
        absoluteUrl.protocol !== "https:"
      ) {
        throw new Error("Unsupported offline asset URL.");
      }
      
      const request = new Request(absoluteUrl.href, {
        method: "GET",
        mode: isSameOrigin ? "same-origin" : "cors",
        credentials: isSameOrigin ? "same-origin" : "omit",
        cache: "reload"
      });
      
      const response = await fetch(request);

      if (!response.ok || response.type === "opaque") {
        throw new Error(`HTTP ${response.status}`);
      }

      // An explicit offline download always refreshes the cached copy. This
      // prevents an old image, JSON file or audio track staying in the cache.
      await cache.put(request, response);
    } catch (error) {
      failedUrls.push(url);
      console.warn("Offline download failed for:", url, error);
    }

    completed += 1;

    await postToClient(clientId, {
      type: "OFFLINE_DOWNLOAD_PROGRESS",
      requestId,
      completed,
      total: uniqueUrls.length,
      failedCount: failedUrls.length
    });
  }

  await saveOfflineManifest(uniqueUrls.length, failedUrls);

  await postToClient(clientId, {
    type: "OFFLINE_DOWNLOAD_COMPLETE",
    requestId,
    completed,
    total: uniqueUrls.length,
    failedUrls
  });
}

async function checkOfflineTour(urls, clientId, requestId) {
  const uniqueUrls = [...new Set(urls)].filter(Boolean);
  const missingUrls = [];

  for (const url of uniqueUrls) {
    const absoluteUrl = new URL(url, self.registration.scope);
    const response = await getCachedResponse(absoluteUrl.href);

    if (!response) {
      missingUrls.push(url);
    }
  }

  await postToClient(clientId, {
    type: "OFFLINE_STATUS_RESULT",
    requestId,
    total: uniqueUrls.length,
    cachedCount: uniqueUrls.length - missingUrls.length,
    missingUrls
  });
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(installCoreFiles());
});

self.addEventListener("activate", (event) => {
  const currentCaches = new Set([CORE_CACHE, CONTENT_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith(`${CACHE_PREFIX}-`) &&
                !currentCaches.has(name)
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  const isSameOrigin =
    requestUrl.origin === self.location.origin;
  
  const isTourMedia =
    requestUrl.protocol === "https:" &&
    requestUrl.pathname.startsWith("/tours/");
  
  if (!isSameOrigin && !isTourMedia) {
    return;
  }

  if (event.request.headers.has("range")) {
    event.respondWith(handleRangeRequest(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  event.respondWith(handleAssetRequest(event.request));
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  const clientId = event.source?.id;

  if (message.type === "CACHE_OFFLINE_TOUR") {
    event.waitUntil(
      cacheOfflineTour(
        Array.isArray(message.urls) ? message.urls : [],
        clientId,
        message.requestId
      )
    );
  }

  if (message.type === "CHECK_OFFLINE_TOUR") {
    event.waitUntil(
      checkOfflineTour(
        Array.isArray(message.urls) ? message.urls : [],
        clientId,
        message.requestId
      )
    );
  }
});
