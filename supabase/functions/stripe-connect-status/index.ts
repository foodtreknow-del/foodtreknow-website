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
    .select('id, owner_id').eq('owner_id', userData.user.id).single();
  if (vendorError || !vendor) throw new Error('Only an approved vendor can check Stripe status.');
  return { serviceClient, vendor };
}

async function stripeAccount(accountId: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) throw new Error('Stripe is configured with an invalid server key.');
  const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${secret}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not retrieve the account.');
  return payload;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, vendor } = await authenticatedVendor(request);
    const { data: savedAccount, error: savedError } = await serviceClient.from('stripe_connect_accounts')
      .select('stripe_account_id').eq('vendor_profile_id', vendor.id).maybeSingle();
    if (savedError) throw savedError;
    if (!savedAccount) return json(request, { status: 'not_connected' });
    const account = await stripeAccount(savedAccount.stripe_account_id);
    const requirementsDue = account.requirements?.currently_due || [];
    const disabledReason = account.requirements?.disabled_reason || null;
    let status = 'onboarding_required';
    if (account.charges_enabled && account.payouts_enabled) status = 'active';
    else if (disabledReason) status = 'restricted';
    else if (account.details_submitted) status = 'pending';
    const state = {
      status,
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      requirements_due: requirementsDue,
      disabled_reason: disabledReason,
      connected_at: status === 'active' ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString()
    };
    const { error: updateError } = await serviceClient.from('stripe_connect_accounts')
      .update(state).eq('vendor_profile_id', vendor.id);
    if (updateError) throw updateError;
    return json(request, state);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    console.error('Stripe Connect status failed:', message);
    return json(request, { error: message }, 400);
  }
});
