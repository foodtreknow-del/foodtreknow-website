(function initializeVendorLiveLocation() {
  'use strict';

  const service = window.FoodTrekNowLocation;
  const field = id => document.getElementById(id);
  let state = 'idle';
  let lastPosition = null;

  function activeTruckId() {
    return localStorage.getItem('ftnActiveVendorTruckId');
  }

  function formatAccuracy(position) {
    const accuracy = Number(position?.accuracy);
    return Number.isFinite(accuracy) ? ` · accurate to about ${Math.max(1, Math.round(accuracy))} m` : '';
  }

  function render(nextState = state, message = '', position = lastPosition) {
    state = nextState;
    if (position) lastPosition = position;
    const live = state === 'live';
    const busy = ['requesting', 'stopping'].includes(state);
    const badge = field('vendorLocationBadge');
    if (badge) {
      badge.textContent = live ? 'Live' : busy ? 'Working' : state === 'error' ? 'Needs attention' : 'Off';
      badge.className = `vendor-location-badge ${live ? 'live' : state}`;
    }
    const title = field('vendorLocationTitle');
    if (title) title.textContent = live ? 'Customers can see your truck moving' : 'Live truck location is off';
    const detail = field('vendorLocationMessage');
    if (detail) detail.textContent = message || (live
      ? `Updated just now${formatAccuracy(position)}. Keep FoodTrekNow open while sharing.`
      : 'Start sharing when the truck is parked or traveling to today\'s service location.');
    const start = field('startVendorLocationButton');
    const stop = field('stopVendorLocationButton');
    if (start) start.disabled = live || busy;
    if (stop) stop.disabled = !live || busy;
    const quick = field('vendorLocationQuickButton');
    if (quick) {
      quick.disabled = busy;
      quick.textContent = live ? '📍 Location Live' : busy ? '📍 Updating…' : '📍 Share Location';
      quick.classList.toggle('location-live', live);
    }
  }

  function ensureVendorAccess() {
    if (!activeTruckId()) throw new Error('Sign in to your approved vendor account before sharing a live truck location.');
    const gate = field('vendorSubscriptionGate');
    if (gate && !gate.classList.contains('hidden-view')) throw new Error('An active vendor trial or subscription is required for live truck controls.');
    if (!service?.available) throw new Error('Location services are not available on this device.');
  }

  async function start() {
    try {
      ensureVendorAccess();
      render('requesting', 'Approve the location prompt to start sharing.');
      const result = await service.startVendorSharing(activeTruckId(), {
        onStatus(update) { render(update.state, update.message, update.position); },
        onUpdate(update) { render('live', `Updated just now${formatAccuracy(update)}. Keep FoodTrekNow open while sharing.`, update); },
        onError(error) { render('error', error.message || 'The live location could not be updated.'); }
      });
      render('live', `Updated just now${formatAccuracy(result.position)}. Keep FoodTrekNow open while sharing.`, result.position);
      if (typeof notify === 'function') notify('Live truck location is on');
    } catch (error) {
      render('error', error.message || 'Live location could not be started.');
      if (typeof notify === 'function') notify(error.message || 'Live location could not be started');
    }
  }

  async function stop() {
    try {
      render('stopping', 'Removing the live truck location from the customer map…');
      await service?.stopVendorSharing();
      render('idle', 'Live location is off. Customers will no longer receive GPS updates.');
      if (typeof notify === 'function') notify('Live truck location is off');
    } catch (error) {
      render('error', error.message || 'Live location could not be stopped.');
    }
  }

  field('startVendorLocationButton')?.addEventListener('click', start);
  field('stopVendorLocationButton')?.addEventListener('click', stop);
  field('vendorLocationQuickButton')?.addEventListener('click', () => state === 'live' ? stop() : start());
  field('onlineToggle')?.addEventListener('change', event => { if (!event.target.checked && service?.isVendorSharing()) stop(); });
  field('vendorAcceptingOrders')?.addEventListener('change', event => { if (!event.target.checked && service?.isVendorSharing()) stop(); });

  render('idle');
  window.FoodTrekNowVendorLocation = Object.freeze({ start, stop, render, getState: () => state });
})();
