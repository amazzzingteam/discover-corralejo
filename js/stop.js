let activeStop = null;
let stopOpenedAt = 0;
let stopExitTracked = false;

function getStopVisualType(stop) {
  const typeClasses = {
    startPoint: "start",
    mainStop: "main",
    secretInstagrammableSpot: "secret",
    hiddenGem: "hidden"
  };

  return typeClasses[stop?.typeKey] || "main";
}

function showStopNotFound() {
  const main = document.querySelector("main");

  main.innerHTML = `
    <section class="content-section">
      <h1>${translate("stopNotFound")}</h1>
      <p>${translate("stopNotFoundBody")}</p>
      <a class="button" href="route.html?view_source=stop_not_found">
        ${translate("returnToRoute")}
      </a>
    </section>
  `;
}

function renderPhotos(stop) {
  const section = document.querySelector(
    "#photo-section"
  );
  const gallery = document.querySelector(
    "#photo-gallery"
  );
  const photos = stop.media?.photos || [];

  gallery.innerHTML = "";
  section.hidden = photos.length === 0;

  photos.forEach((photo) => {
    const image = document.createElement("img");
    image.src = photo.src;
    image.addEventListener("error", () => {
      const fallbackPhoto = getPlaceholderAsset("photo");
      if (fallbackPhoto && image.src !== new URL(fallbackPhoto, document.baseURI).href) {
        image.src = fallbackPhoto;
      }
    }, { once: true });
    image.alt = getLocalizedValue(
      photo.alt || stop.displayName
    );
    image.loading = "lazy";
    image.className = "content-image";
    gallery.appendChild(image);
  });
}

function renderVideos(stop) {
  const section = document.querySelector(
    "#video-section"
  );
  const gallery = document.querySelector(
    "#video-gallery"
  );
  const videos = stop.media?.videos || [];

  gallery.innerHTML = "";
  section.hidden = videos.length === 0;

  videos.forEach((videoData) => {
    const video = document.createElement("video");
    video.src = videoData.src;
    video.addEventListener("error", () => {
      const fallbackVideo = getPlaceholderAsset("video");
      if (fallbackVideo && video.src !== new URL(fallbackVideo, document.baseURI).href) {
        video.src = fallbackVideo;
        video.load();
      }
    }, { once: true });
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.className = "content-video";
    video.setAttribute(
      "aria-label",
      getLocalizedValue(
        videoData.label || translate("video")
      )
    );
    gallery.appendChild(video);
  });
}

function setupAudioAnalytics(audioPlayer, stop) {
  const milestones = [25, 50, 75, 90];
  const reachedMilestones = new Set();
  let audioPlayTracked = false;

  audioPlayer.addEventListener("play", () => {
    if (audioPlayTracked) {
      return;
    }

    audioPlayTracked = true;
    trackAnalyticsEvent("audio_play", {
      stop_id: getStopAnalyticsId(stop),
      audio_language: getActiveLanguage()
    });
  });

  audioPlayer.addEventListener("timeupdate", () => {
    if (
      !Number.isFinite(audioPlayer.duration) ||
      audioPlayer.duration <= 0
    ) {
      return;
    }

    const progress =
      (audioPlayer.currentTime / audioPlayer.duration) * 100;

    milestones.forEach((milestone) => {
      if (
        progress >= milestone &&
        !reachedMilestones.has(milestone)
      ) {
        reachedMilestones.add(milestone);
        trackAnalyticsEvent("audio_progress", {
          stop_id: getStopAnalyticsId(stop),
          progress_percent: milestone
        });
      }
    });
  });

  audioPlayer.addEventListener("ended", () => {
    trackAnalyticsEvent("audio_complete", {
      stop_id: getStopAnalyticsId(stop),
      audio_language: getActiveLanguage()
    });
  });
}

function renderAudio(stop) {
  const section = document.querySelector(
    "#audio-section"
  );
  const placeholderNote = document.querySelector(
    "#audio-placeholder-note"
  );
  const languageCode = getActiveLanguage();
  const fallbackLanguage =
    getTourData().app.defaultLanguage || "en";
  const audioFile =
    stop.audio?.[languageCode] ||
    stop.audio?.[fallbackLanguage] ||
    getPlaceholderAsset("audio", languageCode);

  section.hidden = !audioFile;

  if (placeholderNote) {
    placeholderNote.hidden = !isPlaceholderAudio(
      stop,
      languageCode
    );
    placeholderNote.textContent = translate(
      "audioPlaceholder"
    );
  }

  if (!audioFile) {
    return;
  }

  document.querySelector(
    "#audio-language-name"
  ).textContent = getLanguageData().nativeName;

  const audioPlayer = document.querySelector(
    "#audio-player"
  );
  audioPlayer.src = audioFile;
  audioPlayer.setAttribute(
    "aria-label",
    translate("audioGuide")
  );
  audioPlayer.addEventListener("error", () => {
    const fallbackAudio = getPlaceholderAsset(
      "audio",
      languageCode
    );

    if (
      fallbackAudio &&
      audioPlayer.src !== new URL(
        fallbackAudio,
        document.baseURI
      ).href
    ) {
      audioPlayer.src = fallbackAudio;
      audioPlayer.load();
    }
  }, { once: true });
  audioPlayer.load();
  setupAudioAnalytics(audioPlayer, stop);
}

function getStopTimeSeconds() {
  return Math.max(
    1,
    Math.round((Date.now() - stopOpenedAt) / 1000)
  );
}

