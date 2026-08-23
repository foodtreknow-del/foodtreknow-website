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

async function authenticatedVendor(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.');
  const url = requiredEnvironment('SUPABASE_URL');
  const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.');
  const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: vendor, error: vendorError } = await serviceClient.from('vendor_profiles')
    .select('id, owner_id, business_name, contact_email').eq('owner_id', userData.user.id).single();
  if (vendorError || !vendor) throw new Error('Only an approved vendor can connect a Stripe account.');
  return { serviceClient, user: userData.user, vendor };
}

type StripeRequestBody = URLSearchParams | Record<string, unknown>;

async function stripeRequest<T>(path: string, body?: StripeRequestBody, idempotencyKey?: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) throw new Error('Stripe is configured with an invalid server key.');
  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  const isForm = body instanceof URLSearchParams;
  if (isForm) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  else if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Stripe-Version'] = '2026-07-29.dahlia';
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: isForm ? body.toString() : body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not complete the request.');
  return payload as T;
}

function applicationUrl(kind: 'return' | 'refresh') {
  const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000');
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('stripe', kind);
  return url.toString();
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, user, vendor } = await authenticatedVendor(request);
    const { data: savedAccount, error: savedError } = await serviceClient.from('stripe_connect_accounts')
      .select('stripe_account_id').eq('vendor_profile_id', vendor.id).maybeSingle();
    if (savedError) throw savedError;
    let accountId = savedAccount?.stripe_account_id;
    if (!accountId) {
      const accountEmail = vendor.contact_email || user.email;
      const accountBody: Record<string, unknown> = {
        display_name: vendor.business_name,
        identity: { country: 'us' },
        dashboard: 'full',
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true }
            }
          }
        },
        defaults: {
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe'
          }
        },
        metadata: { foodtreknow_vendor_profile_id: vendor.id },
        include: ['configuration.merchant', 'identity', 'defaults']
      };
      if (accountEmail) accountBody.contact_email = accountEmail;
      const account = await stripeRequest<{ id: string }>(
        '/v2/core/accounts',
        accountBody,
        `foodtreknow-connect-v2-${vendor.id}`
      );
      accountId = account.id;
      const { error: saveError } = await serviceClient.from('stripe_connect_accounts').insert({
        vendor_profile_id: vendor.id, stripe_account_id: accountId, status: 'onboarding_required'
      });
      if (saveError) throw saveError;
    }
    const linkForm = new URLSearchParams();
    linkForm.set('account', accountId);
    linkForm.set('refresh_url', applicationUrl('refresh'));
    linkForm.set('return_url', applicationUrl('return'));
    linkForm.set('type', 'account_onboarding');
    linkForm.set('collection_options[fields]', 'eventually_due');
    const accountLink = await stripeRequest<{ url: string }>('/v1/account_links', linkForm);
    return json(request, { onboardingUrl: accountLink.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    console.error('Stripe Connect start failed:', message);
    return json(request, { error: message }, 400);
  }
});
