const TOUR_SELECTOR_REGISTRY_FILE = "data/tours.json";

// Draft selector UI copy. Keep this shared and minimal for Step 8A.
// Before production, the selector copy should be translated/verified for the
// same supported languages as the tours.
const TOUR_SELECTOR_COPY = Object.freeze({
  eyebrow: "Self-guided walking tours",
  title: "Choose your tour",
  intro: "Select the place you want to explore. Each tour opens in the same simple mobile guide.",
  openTour: "Open tour",
  previewTour: "Preview tour",
  technicalPreview: "Technical preview",
  previewNote: "Provisional route and content — available for demonstration only.",
  comingSoon: "Coming soon",
  tourLabel: "Tour",
  moreTours: "More tours will appear here as they are added.",
  unavailable: "Tours could not be loaded. Please refresh the page and try again."
});

function normaliseTourNumber(value) {
  const text = String(value || "").trim();
  return text || "—";
}

function isTourPublished(tour) {
  return tour?.status === "published" && Boolean(tour?.dataPath);
}

function isTourPreviewable(tour) {
  return (
    tour?.status === "provisional" &&
    tour?.previewOnly === true &&
    Boolean(tour?.dataPath)
  );
}

function isTourOpenable(tour) {
  return isTourPublished(tour) || isTourPreviewable(tour);
}

function shouldShowTour(tour) {
  return tour?.status !== "archived" && tour?.status !== "hidden";
}

function createTourCard(tour) {
  const article = document.createElement("article");
  article.className = "tour-selector-card";

  const headingRow = document.createElement("div");
  headingRow.className = "tour-selector-card-heading";

  const number = document.createElement("span");
  number.className = "tour-selector-number";
  number.textContent =
    `${TOUR_SELECTOR_COPY.tourLabel} ${normaliseTourNumber(tour.number)}`;

  const status = document.createElement("span");
  status.className = "tour-selector-status";

  const title = document.createElement("h2");
  title.textContent = tour.displayName || tour.id || "Tour";

  const openable = isTourOpenable(tour);
  const previewable = isTourPreviewable(tour);

  if (previewable) {
    status.classList.add("is-preview");
    status.textContent = TOUR_SELECTOR_COPY.technicalPreview;
  } else if (openable) {
    status.classList.add("is-available");
    status.textContent = TOUR_SELECTOR_COPY.openTour;
  } else {
    status.classList.add("is-coming-soon");
    status.textContent = TOUR_SELECTOR_COPY.comingSoon;
  }

  headingRow.append(number, status);
  article.append(headingRow, title);

  if (previewable) {
    const previewNote = document.createElement("p");
    previewNote.className = "tour-selector-preview-note";
    previewNote.textContent = TOUR_SELECTOR_COPY.previewNote;
    article.append(previewNote);
  }

  if (openable) {
    const link = document.createElement("a");
    link.className = "button tour-selector-open-button";
    link.href =
      `tour.html?tour=${encodeURIComponent(tour.id)}&source=tour_selector`;
    link.textContent = previewable
      ? TOUR_SELECTOR_COPY.previewTour
      : TOUR_SELECTOR_COPY.openTour;
    link.setAttribute(
      "aria-label",
      `${link.textContent}: ${tour.displayName || tour.id}`
    );
    article.append(link);
  } else {
    const unavailable = document.createElement("div");
    unavailable.className = "tour-selector-unavailable-button";
    unavailable.setAttribute("aria-disabled", "true");
    unavailable.textContent = TOUR_SELECTOR_COPY.comingSoon;
    article.append(unavailable);
  }

  return article;
}

async function loadTourSelectorRegistry() {
  const response = await fetch(TOUR_SELECTOR_REGISTRY_FILE, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Could not load ${TOUR_SELECTOR_REGISTRY_FILE}: HTTP ${response.status}`
    );
  }

  const registry = await response.json();

  if (!registry || !Array.isArray(registry.tours)) {
    throw new Error("Tour registry does not contain a tours array.");
  }

  return registry;
}

async function initialiseTourSelector() {
  const list = document.querySelector("#tour-list");

  try {
    const registry = await loadTourSelectorRegistry();

    // Backward compatibility: old links such as index.html?tour=corralejo
    // continue to open the selected tour landing page.
    const currentParameters = new URLSearchParams(window.location.search);
    const requestedTourId = currentParameters.get("tour")?.trim();

    if (requestedTourId) {
      const requestedTour = registry.tours.find(
        (tour) => tour.id === requestedTourId
      );

      if (requestedTour && isTourOpenable(requestedTour)) {
        currentParameters.delete("tour");
        const suffix = currentParameters.toString();
        window.location.replace(
          `tour.html?tour=${encodeURIComponent(requestedTourId)}${suffix ? `&${suffix}` : ""}`
        );
        return;
      }
    }

    const visibleTours = registry.tours.filter(shouldShowTour);

    list.innerHTML = "";

    if (visibleTours.length === 0) {
      throw new Error("No visible tours are registered.");
    }

    visibleTours.forEach((tour) => {
      list.appendChild(createTourCard(tour));
    });
  } catch (error) {
    console.error("Tour selector load error:", error);
    list.innerHTML = "";

    const message = document.createElement("p");
    message.className = "tour-selector-error";
    message.textContent = TOUR_SELECTOR_COPY.unavailable;
    list.appendChild(message);
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

document.addEventListener("DOMContentLoaded", initialiseTourSelector);
