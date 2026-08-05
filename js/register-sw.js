if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js", {
        updateViaCache: "none"
      })
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn(
          "Service worker registration failed:",
          error
        );
      });
  });
}
