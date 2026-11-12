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
      const [managementResult, permitResult] = await Promise.all([
        client.rpc('admin_vendor_management_snapshot', { p_days: reportDays }),
        client.rpc('admin_vendor_health_permit_statuses')
      ]);
      if (managementResult.error) throw failure(managementResult.error, 'Vendor management data could not be loaded.');
      if (permitResult.error) throw failure(permitResult.error, 'Health permit verification data could not be loaded.');
      const snapshot = managementResult.data || { days: reportDays, vendors: [] };
      const permits = new Map((permitResult.data || []).map(status => [status.vendorProfileId, status]));
      snapshot.vendors = (snapshot.vendors || []).map(vendor => ({
        ...vendor,
        healthPermitVerified: Boolean(permits.get(vendor.vendorProfileId)?.healthPermitVerified),
        healthPermitVerifiedAt: permits.get(vendor.vendorProfileId)?.healthPermitVerifiedAt || null
      }));
      return snapshot;
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
    },

    async setHealthPermitVerified(vendorProfileId, isVerified) {
      if (!client) throw new Error('The secure vendor management service is unavailable.');
      const { data, error } = await client.rpc('admin_set_vendor_health_permit_verified', {
        p_vendor_profile_id: vendorProfileId,
        p_is_verified: Boolean(isVerified)
      });
      if (error) throw failure(error, 'Health permit verification could not be updated.');
      return data;
    }
  });
})();

