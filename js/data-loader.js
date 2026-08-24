const TOUR_REGISTRY_FILE = "data/tours.json";
const LEGACY_DEFAULT_TOUR_ID = "corralejo";

const FALLBACK_TOUR_REGISTRY = Object.freeze({
  defaultTour: LEGACY_DEFAULT_TOUR_ID,
  tours: [
    {
      id: LEGACY_DEFAULT_TOUR_ID,
      number: "01",
      slug: LEGACY_DEFAULT_TOUR_ID,
      displayName: "Discover Corralejo",
      status: "published",
      dataPath: "data/tours/corralejo"
    }
  ]
});

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
let ACTIVE_TOUR = null;
let tourDataPromise = null;
let tourRegistryPromise = null;

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

function getRequestedTourId() {
  const requestedTourId = new URLSearchParams(
    window.location.search
  ).get("tour");

  return requestedTourId?.trim() || null;
}

function normaliseTourDataPath(dataPath) {
  return String(dataPath || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function buildTourDataFiles(tourDefinition) {
  const dataPath = normaliseTourDataPath(
    tourDefinition?.dataPath
  );

  if (!dataPath) {
    const error = new Error(
      "The selected tour does not define a dataPath."
    );
    error.code = "TOUR_DATA_PATH_MISSING";
    throw error;
  }

  return {
    tour: `${dataPath}/tour.json`,
    stops: `${dataPath}/stops.json`,
    extension: `${dataPath}/content-extension.json`,
    routes: `${dataPath}/routes.json`,
    mapPoints: `${dataPath}/map-points.json`
  };
}

function validateTourRegistry(registry) {
  if (
    !registry ||
    !Array.isArray(registry.tours) ||
    registry.tours.length === 0
  ) {
    throw new Error(
      "data/tours.json must contain a non-empty tours array."
    );
  }

  return registry;
}

async function loadTourRegistry() {
  if (!tourRegistryPromise) {
    tourRegistryPromise = fetchJson(
      TOUR_REGISTRY_FILE,
      true
    ).then((registry) => {
      if (!registry) {
        console.warn(
          "Tour registry unavailable. Falling back to the legacy Corralejo configuration."
        );
        return FALLBACK_TOUR_REGISTRY;
      }

      return validateTourRegistry(registry);
    });
  }

  return tourRegistryPromise;
}

async function resolveActiveTour() {
  if (ACTIVE_TOUR) {
    return ACTIVE_TOUR;
  }

  const registry = await loadTourRegistry();
  const requestedTourId = getRequestedTourId();
  const activeTourId =
    requestedTourId ||
    registry.defaultTour ||
    LEGACY_DEFAULT_TOUR_ID;

  const tourDefinition = registry.tours.find(
    (tour) => tour.id === activeTourId
  );

  if (!tourDefinition) {
    const error = new Error(
      `Unknown tour requested: ${activeTourId}`
    );
    error.code = "TOUR_NOT_FOUND";
    throw error;
  }

  ACTIVE_TOUR = tourDefinition;
  return ACTIVE_TOUR;
}

function getActiveTourDefinition() {
  return ACTIVE_TOUR;
}

function getActiveTourId() {
  return ACTIVE_TOUR?.id || null;
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
    tourDataPromise = resolveActiveTour().then(
      async (activeTour) => {
        const tourDataFiles =
          buildTourDataFiles(activeTour);

        const [
          tourFile,
          stopsFile,
          extensionFile,
          routesFile,
          mapPointsFile
        ] = await Promise.all([
          fetchJson(tourDataFiles.tour),
          fetchJson(tourDataFiles.stops),
          fetchJson(tourDataFiles.extension, true),
          fetchJson(tourDataFiles.routes, true),
          fetchJson(tourDataFiles.mapPoints, true)
        ]);

        const mergedTourFile = mergeTourExtension(
          tourFile,
          extensionFile
        );

        if (!mergedTourFile.app || !mergedTourFile.ui) {
          throw new Error(
            `${tourDataFiles.tour} is missing required app or ui data.`
          );
        }

        if (!Array.isArray(mergedTourFile.languages)) {
          throw new Error(
            "Tour languages must be an array."
          );
        }

        if (!Array.isArray(stopsFile)) {
          throw new Error(
            `${tourDataFiles.stops} must contain an array of stops.`
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

        const routes = Array.isArray(routesFile)
          ? routesFile
          : [];
        const mapPoints = resolvedMapPoints;
        const routesById = Object.fromEntries(
          routes.map((route) => [route.id, route])
        );
        const routesByFromStopId = Object.fromEntries(
          routes.map((route) => [
            route.fromStopId,
            route
          ])
        );
        const routesByFromSlug = Object.fromEntries(
          routes.map((route) => [
            route.fromSlug,
            route
          ])
        );

        const availableDataFiles = {
          tour: tourDataFiles.tour,
          stops: tourDataFiles.stops,
          extension: extensionFile
            ? tourDataFiles.extension
            : null,
          routes: routesFile
            ? tourDataFiles.routes
            : null,
          mapPoints: mapPointsFile
            ? tourDataFiles.mapPoints
            : null
        };

        TOUR_APP_DATA = {
          activeTour,
          dataFiles: availableDataFiles,
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
          mapPointsById: Object.fromEntries(
            mapPoints.map((point) => [
              point.id,
              point
            ])
          )
        };

        return TOUR_APP_DATA;
      }
    );
  }

  return tourDataPromise;
}

function showDataLoadError(error) {
  console.error("Tour data load error:", error);

  const main = document.querySelector("main") || document.body;

  if (error?.code === "TOUR_NOT_FOUND") {
    main.innerHTML = `
      <section class="content-section">
        <h1>Tour not found</h1>
        <p>The requested tour is not available in this version of Discover Canarias.</p>
        <p><a class="button" href="index.html">Open Discover Corralejo</a></p>
      </section>
    `;
    return;
  }

  const openedDirectly =
    window.location.protocol === "file:";

  const helpText = openedDirectly
    ? "Open this project through VS Code Live Server. JSON files cannot be loaded reliably when an HTML file is opened directly from a folder."
    : "Check data/tours.json and the selected tour data files for invalid JSON or file paths.";

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
