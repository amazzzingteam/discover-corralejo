const TOUR_DATA_FILES = {
  tour: "data/tour.json",
  stops: "data/stops.json",
  extension: "data/content-extension.json",
  routes: "data/routes.json",
  mapPoints: "data/map-points.json"
};

const MEDIA_PATH_PREFIX = "@media/";

function resolveMediaPath(value, mediaConfig = {}) {
  if (
    typeof value !== "string" ||
    !value.startsWith(MEDIA_PATH_PREFIX)
  ) {
    return value;
  }

  const baseUrl = String(
    mediaConfig.baseUrl || ""
  ).replace(/\/+$/, "");

  const tourPath = String(
    mediaConfig.tourPath || ""
  )
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const assetPath = value
    .slice(MEDIA_PATH_PREFIX.length)
    .replace(/^\/+/, "");

  if (!baseUrl) {
    console.warn(
      "Media path could not be resolved because app.media.baseUrl is missing:",
      value
    );

    return value;
  }

  return [
    baseUrl,
    tourPath,
    assetPath
  ]
    .filter(Boolean)
    .join("/");
}

function resolveMediaPaths(value, mediaConfig = {}) {
  if (typeof value === "string") {
    return resolveMediaPath(value, mediaConfig);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveMediaPaths(item, mediaConfig)
    );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveMediaPaths(item, mediaConfig)
      ])
    );
  }

  return value;
}

let TOUR_APP_DATA = null;
let tourDataPromise = null;

async function fetchJson(filePath, optional = false) {
  try {
    const response = await fetch(filePath, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load ${filePath}: HTTP ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    if (optional) {
      console.warn(`Optional data file was not loaded: ${filePath}`, error);
      return null;
    }

    throw error;
  }
}

function mergeTourExtension(tourFile, extensionFile) {
  if (!extensionFile) {
    return tourFile;
  }

  const languagesByCode = new Map(
    (tourFile.languages || []).map((language) => [
      language.code,
      language
    ])
  );

  (extensionFile.languages || []).forEach((language) => {
    languagesByCode.set(language.code, language);
  });

  const mergedUi = { ...(tourFile.ui || {}) };

  Object.entries(extensionFile.ui || {}).forEach(
    ([languageCode, additions]) => {
      mergedUi[languageCode] = {
        ...(mergedUi[languageCode] || {}),
        ...additions
      };
    }
  );

  return {
    ...tourFile,
    app: {
      ...tourFile.app,
      name: {
        ...(tourFile.app?.name || {}),
        ...(extensionFile.appName || {})
      },
      placeholderAssets: {
        ...(tourFile.app?.placeholderAssets || {}),
        ...(extensionFile.placeholderAssets || {})
      }
    },
    languages: [...languagesByCode.values()],
    ui: mergedUi
  };
}

async function loadTourData() {
  if (TOUR_APP_DATA) {
    return TOUR_APP_DATA;
  }

  if (!tourDataPromise) {
    tourDataPromise = Promise.all([
      fetchJson(TOUR_DATA_FILES.tour),
      fetchJson(TOUR_DATA_FILES.stops),
      fetchJson(TOUR_DATA_FILES.extension, true),
      fetchJson(TOUR_DATA_FILES.routes, true),
      fetchJson(TOUR_DATA_FILES.mapPoints, true)
    ]).then(([tourFile, stopsFile, extensionFile, routesFile, mapPointsFile]) => {
      const mergedTourFile = mergeTourExtension(
        tourFile,
        extensionFile
      );

      if (!mergedTourFile.app || !mergedTourFile.ui) {
        throw new Error(
          "data/tour.json is missing required app or ui data."
        );
      }

      if (!Array.isArray(mergedTourFile.languages)) {
        throw new Error(
          "Tour languages must be an array."
        );
      }

      if (!Array.isArray(stopsFile)) {
        throw new Error(
          "data/stops.json must contain an array of stops."
        );
      }

      const mediaConfig =
        mergedTourFile.app?.media || {};

      const resolvedStops =
        resolveMediaPaths(stopsFile, mediaConfig);

      const resolvedMapPoints =
        resolveMediaPaths(
          Array.isArray(mapPointsFile)
            ? mapPointsFile
            : [],
          mediaConfig
        );

      mergedTourFile.app.placeholderAssets =
        resolveMediaPaths(
          mergedTourFile.app.placeholderAssets || {},
          mediaConfig
        );

      mergedTourFile.app.featuredMedia =
        resolveMediaPaths(
          mergedTourFile.app.featuredMedia || {},
          mediaConfig
        );

      const languagesByCode = Object.fromEntries(
        mergedTourFile.languages.map((language) => [
          language.code,
          language
        ])
      );

      const stopsBySlug = Object.fromEntries(
        resolvedStops.map((stop) => [
          stop.slug,
          stop
        ])
      );

      const routes = Array.isArray(routesFile) ? routesFile : [];
      const mapPoints = resolvedMapPoints;
      const routesById = Object.fromEntries(
        routes.map((route) => [route.id, route])
      );
      const routesByFromStopId = Object.fromEntries(
        routes.map((route) => [route.fromStopId, route])
      );
      const routesByFromSlug = Object.fromEntries(
        routes.map((route) => [route.fromSlug, route])
      );

      TOUR_APP_DATA = {
        app: mergedTourFile.app,
        languages: mergedTourFile.languages,
        languagesByCode,
        ui: mergedTourFile.ui,
        stops: resolvedStops,
        stopsBySlug,
        routes,
        routesById,
        routesByFromStopId,
        routesByFromSlug,
        mapPoints,
        mapPointsById: Object.fromEntries(mapPoints.map((point) => [point.id, point]))
      };

      return TOUR_APP_DATA;
    });
  }

  return tourDataPromise;
}

function showDataLoadError(error) {
  console.error("Tour data load error:", error);

  const main = document.querySelector("main") || document.body;
  const openedDirectly = window.location.protocol === "file:";

  const helpText = openedDirectly
    ? "Open this project through VS Code Live Server. JSON files cannot be loaded reliably when an HTML file is opened directly from a folder."
    : "Check data/tour.json, data/stops.json, data/routes.json, data/map-points.json and data/content-extension.json for invalid JSON or file paths.";

  main.innerHTML = `
    <section class="content-section">
      <h1>Tour data could not be loaded</h1>
      <p>${helpText}</p>
    </section>
  `;
}

async function startTourPage(initialiser) {
  try {
    await loadTourData();

    if (typeof initialiseAnalytics === "function") {
      await initialiseAnalytics();
    }

    await initialiser();
  } catch (error) {
    showDataLoadError(error);
  }
}
