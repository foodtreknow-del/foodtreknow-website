(function exposeVendorOnboarding() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();
  const failure = (error, fallback) => new Error(clean(error?.message) || fallback);

  window.FoodTrekNowVendorOnboarding = Object.freeze({
    available: Boolean(client),

    async getMyApplication() {
      if (!client) return null;
      const { data, error } = await client.from('vendor_applications').select('*').maybeSingle();
      if (error) throw failure(error, 'Your vendor application could not be loaded.');
      return data;
    },

    async submit(input) {
      if (!client) throw new Error('The secure vendor application service is unavailable.');
      const { data, error } = await client.rpc('submit_vendor_application', {
        p_business_name: clean(input.businessName),
        p_truck_name: clean(input.truckName),
        p_cuisine: clean(input.cuisine),
        p_business_email: clean(input.businessEmail).toLowerCase(),
        p_business_mobile: clean(input.businessMobile),
        p_city: clean(input.city),
        p_state: clean(input.state).toUpperCase(),
        p_description: clean(input.description) || null
      });
      if (error) throw failure(error, 'Your vendor application could not be submitted.');
      return data;
    },

    async listApplications() {
      if (!client) return [];
      const { data, error } = await client.from('vendor_applications').select('*').order('created_at', { ascending: true });
      if (error) throw failure(error, 'Vendor applications could not be loaded.');
      return data || [];
    },

    async review(applicationId, decision, notes) {
      if (!client) throw new Error('The secure vendor review service is unavailable.');
      const { data, error } = await client.rpc('review_vendor_application', {
        p_application_id: applicationId,
        p_decision: decision,
        p_review_notes: clean(notes) || null
      });
      if (error) throw failure(error, 'The vendor application could not be reviewed.');
      return data;
    }
  });
})();
