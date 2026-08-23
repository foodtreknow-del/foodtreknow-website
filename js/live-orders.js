(function exposeLiveOrders() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  let customerChannel = null;
  let vendorChannel = null;
  const orderSelection = '*, order_items(*), trucks(name,estimated_prep_minutes,pickup_instructions)';

  async function placeOrder(payload) {
    if (!client) throw new Error('Secure ordering is unavailable.');
    const { data, error } = await client.rpc('place_order', {
      p_truck_id: payload.truckId,
      p_items: payload.items.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: Number(item.quantity),
        modifiers: item.modifiers || [],
        special_instructions: item.instructions || ''
      })),
      p_customer_name: payload.customerName,
      p_customer_mobile: payload.customerMobile || null,
      p_customer_email: payload.customerEmail || null,
      p_order_notes: payload.orderNotes || null,
      p_payment_label: payload.paymentLabel || 'Pay at Pickup'
    });
    if (error) throw error;
    const placed = Array.isArray(data) ? data[0] : data;
    if (!placed?.order_id) throw new Error('The order was not returned by the server.');
    return placed;
  }

  async function loadCustomerOrders() {
    if (!client) return [];
    const { data, error } = await client.from('orders').select(orderSelection).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadVendorOrders(truckId) {
    if (!client || !truckId) return [];
    const { data, error } = await client.from('orders').select(orderSelection).eq('truck_id', truckId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function updateVendorStatus(orderId, status) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const { data, error } = await client.from('orders').update({ status }).eq('id', orderId).select().single();
    if (error) throw error;
    return data;
  }

  async function cancelCustomerOrder(orderId) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const { data, error } = await client.rpc('cancel_my_order', { p_order_id: orderId });
    if (error) throw error;
    return data;
  }

  function subscribeCustomer(customerId, callback) {
    if (!client || !customerId || typeof client.channel !== 'function') return null;
    if (customerChannel) client.removeChannel(customerChannel);
    customerChannel = client.channel(`customer-orders-${customerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` }, callback)
      .subscribe();
    return customerChannel;
  }

  function subscribeVendor(truckId, callback) {
    if (!client || !truckId || typeof client.channel !== 'function') return null;
    if (vendorChannel) client.removeChannel(vendorChannel);
    vendorChannel = client.channel(`vendor-orders-${truckId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `truck_id=eq.${truckId}` }, callback)
      .subscribe();
    return vendorChannel;
  }

  window.FoodTrekNowLiveOrders = Object.freeze({
    available: Boolean(client),
    placeOrder,
    loadCustomerOrders,
    loadVendorOrders,
    updateVendorStatus,
    cancelCustomerOrder,
    subscribeCustomer,
    subscribeVendor
  });
})();
