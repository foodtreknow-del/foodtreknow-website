import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/live-orders.js', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function harness() {
  const calls = [];
  const builder = table => {
    const state = { action: 'select', payload: null };
    return {
      select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      update(payload) { state.action = 'update'; state.payload = payload; calls.push(['update', table, payload]); return this; },
      async single() { return { data: { id: 'order-uuid', status: state.payload?.status }, error: null }; },
      then(resolve) { resolve({ data: [], error: null }); }
    };
  };
  const channel = { on() { return this; }, subscribe() { return this; } };
  const client = {
    from: table => builder(table),
    async rpc(name, payload) {
      calls.push(['rpc', name, payload]);
      if (name === 'place_order') return { data: [{ order_id: 'order-uuid', order_number: 1050, status: 'received', subtotal: 14.5, tax: 0.87, total: 15.37 }], error: null };
      return { data: { id: 'order-uuid', status: 'cancelled' }, error: null };
    },
    channel() { return channel; },
    removeChannel() {}
  };
  const window = { FoodTrekNowSupabaseClient: client };
  vm.runInContext(source, vm.createContext({ window, console }));
  return { api: window.FoodTrekNowLiveOrders, calls };
}

test('signed-in checkout sends menu item ids and quantities to secure server pricing', async () => {
  const { api, calls } = harness();
  const placed = await api.placeOrder({ truckId: 'truck-uuid', items: [{ menuItemId: 'item-uuid', quantity: 2, modifiers: [], instructions: 'No onions' }], customerName: 'Test Customer', customerMobile: '5555550100', customerEmail: 'test@example.com', orderNotes: '', paymentLabel: 'Pay at Pickup' });
  const call = calls.find(entry => entry[0] === 'rpc' && entry[1] === 'place_order');
  assert.equal(call[2].p_truck_id, 'truck-uuid');
  assert.equal(call[2].p_items[0].menu_item_id, 'item-uuid');
  assert.equal(call[2].p_items[0].quantity, 2);
  assert.equal(placed.order_number, 1050);
});

test('vendor status actions update the same Supabase order record', async () => {
  const { api, calls } = harness();
  await api.updateVendorStatus('order-uuid', 'preparing');
  assert.ok(calls.some(entry => entry[0] === 'update' && entry[1] === 'orders' && entry[2].status === 'preparing'));
});

test('customer cancellation uses the protected customer RPC', async () => {
  const { api, calls } = harness();
  await api.cancelCustomerOrder('order-uuid');
  assert.ok(calls.some(entry => entry[0] === 'rpc' && entry[1] === 'cancel_my_order' && entry[2].p_order_id === 'order-uuid'));
});

test('live order service loads before vendor and customer applications', () => {
  const servicePosition = html.indexOf('js/live-orders.js?v=communications-1');
  assert.ok(servicePosition >= 0 && servicePosition < html.indexOf('js/app.js?v=communications-1'));
  assert.ok(servicePosition < html.indexOf('js/customer-account.js?v=online-override-1'));
});

test('order participants use protected communication RPCs', async () => {
  const { api, calls } = harness();
  await api.sendOrderMessage('order-uuid', 'Meet me at the pickup window.', 'vendor');
  await api.markOrderMessagesRead('order-uuid', 'vendor');
  await api.markCustomerNotificationsRead(['notification-uuid']);
  assert.ok(calls.some(entry => entry[1] === 'send_order_message' && entry[2].p_order_id === 'order-uuid' && entry[2].p_sender_role === 'vendor'));
  assert.ok(calls.some(entry => entry[1] === 'mark_order_messages_read' && entry[2].p_reader_role === 'vendor'));
  assert.ok(calls.some(entry => entry[1] === 'mark_customer_notifications_read'));
});

test('vendor and customer applications hydrate, subscribe, and map live status changes', () => {
  assert.match(vendorSource, /hydrateVendorOrders/);
  assert.match(vendorSource, /subscribeVendor/);
  assert.match(vendorSource, /updateVendorStatus/);
  assert.match(customerSource, /hydrateLiveCustomerOrders/);
  assert.match(customerSource, /subscribeCustomer/);
  assert.match(customerSource, /databaseStatusForCustomer/);
  assert.match(customerSource, /source\.supabaseOrderId/);
  assert.match(vendorSource, /hydrateVendorCommunications/);
  assert.match(customerSource, /hydrateCustomerCommunications/);
});
