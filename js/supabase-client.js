(function initializeFoodTrekNowSupabase() {
  'use strict';

  const config = window.FoodTrekNowSupabaseConfig;
  window.FoodTrekNowSupabaseClient = null;
  window.FoodTrekNowSupabaseStatus = 'disabled';
  window.FoodTrekNowSupabaseRecoveryPending = false;

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
  // Capture password-recovery events immediately. The Supabase client can
  // process a recovery URL before the larger customer/host UI finishes
  // loading, so the UI consumes this flag instead of treating recovery as a
  // normal restored sign-in session.
  window.FoodTrekNowSupabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') window.FoodTrekNowSupabaseRecoveryPending = true;
  });
  window.FoodTrekNowSupabaseStatus = 'ready';
})();
