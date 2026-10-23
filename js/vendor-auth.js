(function exposeVendorAuthentication() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const ACTIVE_TRUCK_KEY = 'ftnActiveVendorTruckId';
  const clean = value => String(value || '').trim();
  const friendly = error => {
    const message = clean(error?.message).toLowerCase();
    if (message.includes('invalid login credentials')) return new Error('Vendor email or password is incorrect.');
    if (message.includes('email not confirmed')) return new Error('Verify your email before signing in.');
    if (message.includes('cannot coerce') || error?.code === 'PGRST116') return new Error('Your vendor account setup is incomplete. Ask the FoodTrekNow administrator to verify your approval.');
    return new Error(clean(error?.message) || 'Vendor sign-in is temporarily unavailable.');
  };

  async function loadContext(user) {
    const { data: profile, error: profileError } = await client.from('profiles').select('id, role, first_name, last_name').eq('id', user.id).maybeSingle();
    if (profileError) throw friendly(profileError);
    if (!profile) throw new Error('This account does not have a FoodTrekNow profile yet. Sign in through the customer portal first, then submit a Vendor Application.');
    const { data: isPlatformAdmin, error: adminError } = await client.rpc('is_admin');
    if (adminError) throw friendly(adminError);
    const { data: vendor, error: vendorError } = await client.from('vendor_profiles').select('*').eq('owner_id', user.id).maybeSingle();
    if (vendorError) throw friendly(vendorError);
    if (!vendor) throw new Error('This account has not been approved for vendor access.');
    const { data: accessState, error: accessError } = await client.rpc('current_vendor_access_state');
    if (accessError) throw friendly(accessError);
    if (accessState?.admin_frozen) throw new Error(`Vendor access is temporarily frozen. ${clean(accessState.freeze_reason) || 'Contact the FoodTrekNow administrator for assistance.'}`);
    const { data: truck, error: truckError } = await client.from('trucks').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (truckError) throw friendly(truckError);
    if (!truck) throw new Error('Your vendor profile does not have a food truck yet. Ask the FoodTrekNow administrator to complete the setup.');
    let portalAccess = {};
    const { data: access, error: portalError } = await client.rpc('current_portal_access');
    if (!portalError && access) portalAccess = access;
    return { user: { id: user.id, email: user.email }, profile, vendor, truck, isPlatformAdmin: Boolean(isPlatformAdmin), hostApproved: Boolean(portalAccess.host_approved) };
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
    async requestPasswordReset(email) {
      const normalizedEmail = clean(email).toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter your vendor email address first.');
      if (!client) throw new Error('The secure vendor account service is unavailable.');
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw friendly(error);
    },
    clearTruck() { localStorage.removeItem(ACTIVE_TRUCK_KEY); }
  });
})();

