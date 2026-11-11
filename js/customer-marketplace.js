(function exposeCustomerMarketplace() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;

  async function load() {
    if (!client) return [];
    const { data: trucks, error: truckError } = await client.from('trucks').select('*').eq('is_active', true).order('created_at');
    if (truckError) throw truckError;
    if (!trucks?.length) return [];
    const truckIds = trucks.map(truck => truck.id);
    const [{ data: hours, error: hoursError }, { data: categories, error: categoryError }, { data: items, error: itemError }, { data: reviews, error: reviewError }] = await Promise.all([
      client.from('truck_hours').select('*').in('truck_id', truckIds).order('day_of_week'),
      client.from('menu_categories').select('*').in('truck_id', truckIds).eq('is_active', true).order('sort_order'),
      client.from('menu_items').select('*').in('truck_id', truckIds).eq('is_active', true).order('sort_order'),
      client.from('truck_reviews').select('truck_id,rating,comment,created_at').in('truck_id', truckIds).eq('is_removed', false).order('created_at', { ascending: false })
    ]);
    if (hoursError || categoryError || itemError || reviewError) throw hoursError || categoryError || itemError || reviewError;
    let locations = [];
    const { data: liveLocations, error: locationError } = await client.from('truck_live_locations').select('*').in('truck_id', truckIds).eq('is_sharing', true);
    if (!locationError) locations = liveLocations || [];
    else if (!String(locationError.message || '').toLowerCase().includes('truck_live_locations')) throw locationError;
    const categoryNames = new Map((categories || []).map(category => [category.id, category.name]));
    return trucks.map(truck => ({
      ...truck,
      hours: (hours || []).filter(row => row.truck_id === truck.id),
      live_location: (locations || []).find(row => row.truck_id === truck.id) || null,
      reviews: (reviews || []).filter(review => review.truck_id === truck.id),
      menu: (items || []).filter(item => item.truck_id === truck.id).map(item => ({ ...item, category_name: categoryNames.get(item.category_id) || 'Menu' }))
    }));
  }

  async function loadEvents() {
    if (!client?.rpc) return [];
    const { data, error } = await client.rpc('list_customer_events');
    if (error) {
      const message = String(error.message || '').toLowerCase();
      // Keep the existing customer experience usable until the new migration
      // has been applied to a deployment.
      if (message.includes('list_customer_events') || message.includes('schema cache')) return [];
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  async function checkInEvent(opportunityId) {
    if (!client) throw new Error('Sign in to check in at this event.');
    const { data, error } = await client.rpc('customer_event_check_in', { p_opportunity_id: opportunityId });
    if (error) throw error;
    return data;
  }

  async function reviewEvent(opportunityId, rating, comment) {
    if (!client) throw new Error('Sign in to review this event.');
    const { data, error } = await client.rpc('submit_customer_event_review', { p_opportunity_id: opportunityId, p_rating: Number(rating), p_comment: comment || '' });
    if (error) throw error;
    return data;
  }

  async function reviewTruck(orderId, rating, comment) {
    if (!client) throw new Error('Sign in to review this food truck.');
    const { data, error } = await client.rpc('submit_truck_review', { p_order_id: orderId, p_rating: Number(rating), p_comment: comment || '' });
    if (error) throw error;
    return data;
  }

  function subscribeLocations(callback) {
    if (!client?.channel || typeof callback !== 'function') return null;
    return client.channel('customer-live-truck-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_live_locations' }, callback)
      .subscribe();
  }

  window.FoodTrekNowCustomerMarketplace = Object.freeze({ available: Boolean(client), load, loadEvents, checkInEvent, reviewEvent, reviewTruck, subscribeLocations });
})();
