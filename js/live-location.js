(function exposeLiveLocation() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const geo = window.navigator?.geolocation;
  const WATCH_OPTIONS = { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 };
  const CUSTOMER_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };
  const MIN_PUBLISH_INTERVAL_MS = 15000;
  const MIN_MOVEMENT_METERS = 15;
  let watchId = null;
  let sharingTruckId = null;
  let lastPublishedAt = 0;
  let lastPublishedCoordinates = null;
  let publishQueue = Promise.resolve();
  let callbacks = {};

  function locationError(error) {
    if (!geo) return new Error('Location services are not available on this device.');
    if (error?.code === 1) return new Error('Location permission was denied. Enable Location for FoodTrekNow in your device settings.');
    if (error?.code === 2) return new Error('Your device could not determine its location. Check that Location Services are turned on.');
    if (error?.code === 3) return new Error('Location timed out. Move to an area with a clearer GPS or network signal and try again.');
    return new Error(error?.message || 'FoodTrekNow could not access this device location.');
  }

  function normalizePosition(position) {
    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('The device returned an invalid GPS location.');
    return {
      latitude,
      longitude,
      accuracy: Number.isFinite(Number(position.coords.accuracy)) ? Number(position.coords.accuracy) : null,
      capturedAt: Number(position.timestamp) || Date.now()
    };
  }

  function requestCurrentPosition(options = CUSTOMER_OPTIONS) {
    return new Promise((resolve, reject) => {
      if (!geo) return reject(locationError());
      geo.getCurrentPosition(
        position => {
          try { resolve(normalizePosition(position)); }
          catch (error) { reject(error); }
        },
        error => reject(locationError(error)),
        options
      );
    });
  }

  function distanceMeters(first, second) {
    if (!first || !second) return Infinity;
    const radians = degrees => degrees * Math.PI / 180;
    const latitudeChange = radians(second.latitude - first.latitude);
    const longitudeChange = radians(second.longitude - first.longitude);
    const a = Math.sin(latitudeChange / 2) ** 2
      + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeChange / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function publish(truckId, position, isSharing) {
    if (!client) throw new Error('Live location requires an approved vendor account connected to FoodTrekNow.');
    const { data, error } = await client.rpc('publish_live_truck_location', {
      p_truck_id: truckId,
      p_latitude: isSharing ? position?.latitude ?? null : null,
      p_longitude: isSharing ? position?.longitude ?? null : null,
      p_accuracy_meters: isSharing ? position?.accuracy ?? null : null,
      p_is_sharing: Boolean(isSharing)
    });
    if (error) throw error;
    return data;
  }

  function publishPosition(position, force = false) {
    const now = Date.now();
    const moved = distanceMeters(lastPublishedCoordinates, position);
    if (!force && now - lastPublishedAt < MIN_PUBLISH_INTERVAL_MS && moved < MIN_MOVEMENT_METERS) return publishQueue;
    publishQueue = publishQueue.catch(() => {}).then(async () => {
      const row = await publish(sharingTruckId, position, true);
      lastPublishedAt = Date.now();
      lastPublishedCoordinates = position;
      callbacks.onUpdate?.({ ...position, row });
      window.dispatchEvent?.(new CustomEvent('ftn:vendor-location-update', { detail: { truckId: sharingTruckId, position } }));
      return row;
    }).catch(error => {
      callbacks.onError?.(locationError(error));
      throw error;
    });
    return publishQueue;
  }

  async function startVendorSharing(truckId, nextCallbacks = {}) {
    if (!truckId) throw new Error('Sign in to an approved vendor account before sharing the truck location.');
    if (!geo?.watchPosition) throw locationError();
    if (watchId !== null && sharingTruckId === truckId) return { sharing: true, truckId, position: lastPublishedCoordinates };
    if (watchId !== null) await stopVendorSharing();

    callbacks = nextCallbacks;
    callbacks.onStatus?.({ state: 'requesting', message: 'Requesting location permission…' });
    const initial = await requestCurrentPosition(WATCH_OPTIONS);
    sharingTruckId = truckId;
    await publishPosition(initial, true);
    watchId = geo.watchPosition(
      position => {
        try { publishPosition(normalizePosition(position)).catch(() => {}); }
        catch (error) { callbacks.onError?.(error); }
      },
      error => callbacks.onError?.(locationError(error)),
      WATCH_OPTIONS
    );
    callbacks.onStatus?.({ state: 'live', message: 'Live location is visible to nearby customers.', position: initial });
    return { sharing: true, truckId, position: initial };
  }

  async function stopVendorSharing() {
    const truckId = sharingTruckId;
    if (watchId !== null && geo?.clearWatch) geo.clearWatch(watchId);
    watchId = null;
    sharingTruckId = null;
    lastPublishedAt = 0;
    lastPublishedCoordinates = null;
    callbacks.onStatus?.({ state: 'stopping', message: 'Stopping live location…' });
    if (truckId && client) {
      try { await publish(truckId, null, false); }
      catch (error) {
        if (!String(error?.message || '').includes('No live location')) throw error;
      }
    }
    callbacks.onStatus?.({ state: 'idle', message: 'Live location is off.' });
    callbacks = {};
    return { sharing: false, truckId };
  }

  async function permissionState() {
    if (!window.navigator?.permissions?.query) return geo ? 'prompt' : 'unavailable';
    try { return (await window.navigator.permissions.query({ name: 'geolocation' })).state; }
    catch { return geo ? 'prompt' : 'unavailable'; }
  }

  window.FoodTrekNowLocation = Object.freeze({
    available: Boolean(geo),
    remoteAvailable: Boolean(client),
    requestCurrentPosition,
    startVendorSharing,
    stopVendorSharing,
    permissionState,
    isVendorSharing() { return watchId !== null; },
    activeTruckId() { return sharingTruckId; },
    distanceMeters
  });
})();
