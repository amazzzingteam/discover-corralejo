const TOUR_DATA_FILES = {
  tour: "data/tour.json",
  stops: "data/stops.json",
  extension: "data/content-extension.json",
  routes: "data/routes.json"
};

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
      fetchJson(TOUR_DATA_FILES.routes, true)
    ]).then(([tourFile, stopsFile, extensionFile, routesFile]) => {
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

      const languagesByCode = Object.fromEntries(
        mergedTourFile.languages.map((language) => [
          language.code,
          language
        ])
      );

      const stopsBySlug = Object.fromEntries(
        stopsFile.map((stop) => [
          stop.slug,
          stop
        ])
      );

      const routes = Array.isArray(routesFile) ? routesFile : [];
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
        stops: stopsFile,
        stopsBySlug,
        routes,
        routesById,
        routesByFromStopId,
        routesByFromSlug
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
    : "Check data/tour.json, data/stops.json, data/routes.json and data/content-extension.json for invalid JSON or file paths.";

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
