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

function getGalleryText(current, total) {
  return translate("galleryItem", { current, total });
}

function createMediaLightbox() {
  let dialog = document.querySelector("#media-lightbox");
  if (dialog) {
    return dialog;
  }

  dialog = document.createElement("dialog");
  dialog.id = "media-lightbox";
  dialog.className = "media-lightbox";
  dialog.setAttribute("aria-label", translate("photos"));

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "media-lightbox-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";

  const image = document.createElement("img");
  image.className = "media-lightbox-image";
  image.alt = "";

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.append(closeButton, image);
  document.body.append(dialog);
  return dialog;
}

function openMediaLightbox(src, alt) {
  const dialog = createMediaLightbox();
  const image = dialog.querySelector(".media-lightbox-image");
  image.src = src;
  image.alt = alt || "";

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function setupGalleryStatus(gallery, counter, dotsContainer) {
  const items = [...gallery.children];
  if (!counter || !dotsContainer || items.length === 0) {
    return;
  }

  dotsContainer.replaceChildren();
  const dots = items.map((_, index) => {
    const dot = document.createElement("span");
    dot.className = `gallery-dot${index === 0 ? " is-active" : ""}`;
    dotsContainer.append(dot);
    return dot;
  });

  const update = () => {
    const galleryRect = gallery.getBoundingClientRect();
    let activeIndex = 0;
    let smallestDistance = Infinity;

    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const distance = Math.abs(itemRect.left - galleryRect.left);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = index;
      }
    });

    counter.textContent = getGalleryText(activeIndex + 1, items.length);
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
  };

  counter.textContent = getGalleryText(1, items.length);
  gallery.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

function renderPhotos(stop) {
  const section = document.querySelector("#photo-section");
  const gallery = document.querySelector("#photo-gallery");
  const counter = document.querySelector("#photo-gallery-counter");
  const dots = document.querySelector("#photo-gallery-dots");
  const photos = stop.media?.photos || [];

  gallery.innerHTML = "";
  section.hidden = photos.length === 0;

  photos.forEach((photo) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "media-item";

    const image = document.createElement("img");
    image.src = photo.src;
    image.addEventListener("error", () => {
      const fallbackPhoto = getPlaceholderAsset("photo");
      if (fallbackPhoto && image.src !== new URL(fallbackPhoto, document.baseURI).href) {
        image.src = fallbackPhoto;
      }
    }, { once: true });
    image.addEventListener("load", () => {
      item.classList.toggle("is-portrait", image.naturalHeight > image.naturalWidth * 1.1);
    }, { once: true });
    image.alt = getLocalizedValue(photo.alt || stop.displayName);
    image.loading = "lazy";
    image.decoding = "async";
    image.className = "content-image";

    const hint = document.createElement("span");
    hint.className = "media-expand-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "↗";

    item.setAttribute("aria-label", image.alt);
    item.addEventListener("click", () => openMediaLightbox(image.currentSrc || image.src, image.alt));
    item.append(image, hint);
    gallery.appendChild(item);
  });

  setupGalleryStatus(gallery, counter, dots);
}

