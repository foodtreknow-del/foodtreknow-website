(function exposeVendorAuthentication() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const ACTIVE_TRUCK_KEY = 'ftnActiveVendorTruckId';
  const clean = value => String(value || '').trim();
  const friendly = error => {
    const message = clean(error?.message).toLowerCase();
    if (message.includes('invalid login credentials')) return new Error('Vendor email or password is incorrect.');
    if (message.includes('email not confirmed')) return new Error('Verify your email before signing in.');
    return new Error(clean(error?.message) || 'Vendor sign-in is temporarily unavailable.');
  };

  async function loadContext(user) {
    const { data: profile, error: profileError } = await client.from('profiles').select('id, role, first_name, last_name').eq('id', user.id).single();
    if (profileError) throw friendly(profileError);
    if (profile.role !== 'vendor') throw new Error('This account has not been approved for vendor access.');

    const { data: vendor, error: vendorError } = await client.from('vendor_profiles').select('*').eq('owner_id', user.id).single();
    if (vendorError) throw friendly(vendorError);
    const { data: truck, error: truckError } = await client.from('trucks').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: true }).limit(1).single();
    if (truckError) throw friendly(truckError);
    return { user: { id: user.id, email: user.email }, profile, vendor, truck };
  }

  window.FoodTrekNowVendorStorageKey = baseKey => {
    const truckId = localStorage.getItem(ACTIVE_TRUCK_KEY);
    return truckId ? `${baseKey}:${truckId}` : baseKey;
  };

  window.FoodTrekNowVendorAuth = Object.freeze({
    available: Boolean(client),
    async signIn(email, password) {
      if (!client) throw new Error('The secure vendor account service is unavailable.');
      const { data, error } = await client.auth.signInWithPassword({ email: clean(email).toLowerCase(), password });
      if (error) throw friendly(error);
      try {
        const context = await loadContext(data.user);
        localStorage.setItem(ACTIVE_TRUCK_KEY, context.truck.id);
        return context;
      } catch (accessError) {
        await client.auth.signOut();
        throw accessError;
      }
    },
    async restore() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw friendly(error);
      if (!data?.session?.user) return null;
      try {
        const context = await loadContext(data.session.user);
        localStorage.setItem(ACTIVE_TRUCK_KEY, context.truck.id);
        return context;
      } catch {
        return null;
      }
    },
    async signOut() {
      localStorage.removeItem(ACTIVE_TRUCK_KEY);
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw friendly(error);
    },
    clearTruck() { localStorage.removeItem(ACTIVE_TRUCK_KEY); }
  });
})();
