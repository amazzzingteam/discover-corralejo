function showCompletionStopNotFound() {
  const main = document.querySelector("main");

  main.innerHTML = `
    <section class="content-section">
      <h1>${translate("stopNotFound")}</h1>
      <p>${translate("stopNotFoundBody")}</p>
      <a class="button" href="route.html?view_source=completion_not_found">
        ${translate("returnToRoute")}
      </a>
    </section>
  `;
}

function setupCompletionActions(stop) {
  const nextStopButton = document.querySelector(
    "#continue-to-next-stop-button"
  );
  const directionsButton = document.querySelector(
    "#next-directions-button"
  );
  const returnToRouteButton = document.querySelector(
    "#return-to-route-button"
  );
  const feedbackButton = document.querySelector(
    "#feedback-button"
  );

  setupFeedbackLink(feedbackButton, "completion_page");

  const hasNextStop = Boolean(stop.nextStop?.slug);

  if (!hasNextStop) {
    nextStopButton.hidden = true;
    directionsButton.hidden = true;
    returnToRouteButton.hidden = false;
    return;
  }

  const nextStopName = getLocalizedValue(
    stop.nextStop.displayName
  );
  const nextStopUrl =
    `stop.html?stop=${encodeURIComponent(
      stop.nextStop.slug
    )}&from=completion_page`;

  nextStopButton.hidden = false;
  nextStopButton.href = nextStopUrl;
  nextStopButton.textContent = translate(
    "continueTo",
    { name: nextStopName }
  );

  nextStopButton.addEventListener("click", (event) => {
    event.preventDefault();

    trackAnalyticsEventAndNavigate(
      "next_stop_click",
      {
        from_stop_id: getStopAnalyticsId(stop),
        to_stop_id:
          stop.nextStop.id || stop.nextStop.slug
      },
      nextStopUrl
    );
  });

  if (stop.nextStop.directionsUrl) {
    directionsButton.hidden = false;
    directionsButton.href = stop.nextStop.directionsUrl;
    directionsButton.textContent = translate(
      "openLiveDirections"
    );

    directionsButton.addEventListener("click", () => {
      trackAnalyticsEvent("map_open", {
        stop_id: getStopAnalyticsId(stop),
        map_destination: "next_stop"
      });
    });
  } else {
    directionsButton.hidden = true;
  }

  returnToRouteButton.hidden = true;
}

function trackTourCompletionIfNeeded(stop) {
  const completedStopCount = markStopCompleted(stop);

  if (
    !isFinalStop(stop) ||
    hasTrackedTourComplete()
  ) {
    return;
  }

  trackAnalyticsEvent("tour_complete", {
    route_version:
      getTourData().app.route?.version || "route-v1",
    selected_language: getActiveLanguage(),
    completed_stop_count: completedStopCount
  });

  setTourCompleteTracked();
}

function initialiseCompletionPage() {
  if (!requireSelectedLanguage()) {
    return;
  }

  applyPageTranslations();

  const stop = getStopBySlug(
    getQueryParameter("stop")
  );

  if (!stop) {
    showCompletionStopNotFound();
    return;
  }

  const stopName = getLocalizedValue(
    stop.displayName
  );
  const completionTitle =
    getLocalizedValue(stop.completion?.title) ||
    translate("completedTitle", {
      name: stopName
    });
  const completionBody =
    getLocalizedValue(stop.completion?.body) ||
    translate("completedBody");

  document.querySelector(
    "#completion-title"
  ).textContent = completionTitle;

  document.querySelector(
    "#completion-body"
  ).textContent = completionBody;

  setCustomDocumentTitle(completionTitle);

  trackTourCompletionIfNeeded(stop);
  setupCompletionActions(stop);

  if (typeof initialiseNextStopRoutePreview === "function") {
    initialiseNextStopRoutePreview(stop);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseCompletionPage);
});
