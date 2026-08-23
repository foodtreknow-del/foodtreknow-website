(function exposeVendorData() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  let menuTimer = null;
  let settingsTimer = null;
  let lastError = '';
  const activeTruckId = () => localStorage.getItem('ftnActiveVendorTruckId');
  const notifyError = error => {
    lastError = String(error?.message || 'Vendor data could not be synchronized.');
    console.error('FoodTrekNow vendor sync failed:', lastError);
    window.dispatchEvent?.(new CustomEvent('ftn:vendor-sync-error', { detail: { message: lastError } }));
  };

  async function loadMenu(truckId = activeTruckId()) {
    if (!client || !truckId) return { categories: [], items: [] };
    const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
      client.from('menu_categories').select('*').eq('truck_id', truckId).eq('is_active', true).order('sort_order'),
      client.from('menu_items').select('*, menu_categories(name)').eq('truck_id', truckId).eq('is_active', true).order('sort_order')
    ]);
    if (categoryError || itemError) throw categoryError || itemError;
    return {
      categories: (categories || []).map(category => category.name),
      items: (items || []).map(item => ({
        id: /^\d+$/.test(item.client_key) ? Number(item.client_key) : item.client_key,
        name: item.name,
        category: item.menu_categories?.name || 'Featured',
        price: Number(item.price),
        description: item.description || '',
        available: !item.is_sold_out,
        featured: Boolean(item.is_featured),
        image: item.photo_url || '',
        order: Number(item.sort_order) || 0
      }))
    };
  }

  async function syncMenu(categories, items, truckId = activeTruckId()) {
    if (!client || !truckId) return;
    const categoryPayload = categories.map((name, index) => ({ name, sort_order: index + 1 }));
    const itemPayload = items.map((item, index) => ({
      client_key: String(item.id),
      name: item.name,
      category: item.category,
      price: Number(item.price),
      description: item.description || '',
      photo_url: item.image || '',
      is_featured: Boolean(item.featured),
      is_sold_out: item.available === false,
      sort_order: Number(item.order) || index + 1
    }));
    const { error } = await client.rpc('sync_vendor_menu', { p_truck_id: truckId, p_categories: categoryPayload, p_items: itemPayload });
    if (error) throw error;
  }

  async function syncSettings(settings, truckId = activeTruckId()) {
    if (!client || !truckId) return;
    const { error } = await client.from('trucks').update({
      name: settings.profile.truckName,
      cuisine: settings.profile.cuisine,
      description: settings.profile.description || null,
      contact_mobile: settings.profile.phone || null,
      contact_email: settings.profile.email || null,
      location_name: [settings.profile.city, settings.profile.state].filter(Boolean).join(', ') || null,
      accepting_orders: Boolean(settings.operations.acceptingOrders),
      estimated_prep_minutes: Number(settings.operations.prepTime),
      minimum_order: Number(settings.operations.minimumOrder),
      tax_rate: Number(settings.operations.taxRate) / 100,
      pickup_instructions: settings.operations.pickupInstructions || null,
      logo_url: settings.profile.logo || null
    }).eq('id', truckId);
    if (error) throw error;

    const dayNumbers = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const hoursPayload = Object.entries(settings.hours || {}).map(([day, hours]) => ({
      truck_id: truckId,
      day_of_week: dayNumbers[day],
      opens_at: hours.enabled ? hours.open : null,
      closes_at: hours.enabled ? hours.close : null,
      is_closed: !hours.enabled
    })).filter(row => Number.isInteger(row.day_of_week));
    if (hoursPayload.length) {
      const { error: hoursError } = await client.from('truck_hours').upsert(hoursPayload, { onConflict: 'truck_id,day_of_week' });
      if (hoursError) throw hoursError;
    }
  }

  async function loadHours(truckId = activeTruckId()) {
    if (!client || !truckId) return null;
    const { data, error } = await client.from('truck_hours').select('day_of_week,opens_at,closes_at,is_closed').eq('truck_id', truckId);
    if (error) throw error;
    if (!data?.length) return null;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return Object.fromEntries(data.map(row => [dayNames[row.day_of_week], {
      enabled: !row.is_closed,
      open: String(row.opens_at || '11:00').slice(0, 5),
      close: String(row.closes_at || '20:00').slice(0, 5)
    }]));
  }

  window.FoodTrekNowVendorData = Object.freeze({
    available: Boolean(client),
    loadMenu,
    loadHours,
    syncMenu,
    syncSettings,
    queueMenuSync(categories, items) {
      if (!activeTruckId()) return;
      clearTimeout(menuTimer);
      menuTimer = setTimeout(() => syncMenu(categories, items).catch(notifyError), 350);
    },
    queueSettingsSync(settings) {
      if (!activeTruckId()) return;
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(() => syncSettings(settings).catch(notifyError), 350);
    },
    getLastError() { return lastError; }
  });
})();