function trackStopExit(exitMethod, destinationUrl = null) {
  if (!activeStop || stopExitTracked) {
    if (destinationUrl) {
      window.location.href = destinationUrl;
    }
    return;
  }

  stopExitTracked = true;
  const parameters = {
    stop_id: getStopAnalyticsId(activeStop),
    time_on_stop_seconds: getStopTimeSeconds(),
    exit_method: exitMethod
  };

  if (destinationUrl) {
    trackAnalyticsEventAndNavigate(
      "stop_exit",
      parameters,
      destinationUrl
    );
  } else {
    trackAnalyticsEvent("stop_exit", parameters);
  }
}

function setupStopActions(stop) {
  const mapsButton = document.querySelector(
    "#maps-button"
  );
  const nextStopButton = document.querySelector(
    "#next-stop-button"
  );
  const backButton = document.querySelector(
    "#back-to-route-link"
  );
  const languageButton = document.querySelector(
    "#change-language-link"
  );
  const exitButton = document.querySelector(
    "#exit-tour-button"
  );

  mapsButton.addEventListener("click", () => {
    trackAnalyticsEvent("map_open", {
      stop_id: getStopAnalyticsId(stop),
      map_destination: "current_stop"
    });
    trackStopExit("map");
  });

  nextStopButton.addEventListener("click", (event) => {
    event.preventDefault();
    trackStopExit("next_stop", nextStopButton.href);
  });

  backButton?.addEventListener("click", (event) => {
    event.preventDefault();
    trackStopExit(
      "home",
      "route.html?view_source=stop_page"
    );
  });

  languageButton?.addEventListener("click", (event) => {
    event.preventDefault();
    trackStopExit(
      "home",
      "index.html?from=stop_page"
    );
  });

  exitButton?.addEventListener("click", () => {
    trackStopExit("exit_button");

    const parameters = {
      last_stop_id: getStopAnalyticsId(stop),
      completed_stop_count: getCompletedStopCount(),
      selected_language: getActiveLanguage()
    };

    resetTourProgress();

    trackAnalyticsEventAndNavigate(
      "tour_exit",
      parameters,
      "index.html?from=exit_tour"
    );
  });
}

function renderStop(stop) {
  const stopName = getLocalizedValue(
    stop.displayName
  );
  const visualType = getStopVisualType(stop);

  document.body.dataset.stopType = visualType;
  document.querySelector(".stop-hero-card")?.classList.add(
    `stop-hero-${visualType}`
  );

  setCustomDocumentTitle(stopName);

  document.querySelector(
    "#stop-progress"
  ).textContent = translate("progressTemplate", {
    current: stop.position,
    total: getProgressTotal()
  });

  const stopProgressBar = document.querySelector("#stop-progress-bar");
  if (stopProgressBar) {
    const percentage = Math.max(0, Math.min(100,
      (Number(stop.position) / getProgressTotal()) * 100
    ));
    stopProgressBar.style.width = `${percentage}%`;
  }

  const progressNote = document.querySelector(
    "#progress-note"
  );
  const showPlannedStopNote =
    getTourData().app.route?.showPlannedStopNote;

  progressNote.hidden = !showPlannedStopNote;
  progressNote.textContent = showPlannedStopNote
    ? translate("finalRouteNote")
    : "";

  document.querySelector(
    "#stop-type"
  ).textContent =
    getLocalizedValue(stop.typeLabel) ||
    translate(stop.typeKey);

  const secretBanner = document.querySelector("#secret-discovery-banner");
  if (secretBanner) {
    secretBanner.hidden = stop.typeKey !== "secretInstagrammableSpot";
  }

  document.querySelector(
    "#stop-title"
  ).textContent = stopName;

  const heroImage = document.querySelector(
    "#stop-hero"
  );
  heroImage.src = stop.media.heroImage;
  heroImage.addEventListener("error", () => {
    const fallbackHero = getPlaceholderAsset("heroImage");
    if (fallbackHero && heroImage.src !== new URL(fallbackHero, document.baseURI).href) {
      heroImage.src = fallbackHero;
    }
  }, { once: true });
  heroImage.alt = getLocalizedValue(
    stop.media.heroAlt || stop.displayName
  );

  document.querySelector(
    "#stop-description"
  ).textContent = getLocalizedValue(
    stop.description
  );

  document.querySelector(
    "#stop-transcript"
  ).textContent = getLocalizedValue(
    stop.transcript
  );

  renderAudio(stop);
  renderPhotos(stop);
  renderVideos(stop);

  const mapsButton = document.querySelector(
    "#maps-button"
  );
  mapsButton.href = stop.maps.location;

  const nextStopButton = document.querySelector(
    "#next-stop-button"
  );

  if (stop.nextStop?.slug) {
    nextStopButton.href =
      `completion.html?stop=${encodeURIComponent(
        stop.slug
      )}`;
    nextStopButton.textContent = translate("completeStop");
  } else {
    nextStopButton.href =
      `completion.html?stop=${encodeURIComponent(
        stop.slug
      )}`;
    nextStopButton.textContent =
      getLocalizedValue(stop.finalButtonLabel) ||
      translate("finishTour");
  }

  setupStopActions(stop);
}

function initialiseStopPage() {
  if (!requireSelectedLanguage()) {
    return;
  }

  applyPageTranslations();

  const stop = getStopBySlug(
    getQueryParameter("stop")
  );

  if (!stop || stop.published === false) {
    showStopNotFound();
    return;
  }

  activeStop = stop;
  stopOpenedAt = Date.now();
  stopExitTracked = false;
  setLastStopId(stop);
  renderStop(stop);

  trackAnalyticsEvent("stop_open", {
    stop_id: getStopAnalyticsId(stop),
    selected_language: getActiveLanguage()
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseStopPage);
});

window.addEventListener("pagehide", () => {
  trackStopExit("browser_leave");
});
