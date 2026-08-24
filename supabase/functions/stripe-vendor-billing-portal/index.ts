import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowedOrigin = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Vary': 'Origin' } }); }
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function returnUrl() { const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000'); if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('APP_BASE_URL must use HTTPS outside local development.'); url.searchParams.set('billing', 'return'); return url.toString(); }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.');
    const url = requiredEnvironment('SUPABASE_URL');
    const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.');
    const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: vendor, error: vendorError } = await serviceClient.from('vendor_profiles').select('id').eq('owner_id', userData.user.id).single();
    if (vendorError || !vendor) throw new Error('Only an approved vendor can manage billing.');
    const { data: subscription, error: subscriptionError } = await serviceClient.from('vendor_subscriptions').select('stripe_customer_id').eq('vendor_profile_id', vendor.id).maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription?.stripe_customer_id) throw new Error('Start the $14.99 monthly subscription before opening billing management.');
    const form = new URLSearchParams();
    form.set('customer', subscription.stripe_customer_id);
    form.set('return_url', returnUrl());
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', { method: 'POST', headers: { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not open billing management.');
    return json(request, { portalUrl: payload.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Billing management could not be opened.';
    console.error('Vendor billing portal failed:', message);
    return json(request, { error: message }, 400);
  }
});
