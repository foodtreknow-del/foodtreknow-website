(() => {
  const BETA_BANNER_STORAGE_KEY = 'ftnBetaBannerDismissedV1';
  const banner = document.getElementById('betaBanner');
  const dismissButton = document.getElementById('dismissBetaBannerButton');
  const feedbackButton = document.getElementById('openFeedbackModalButton');
  const feedbackModal = document.getElementById('feedbackPlaceholderModal');
  const closeButton = document.getElementById('closeFeedbackModalButton');
  const confirmButton = document.getElementById('confirmFeedbackModalButton');
  let lastFocusedElement = null;

  if (!banner || !dismissButton || !feedbackButton || !feedbackModal || !closeButton || !confirmButton) return;

  const closeFeedbackModal = () => {
    feedbackModal.classList.add('hidden');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  };

  const openFeedbackModal = () => {
    lastFocusedElement = document.activeElement;
    feedbackModal.classList.remove('hidden');
    closeButton.focus();
  };

  if (localStorage.getItem(BETA_BANNER_STORAGE_KEY) === 'true') {
    banner.classList.add('hidden-view');
  }

  dismissButton.addEventListener('click', () => {
    localStorage.setItem(BETA_BANNER_STORAGE_KEY, 'true');
    banner.classList.add('hidden-view');
  });

  feedbackButton.addEventListener('click', openFeedbackModal);
  closeButton.addEventListener('click', closeFeedbackModal);
  confirmButton.addEventListener('click', closeFeedbackModal);
  feedbackModal.addEventListener('click', event => {
    if (event.target === feedbackModal) closeFeedbackModal();
  });

  if (typeof document.addEventListener === 'function') {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !feedbackModal.classList.contains('hidden')) closeFeedbackModal();
    });
  }
})();
