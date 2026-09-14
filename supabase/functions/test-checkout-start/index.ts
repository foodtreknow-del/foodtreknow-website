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

function allowedTesterEmails() {
  return new Set(requiredEnvironment('GOOGLE_PLAY_TESTER_EMAILS')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This application origin is not allowed.' }, 403);
  let draftId = '';
  let serviceClient: ReturnType<typeof createClient> | null = null;
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
    const testerEmail = String(userData.user.email || '').trim().toLowerCase();
    if (!testerEmail || !allowedTesterEmails().has(testerEmail)) {
      throw new Error('This FoodTrekNow account is not approved for no-charge test orders.');
    }
    serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const body = await request.json();
    const { data, error } = await userClient.rpc('create_payment_checkout_draft_with_credit', {
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
      p_use_vendor_credit: false
    });
    if (error) throw error;
    const draft = Array.isArray(data) ? data[0] : data;
    if (!draft?.draft_id) throw new Error('The test checkout draft was not created.');
    draftId = draft.draft_id;
    const testSessionId = `google_play_test_${draftId}`;
    const { error: draftUpdateError } = await serviceClient.from('payment_checkout_drafts').update({
      stripe_checkout_session_id: testSessionId,
      status: 'paid',
      stripe_livemode: false
    }).eq('id', draftId).eq('customer_id', userData.user.id);
    if (draftUpdateError) throw draftUpdateError;
    const { data: finalized, error: finalizeError } = await serviceClient.rpc('finalize_paid_checkout', {
      p_draft_id: draftId,
      p_checkout_session_id: testSessionId,
      p_payment_intent_id: '',
      p_charge_id: '',
      p_amount_paid_cents: Number(draft.stripe_due_cents),
      p_payment_label: 'Google Play Test - No Charge'
    });
    if (finalizeError) throw finalizeError;
    const order = Array.isArray(finalized) ? finalized[0] : finalized;
    const { error: orderUpdateError } = await serviceClient.from('orders').update({
      is_test_order: true,
      stripe_livemode: false,
      payment_label: 'Google Play Test - No Charge'
    }).eq('id', order.order_id).eq('customer_id', userData.user.id);
    if (orderUpdateError) throw orderUpdateError;
    return json(request, { order, testPayment: true, noCharge: true });
  } catch (error) {
    if (draftId && serviceClient) {
      await serviceClient.rpc('release_checkout_credit', { p_draft_id: draftId });
      await serviceClient.from('payment_checkout_drafts').update({ status: 'failed' }).eq('id', draftId);
    }
    const message = error instanceof Error ? error.message : 'The test order could not be placed.';
    console.error('Google Play test checkout failed:', message);
    return json(request, { error: message }, 400);
  }
});
