(() => {
  'use strict';

  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('FoodTrekNow offline support could not start:', error.message);
    });
  });
})();