function renderVideos(stop) {
  const section = document.querySelector("#video-section");
  const gallery = document.querySelector("#video-gallery");
  const counter = document.querySelector("#video-gallery-counter");
  const dots = document.querySelector("#video-gallery-dots");
  const videos = stop.media?.videos || [];

  gallery.innerHTML = "";
  section.hidden = videos.length === 0;

  videos.forEach((videoData) => {
    const item = document.createElement("div");
    item.className = "media-item media-item-video";

    const video = document.createElement("video");
    video.src = videoData.src;
    video.poster = videoData.poster || stop.media?.heroImage || "";
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
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.className = "content-video";
    video.setAttribute("aria-label", getLocalizedValue(videoData.label || translate("video")));
    item.appendChild(video);
    gallery.appendChild(item);
  });

  setupGalleryStatus(gallery, counter, dots);
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

function formatAudioTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setupCustomAudioPlayer(audioPlayer) {
  const wrapper = document.querySelector("#custom-audio-player");
  const playButton = document.querySelector("#audio-play-button");
  const backButton = document.querySelector("#audio-back-button");
  const forwardButton = document.querySelector("#audio-forward-button");
  const slider = document.querySelector("#audio-progress-slider");
  const currentTime = document.querySelector("#audio-current-time");
  const duration = document.querySelector("#audio-duration");
  const speedButton = document.querySelector("#audio-speed-button");
  const transcriptButton = document.querySelector("#audio-transcript-button");
  const transcript = document.querySelector(".transcript-details");

  if (!wrapper || wrapper.dataset.initialised === "true") {
    return;
  }

  wrapper.dataset.initialised = "true";
  wrapper.hidden = false;
  const speeds = [1, 1.25, 1.5, 2];

  const updatePlayButton = () => {
    const isPlaying = !audioPlayer.paused && !audioPlayer.ended;
    playButton.textContent = isPlaying ? "❚❚" : "▶";
    playButton.setAttribute("aria-label", translate(isPlaying ? "audioPause" : "audioPlay"));
  };

  const updateTimeline = () => {
    currentTime.textContent = formatAudioTime(audioPlayer.currentTime);
    duration.textContent = formatAudioTime(audioPlayer.duration);
    if (Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0 && !slider.matches(":active")) {
      slider.value = String(Math.round((audioPlayer.currentTime / audioPlayer.duration) * 1000));
    }
  };

  playButton.addEventListener("click", async () => {
    try {
      if (audioPlayer.paused) {
        await audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    } catch (error) {
      console.warn("Audio could not start:", error);
    }
  });

  backButton.addEventListener("click", () => {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
  });

  forwardButton.addEventListener("click", () => {
    const end = Number.isFinite(audioPlayer.duration) ? audioPlayer.duration : audioPlayer.currentTime + 15;
    audioPlayer.currentTime = Math.min(end, audioPlayer.currentTime + 15);
  });

  slider.addEventListener("input", () => {
    if (Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
      audioPlayer.currentTime = (Number(slider.value) / 1000) * audioPlayer.duration;
    }
  });

  speedButton.addEventListener("click", () => {
    const currentIndex = speeds.indexOf(audioPlayer.playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    audioPlayer.playbackRate = nextSpeed;
    speedButton.textContent = `${nextSpeed}×`;
  });

  transcriptButton.addEventListener("click", () => {
    if (transcript) {
      transcript.open = true;
      transcript.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      transcript.querySelector("summary")?.focus();
    }
  });

  audioPlayer.addEventListener("loadedmetadata", updateTimeline);
  audioPlayer.addEventListener("durationchange", updateTimeline);
  audioPlayer.addEventListener("timeupdate", updateTimeline);
  audioPlayer.addEventListener("play", updatePlayButton);
  audioPlayer.addEventListener("pause", updatePlayButton);
  audioPlayer.addEventListener("ended", updatePlayButton);
  updatePlayButton();
  updateTimeline();
}

function renderAudio(stop) {
  const section = document.querySelector("#audio-section");
  const placeholderNote = document.querySelector("#audio-placeholder-note");
  const languageCode = getActiveLanguage();
  const fallbackLanguage = getTourData().app.defaultLanguage || "en";
  const audioFile = stop.audio?.[languageCode] || stop.audio?.[fallbackLanguage] || getPlaceholderAsset("audio", languageCode);

  section.hidden = !audioFile;

  if (placeholderNote) {
    placeholderNote.hidden = !isPlaceholderAudio(stop, languageCode);
    placeholderNote.textContent = translate("audioPlaceholder");
  }

  if (!audioFile) {
    return;
  }

  document.querySelector("#audio-language-name").textContent = getLanguageData().nativeName;

  const audioPlayer = document.querySelector("#audio-player");
  audioPlayer.src = audioFile;
  audioPlayer.setAttribute("aria-label", translate("audioGuide"));
  audioPlayer.addEventListener("error", () => {
    const fallbackAudio = getPlaceholderAsset("audio", languageCode);
    if (fallbackAudio && audioPlayer.src !== new URL(fallbackAudio, document.baseURI).href) {
      audioPlayer.src = fallbackAudio;
      audioPlayer.load();
    }
  }, { once: true });
  audioPlayer.load();
  setupCustomAudioPlayer(audioPlayer);
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

  const previewBadge = document.querySelector("#preview-media-badge");
  if (previewBadge) {
    previewBadge.hidden = !(stop.usesPlaceholderMedia || stop.contentStatus === "placeholder");
  }

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
