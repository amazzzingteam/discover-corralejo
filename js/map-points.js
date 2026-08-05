function getMapPointPageUrl(point, source = "map") {
  const pointId = encodeURIComponent(point?.id || "");
  const from = encodeURIComponent(source);
  return `bus-stop.html?point=${pointId}&from=${from}`;
}

function createMapReferenceMarker(point, options = {}) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `map-reference-marker${options.compact ? " is-compact" : ""}`;
  element.setAttribute("aria-label", getLocalizedValue(point.displayName));
  element.innerHTML = '<span aria-hidden="true">🚌</span>';
  return element;
}

function createMapReferencePopup(point, options = {}) {
  const wrapper = document.createElement("article");
  wrapper.className = "map-reference-popup map-reference-popup-compact";

  const eyebrow = document.createElement("p");
  eyebrow.className = "map-reference-eyebrow";
  eyebrow.textContent = translate("busStopReference");

  const title = document.createElement("h3");
  title.textContent = getLocalizedValue(point.displayName);

  const description = document.createElement("p");
  description.className = "map-reference-summary";
  description.textContent = getLocalizedValue(point.description);

  const link = document.createElement("a");
  link.className = "button map-reference-open-button";
  link.href = getMapPointPageUrl(point, options.source || "map_popup");
  link.textContent = translate("openBusStop");
  link.addEventListener("click", () => {
    if (typeof trackAnalyticsEvent === "function") {
      trackAnalyticsEvent("bus_reference_open", {
        map_point_id: point.id,
        source: options.source || "map_popup"
      });
    }
  });

  wrapper.append(eyebrow, title, description, link);
  return wrapper;
}

function addMapReferenceMarkersToMap(map, options = {}) {
  if (!map || typeof getPublishedMapPoints !== "function") {
    return [];
  }

  const points = Array.isArray(options.points)
    ? options.points
    : getPublishedMapPoints();

  return points.map((point) => {
    const element = createMapReferenceMarker(point, options);
    const popup = new maplibregl.Popup({
      offset: options.popupOffset || 24,
      maxWidth: options.maxWidth || "min(88vw, 330px)",
      closeButton: true
    }).setDOMContent(createMapReferencePopup(point, options));

    const marker = new maplibregl.Marker({ element, anchor: "bottom" })
      .setLngLat([
        Number(point.coordinates.longitude),
        Number(point.coordinates.latitude)
      ])
      .setPopup(popup)
      .addTo(map);

    return { marker, element, point };
  });
}
