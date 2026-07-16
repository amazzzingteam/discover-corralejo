function initialiseFeedbackCompletePage() {
  if (!requireSelectedLanguage()) {
    return;
  }

  applyPageTranslations();
  setTranslatedDocumentTitle("feedbackThankYouTitle");

  trackFeedbackSubmit(
    getQueryParameter("has_comment") === "true"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  startTourPage(initialiseFeedbackCompletePage);
});
