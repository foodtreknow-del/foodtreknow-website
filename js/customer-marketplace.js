(function exposeCustomerMarketplace() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;

  async function load() {
    if (!client) return [];
    const { data: trucks, error: truckError } = await client.from('trucks').select('*').eq('is_active', true).order('created_at');
    if (truckError) throw truckError;
    if (!trucks?.length) return [];
    const truckIds = trucks.map(truck => truck.id);
    const [{ data: hours, error: hoursError }, { data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
      client.from('truck_hours').select('*').in('truck_id', truckIds).order('day_of_week'),
      client.from('menu_categories').select('*').in('truck_id', truckIds).eq('is_active', true).order('sort_order'),
      client.from('menu_items').select('*').in('truck_id', truckIds).eq('is_active', true).order('sort_order')
    ]);
    if (hoursError || categoryError || itemError) throw hoursError || categoryError || itemError;
    let locations = [];
    const { data: liveLocations, error: locationError } = await client.from('truck_live_locations').select('*').in('truck_id', truckIds).eq('is_sharing', true);
    if (!locationError) locations = liveLocations || [];
    else if (!String(locationError.message || '').toLowerCase().includes('truck_live_locations')) throw locationError;
    const categoryNames = new Map((categories || []).map(category => [category.id, category.name]));
    return trucks.map(truck => ({
      ...truck,
      hours: (hours || []).filter(row => row.truck_id === truck.id),
      live_location: (locations || []).find(row => row.truck_id === truck.id) || null,
      menu: (items || []).filter(item => item.truck_id === truck.id).map(item => ({ ...item, category_name: categoryNames.get(item.category_id) || 'Menu' }))
    }));
  }

  function subscribeLocations(callback) {
    if (!client?.channel || typeof callback !== 'function') return null;
    return client.channel('customer-live-truck-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_live_locations' }, callback)
      .subscribe();
  }

  window.FoodTrekNowCustomerMarketplace = Object.freeze({ available: Boolean(client), load, subscribeLocations });
})();
