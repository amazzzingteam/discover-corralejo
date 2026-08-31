const LOCATION_START_GEOLOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 30000
});

function getLocationAwareStartConfig() {
  return getTourData().app.locationAwareStart || {};
}

function isValidTourStopCoordinate(stop) {
  const latitude = Number(stop?.coordinates?.latitude);
  const longitude = Number(stop?.coordinates?.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getLocationAwareStops() {
  return getPublishedStops().filter(isValidTourStopCoordinate);
}

function isLocationAwareStartConfigured() {
  const config = getLocationAwareStartConfig();

  return (
    config.enabled === true &&
    getLocationAwareStops().length > 0
  );
}

function isLocationAwareStartSupported() {
  return Boolean(
    isLocationAwareStartConfigured() &&
    navigator.geolocation &&
    typeof navigator.geolocation.getCurrentPosition === "function"
  );
}

function degreesToRadians(value) {
  return Number(value) * Math.PI / 180;
}

function calculateDistanceMetres(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const earthRadiusMetres = 6371000;
  const latitudeDelta = degreesToRadians(
    Number(secondLatitude) - Number(firstLatitude)
  );
  const longitudeDelta = degreesToRadians(
    Number(secondLongitude) - Number(firstLongitude)
  );
  const firstLatitudeRadians = degreesToRadians(firstLatitude);
  const secondLatitudeRadians = degreesToRadians(secondLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine)
    );

  return earthRadiusMetres * angularDistance;
}

function findNearestTourStop(latitude, longitude) {
  const userLatitude = Number(latitude);
  const userLongitude = Number(longitude);

  if (
    !Number.isFinite(userLatitude) ||
    !Number.isFinite(userLongitude)
  ) {
    return null;
  }

  let nearest = null;

  getLocationAwareStops().forEach((stop) => {
    const distanceMetres = calculateDistanceMetres(
      userLatitude,
      userLongitude,
      stop.coordinates.latitude,
      stop.coordinates.longitude
    );

    if (
      !nearest ||
      distanceMetres < nearest.distanceMetres
    ) {
      nearest = {
        stop,
        distanceMetres
      };
    }
  });

  return nearest;
}

function formatLocationDistance(distanceMetres) {
  const metres = Math.max(0, Number(distanceMetres) || 0);

  if (metres < 1000) {
    const roundedMetres =
      metres < 100
        ? Math.max(10, Math.round(metres / 10) * 10)
        : Math.round(metres / 50) * 50;

    return `${roundedMetres} m`;
  }

  return `${(metres / 1000).toFixed(1)} km`;
}

function requestCurrentTourPosition() {
  return new Promise((resolve, reject) => {
    if (
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      const error = new Error("Geolocation is not supported.");
      error.code = "GEOLOCATION_NOT_SUPPORTED";
      reject(error);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      LOCATION_START_GEOLOCATION_OPTIONS
    );
  });
}

function getLocationStartErrorTranslationKey(error) {
  if (error?.code === "GEOLOCATION_NOT_SUPPORTED") {
    return "locationNotSupported";
  }

  if (error?.code === 1) {
    return "locationPermissionDenied";
  }

  if (error?.code === 2) {
    return "locationUnavailable";
  }

  if (error?.code === 3) {
    return "locationTimeout";
  }

  return "locationUnavailable";
}
