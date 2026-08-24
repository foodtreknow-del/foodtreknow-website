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

async function vendorContext(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.');
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new Error('Your vendor session has expired. Please sign in again.');
  const url = requiredEnvironment('SUPABASE_URL');
  const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.');
  const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: vendor, error: vendorError } = await serviceClient.from('vendor_profiles')
    .select('id, business_name, contact_email').eq('owner_id', userData.user.id).single();
  if (vendorError || !vendor) throw new Error('Only an approved vendor can start a subscription.');
  return { serviceClient, user: userData.user, vendor };
}

async function stripePost(path: string, form: URLSearchParams, idempotencyKey?: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) throw new Error('Stripe is configured with an invalid server key.');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com${path}`, { method: 'POST', headers, body: form.toString() });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not start vendor billing.');
  return payload;
}

function applicationUrl(result: 'success' | 'cancelled') {
  const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000');
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('billing', result);
  if (result === 'success') url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, user, vendor } = await vendorContext(request);
    const priceId = requiredEnvironment('STRIPE_VENDOR_MONTHLY_PRICE_ID');
    if (!priceId.startsWith('price_')) throw new Error('The FoodTrekNow vendor price is invalid.');
    const { data: current, error: currentError } = await serviceClient.from('vendor_subscriptions')
      .select('*').eq('vendor_profile_id', vendor.id).maybeSingle();
    if (currentError) throw currentError;
    if (current?.status === 'active' || current?.status === 'trialing') {
      throw new Error('This vendor subscription is already active.');
    }
    if (current?.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(current.status)) {
      throw new Error('Use Manage Billing to update or complete the existing subscription.');
    }

    let customerId = current?.stripe_customer_id || '';
    if (!customerId) {
      const customerForm = new URLSearchParams();
      customerForm.set('email', vendor.contact_email || user.email || '');
      customerForm.set('name', vendor.business_name);
      customerForm.set('metadata[foodtreknow_vendor_profile_id]', vendor.id);
      const customer = await stripePost('/v1/customers', customerForm, `foodtreknow-vendor-customer-${vendor.id}`);
      customerId = customer.id;
      const { error: customerSaveError } = await serviceClient.from('vendor_subscriptions').upsert({
        vendor_profile_id: vendor.id,
        stripe_customer_id: customerId,
        status: 'not_started',
        last_synced_at: new Date().toISOString()
      }, { onConflict: 'vendor_profile_id' });
      if (customerSaveError) throw customerSaveError;
    }

    const checkoutForm = new URLSearchParams();
    checkoutForm.set('mode', 'subscription');
    checkoutForm.set('customer', customerId);
    checkoutForm.set('line_items[0][price]', priceId);
    checkoutForm.set('line_items[0][quantity]', '1');
    checkoutForm.set('success_url', applicationUrl('success'));
    checkoutForm.set('cancel_url', applicationUrl('cancelled'));
    checkoutForm.set('client_reference_id', vendor.id);
    checkoutForm.set('metadata[foodtreknow_vendor_profile_id]', vendor.id);
    checkoutForm.set('metadata[foodtreknow_vendor_subscription]', 'true');
    checkoutForm.set('subscription_data[metadata][foodtreknow_vendor_profile_id]', vendor.id);
    checkoutForm.set('subscription_data[metadata][foodtreknow_vendor_subscription]', 'true');
    checkoutForm.set('billing_address_collection', 'auto');
    const session = await stripePost('/v1/checkout/sessions', checkoutForm, `foodtreknow-vendor-subscription-${vendor.id}-${priceId}`);
    return json(request, { checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The subscription could not be started.';
    console.error('Vendor subscription start failed:', message);
    return json(request, { error: message }, 400);
  }
});
