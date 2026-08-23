(function initializeFoodTrekNowSupabase() {
  'use strict';

  const config = window.FoodTrekNowSupabaseConfig;
  window.FoodTrekNowSupabaseClient = null;
  window.FoodTrekNowSupabaseStatus = 'disabled';

  if (!config?.enabled) return;
  if (!config.url || !config.publishableKey || !window.supabase?.createClient) {
    window.FoodTrekNowSupabaseStatus = 'unavailable';
    console.error('FoodTrekNow could not initialize its secure account connection.');
    return;
  }

  window.FoodTrekNowSupabaseClient = window.supabase.createClient(
    config.url,
    config.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ftn-supabase-auth'
      }
    }
  );
  window.FoodTrekNowSupabaseStatus = 'ready';
})();
