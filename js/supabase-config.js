(function configureFoodTrekNowSupabase() {
  'use strict';

  // The publishable key is intentionally safe for browser use. Database access
  // is enforced by Supabase Row Level Security, never by hiding this value.
  window.FoodTrekNowSupabaseConfig = Object.freeze({
    enabled: true,
    url: 'https://jzxvpueuvstyxbysqdrd.supabase.co',
    publishableKey: 'sb_publishable_L5ffaUnlUpsmZa98I-Vglw_c2DeLnWC'
  });
})();
