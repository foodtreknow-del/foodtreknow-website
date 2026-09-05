import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowed = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin' } }); }
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function authenticatedHost(request: Request) { const authorization = request.headers.get('Authorization'); if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with a Host account.'); const url = requiredEnvironment('SUPABASE_URL'); const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } }); const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7).trim()); if (userError || !userData.user) throw new Error('Your Host session has expired. Please sign in again.'); const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } }); const { data: host, error } = await serviceClient.from('location_hosts').select('id, owner_id, host_name, business_name, contact_email').eq('owner_id', userData.user.id).single(); if (error || !host) throw new Error('Create a Host profile before connecting Stripe.'); return { serviceClient, user: userData.user, host }; }
async function stripeRequest<T>(path: string, body?: URLSearchParams | Record<string, unknown>, idempotencyKey?: string) { const secret = requiredEnvironment('STRIPE_SECRET_KEY'); const form = body instanceof URLSearchParams; const headers: Record<string, string> = { Authorization: `Bearer ${secret}` }; if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded'; else if (body) { headers['Content-Type'] = 'application/json'; headers['Stripe-Version'] = '2026-07-29.dahlia'; } if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey; const response = await fetch(`https://api.stripe.com${path}`, { method: body ? 'POST' : 'GET', headers, body: form ? body.toString() : body ? JSON.stringify(body) : undefined }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not complete the request.'); return payload as T; }

function returnUrl(kind: 'return' | 'refresh') {
  const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('host_stripe', kind);
  return url.toString();
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, user, host } = await authenticatedHost(request);
    const { data: saved, error: savedError } = await serviceClient.from('host_stripe_connect_accounts')
      .select('stripe_account_id').eq('host_id', host.id).maybeSingle();
    if (savedError) throw savedError;
    let accountId = saved?.stripe_account_id;
    if (!accountId) {
      const body: Record<string, unknown> = {
        display_name: host.business_name,
        identity: { country: 'us' },
        dashboard: 'full',
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
        metadata: { foodtreknow_host_id: host.id },
        include: ['configuration.merchant', 'identity', 'defaults']
      };
      const email = host.contact_email || user.email;
      if (email) body.contact_email = email;
      const account = await stripeRequest<{ id: string }>('/v2/core/accounts', body, `foodtreknow-host-connect-v2-${host.id}`);
      accountId = account.id;
      const { error } = await serviceClient.from('host_stripe_connect_accounts').insert({
        host_id: host.id, stripe_account_id: accountId, status: 'onboarding_required'
      });
      if (error) throw error;
    }
    const form = new URLSearchParams();
    form.set('account', accountId);
    form.set('refresh_url', returnUrl('refresh'));
    form.set('return_url', returnUrl('return'));
    form.set('type', 'account_onboarding');
    form.set('collection_options[fields]', 'eventually_due');
    const link = await stripeRequest<{ url: string }>('/v1/account_links', form);
    return json(request, { onboardingUrl: link.url });
  } catch (error) {
    console.error('Host Stripe Connect start failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
