(function exposeHostOnboarding() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();
  const failure = (error, fallback) => new Error(clean(error?.message) || fallback);

  window.FoodTrekNowHostOnboarding = Object.freeze({
    available: Boolean(client),

    async getPortalAccess() {
      if (!client) return { vendor_approved: false, host_approved: false, is_admin: false };
      const { data, error } = await client.rpc('current_portal_access');
      if (error) throw failure(error, 'Your portal access could not be loaded.');
      return data || { vendor_approved: false, host_approved: false, is_admin: false };
    },

    async getMyApplication() {
      if (!client) return null;
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) throw failure(userError, 'Sign in to view your Host application.');
      const { data, error } = await client.from('host_applications').select('*').eq('applicant_id', userData.user.id).maybeSingle();
      if (error) throw failure(error, 'Your Host application could not be loaded.');
      return data;
    },

    async submit(input) {
      if (!client) throw new Error('The secure Host application service is unavailable.');
      const { data, error } = await client.rpc('submit_host_application', {
        p_host_kind: clean(input.hostKind),
        p_host_name: clean(input.hostName),
        p_business_name: clean(input.businessName),
        p_contact_email: clean(input.contactEmail).toLowerCase(),
        p_contact_phone: clean(input.contactPhone)
      });
      if (error) throw failure(error, 'Your Host application could not be submitted.');
      return data;
    },

    async listApplications() {
      if (!client) return [];
      const { data, error } = await client.from('host_applications').select('*').order('created_at', { ascending: true });
      if (error) throw failure(error, 'Host applications could not be loaded.');
      return data || [];
    },

    async review(applicationId, decision, notes) {
      if (!client) throw new Error('The secure Host review service is unavailable.');
      const { data, error } = await client.rpc('review_host_application', {
        p_application_id: applicationId,
        p_decision: decision,
        p_review_notes: clean(notes) || null
      });
      if (error) throw failure(error, 'The Host application could not be reviewed.');
      return data;
    }
  });
})();
