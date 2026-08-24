import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '')
  .split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedStatuses = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'paused']);

function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowedOrigin = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Vary': 'Origin' } }); }
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }

async function vendorContext(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.');
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new Error('Your vendor session has expired. Please sign in again.');
  const url = requiredEnvironment('SUPABASE_URL');
  const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.');
  const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vendor, error: vendorError } = await serviceClient.from('vendor_profiles').select('id').eq('owner_id', userData.user.id).single();
  if (vendorError || !vendor) throw new Error('Only an approved vendor can view subscription status.');
  return { serviceClient, vendor };
}

async function stripeSubscription(subscriptionId: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price.product`, { headers: { Authorization: `Bearer ${secret}` } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not retrieve the subscription.');
  return payload;
}

function subscriptionState(subscription: Record<string, any>, existing: Record<string, any>) {
  const item = subscription.items?.data?.[0] || {};
  const status = allowedStatuses.has(subscription.status) ? subscription.status : 'incomplete';
  const grace = status === 'past_due'
    ? existing.grace_period_ends_at || new Date(Date.now() + 7 * 86400000).toISOString()
    : null;
  return {
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_product_id: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id || null,
    stripe_price_id: item.price?.id || null,
    status,
    current_period_end: Number(subscription.current_period_end || item.current_period_end) ? new Date(Number(subscription.current_period_end || item.current_period_end) * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    grace_period_ends_at: grace,
    last_synced_at: new Date().toISOString()
  };
}

function responseState(row: Record<string, any> | null) {
  const status = row?.status || 'not_started';
  const graceActive = status === 'past_due' && row?.grace_period_ends_at && Date.parse(row.grace_period_ends_at) > Date.now();
  return {
    status,
    access_allowed: ['active', 'trialing'].includes(status) || Boolean(graceActive),
    current_period_end: row?.current_period_end || null,
    cancel_at_period_end: Boolean(row?.cancel_at_period_end),
    grace_period_ends_at: row?.grace_period_ends_at || null,
    last_invoice_status: row?.last_invoice_status || null,
    has_customer: Boolean(row?.stripe_customer_id)
  };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, vendor } = await vendorContext(request);
    const { data: existing, error } = await serviceClient.from('vendor_subscriptions').select('*').eq('vendor_profile_id', vendor.id).maybeSingle();
    if (error) throw error;
    if (!existing?.stripe_subscription_id) return json(request, responseState(existing));
    const subscription = await stripeSubscription(existing.stripe_subscription_id);
    const state = subscriptionState(subscription, existing);
    const { data: updated, error: updateError } = await serviceClient.from('vendor_subscriptions').update(state).eq('vendor_profile_id', vendor.id).select('*').single();
    if (updateError) throw updateError;
    const accessAllowed = responseState(updated).access_allowed;
    const { error: truckError } = await serviceClient.from('trucks').update({ is_active: accessAllowed }).eq('vendor_id', vendor.id);
    if (truckError) throw truckError;
    return json(request, responseState(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subscription status could not be loaded.';
    console.error('Vendor subscription status failed:', message);
    return json(request, { error: message }, 400);
  }
});
