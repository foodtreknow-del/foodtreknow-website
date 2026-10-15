(function exposeAdminVendorManagement() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();
  const failure = (error, fallback) => new Error(clean(error?.message) || fallback);

  window.FoodTrekNowAdminVendorManagement = Object.freeze({
    available: Boolean(client),

    async load(days = 30) {
      if (!client) throw new Error('The secure vendor management service is unavailable.');
      const reportDays = Math.min(Math.max(Number(days) || 30, 1), 90);
      const { data, error } = await client.rpc('admin_vendor_management_snapshot', { p_days: reportDays });
      if (error) throw failure(error, 'Vendor management data could not be loaded.');
      return data || { days: reportDays, vendors: [] };
    },

    async setFrozen(vendorProfileId, isFrozen, reason = '') {
      if (!client) throw new Error('The secure vendor management service is unavailable.');
      const normalizedReason = clean(reason);
      if (isFrozen && normalizedReason.length < 3) throw new Error('Enter a brief reason before freezing vendor access.');
      const { data, error } = await client.rpc('admin_set_vendor_frozen', {
        p_vendor_profile_id: vendorProfileId,
        p_is_frozen: Boolean(isFrozen),
        p_reason: normalizedReason || null
      });
      if (error) throw failure(error, 'Vendor access could not be updated.');
      return data;
    }
  });
})();

