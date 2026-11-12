(function exposeAdminVendorMessaging() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();

  window.FoodTrekNowAdminVendorMessaging = Object.freeze({
    available: Boolean(client),
    async load() {
      if (!client) throw new Error('The secure administrator messaging service is unavailable.');
      const { data, error } = await client.rpc('admin_vendor_broadcast_history');
      if (error) throw new Error(clean(error.message) || 'Vendor message history could not be loaded.');
      return Array.isArray(data) ? data : [];
    },
    async send(title, body) {
      if (!client) throw new Error('The secure administrator messaging service is unavailable.');
      const { data, error } = await client.rpc('admin_broadcast_vendor_message', {
        p_title: clean(title),
        p_body: clean(body)
      });
      if (error) throw new Error(clean(error.message) || 'The vendor message could not be sent.');
      return data;
    }
  });
})();
