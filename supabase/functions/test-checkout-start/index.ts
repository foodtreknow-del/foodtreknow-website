import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '')
  .split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost', 'capacitor://localhost'];

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin);
}

function json(request: Request, body: unknown, status = 200) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '');
  const allowedOrigin = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0];
  return new Response(JSON.stringify(body), { status, headers: {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  }});
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This application origin is not allowed.' }, 403);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved tester account.');
    const url = requiredEnvironment('SUPABASE_URL');
    const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your tester session has expired. Please sign in again.');
    const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const dailyWindow = new Date();
    dailyWindow.setUTCHours(0, 0, 0, 0);
    const { count: dailyTestOrders, error: dailyLimitError } = await serviceClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', userData.user.id)
      .eq('is_test_order', true)
      .gte('created_at', dailyWindow.toISOString());
    if (dailyLimitError) throw dailyLimitError;
    if (Number(dailyTestOrders || 0) >= 25) {
      throw new Error('This tester account reached today’s no-charge order limit. Try again tomorrow.');
    }
    const body = await request.json();
    const { data, error } = await userClient.rpc('place_order', {
      p_truck_id: body.truckId,
      p_items: Array.isArray(body.items) ? body.items.map((item: Record<string, unknown>) => ({
        menu_item_id: item.menuItemId,
        quantity: Number(item.quantity),
        modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        special_instructions: String(item.instructions || '')
      })) : [],
      p_customer_name: String(body.customerName || ''),
      p_customer_mobile: body.customerMobile || null,
      p_customer_email: body.customerEmail || null,
      p_order_notes: body.orderNotes || null,
      p_payment_label: 'Test Order - No Charge'
    });
    if (error) throw error;
    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.order_id) throw new Error('The no-charge test order was not created.');
    const { error: orderUpdateError } = await serviceClient.from('orders').update({
      is_test_order: true,
      stripe_livemode: false,
      payment_label: 'Test Order - No Charge',
      payment_status: 'paid',
      amount_paid_cents: 0,
      payment_completed_at: new Date().toISOString()
    }).eq('id', order.order_id)
      .eq('customer_id', userData.user.id)
      .eq('truck_id', body.truckId);
    if (orderUpdateError) throw orderUpdateError;
    return json(request, { order, testPayment: true, noCharge: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The test order could not be placed.';
    console.error('No-charge test checkout failed:', message);
    return json(request, { error: message }, 400);
  }
});
