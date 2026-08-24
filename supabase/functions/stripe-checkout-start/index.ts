import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '')
  .split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

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

function checkoutUrl(kind: 'success' | 'cancelled', values: Record<string, string>) {
  const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000');
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('checkout', kind);
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

async function authenticatedCustomer(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in to pay online.');
  const url = requiredEnvironment('SUPABASE_URL');
  const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error('Your customer session has expired. Please sign in again.');
  const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return { userClient, serviceClient, user: userData.user };
}

async function createStripeCheckout(stripeAccountId: string, form: URLSearchParams, idempotencyKey: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) throw new Error('Stripe is configured with an invalid server key.');
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Account': stripeAccountId,
      'Idempotency-Key': idempotencyKey
    },
    body: form.toString()
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not open checkout.');
  return payload;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  let draftId = '';
  let serviceClient: ReturnType<typeof createClient> | null = null;
  try {
    const authenticated = await authenticatedCustomer(request);
    serviceClient = authenticated.serviceClient;
    const body = await request.json();
    const { data, error } = await authenticated.userClient.rpc('create_payment_checkout_draft', {
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
      p_order_notes: body.orderNotes || null
    });
    if (error) throw error;
    const draft = Array.isArray(data) ? data[0] : data;
    if (!draft?.draft_id || !draft?.stripe_account_id) throw new Error('The secure checkout draft was not created.');
    draftId = draft.draft_id;

    const form = new URLSearchParams();
    const lines = Array.isArray(draft.line_items) ? draft.line_items : [];
    lines.forEach((line: { name: string; unit_amount: number; quantity: number }, index: number) => {
      form.set(`line_items[${index}][price_data][currency]`, draft.currency || 'usd');
      form.set(`line_items[${index}][price_data][product_data][name]`, String(line.name).slice(0, 120));
      form.set(`line_items[${index}][price_data][unit_amount]`, String(line.unit_amount));
      form.set(`line_items[${index}][quantity]`, String(line.quantity));
    });
    form.set('mode', 'payment');
    form.set('success_url', checkoutUrl('success', { session_id: '{CHECKOUT_SESSION_ID}' }));
    form.set('cancel_url', checkoutUrl('cancelled', { draft_id: draftId }));
    form.set('client_reference_id', draftId);
    form.set('metadata[foodtreknow_draft_id]', draftId);
    form.set('metadata[foodtreknow_customer_id]', authenticated.user.id);
    form.set('metadata[foodtreknow_truck_name]', String(draft.truck_name || '').slice(0, 100));
    form.set('payment_intent_data[metadata][foodtreknow_draft_id]', draftId);
    form.set('payment_intent_data[metadata][foodtreknow_customer_id]', authenticated.user.id);
    form.set('expires_at', String(Math.floor(Date.now() / 1000) + 35 * 60));
    if (body.customerEmail) form.set('customer_email', String(body.customerEmail));

    const session = await createStripeCheckout(
      draft.stripe_account_id,
      form,
      `foodtreknow-checkout-${draftId}`
    );
    const { error: updateError } = await serviceClient.from('payment_checkout_drafts').update({
      stripe_checkout_session_id: session.id,
      status: 'checkout_open',
      expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : draft.expires_at
    }).eq('id', draftId);
    if (updateError) throw updateError;
    return json(request, { checkoutUrl: session.url, sessionId: session.id, draftId });
  } catch (error) {
    if (draftId && serviceClient) {
      await serviceClient.from('payment_checkout_drafts').update({ status: 'failed' }).eq('id', draftId);
    }
    const message = error instanceof Error ? error.message : 'Checkout could not be started.';
    console.error('Stripe checkout start failed:', message);
    return json(request, { error: message }, 400);
  }
});
