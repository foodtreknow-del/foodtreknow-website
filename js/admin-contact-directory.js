(function exposeAdminContactDirectory() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();

  window.FoodTrekNowAdminContactDirectory = Object.freeze({
    available: Boolean(client),
    async load() {
      if (!client) throw new Error('The secure administrator directory is unavailable.');
      const { data, error } = await client.rpc('admin_contact_directory_snapshot');
      if (error) throw new Error(clean(error.message) || 'Administrator contacts could not be loaded.');
      return data || { customers: [], vendors: [], hosts: [] };
    }
  });
})();
