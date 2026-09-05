import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowed = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin' } }); }
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function authenticatedHost(request: Request) { const authorization = request.headers.get('Authorization'); if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with a Host account.'); const url = requiredEnvironment('SUPABASE_URL'); const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } }); const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7).trim()); if (userError || !userData.user) throw new Error('Your Host session has expired. Please sign in again.'); const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } }); const { data: host, error } = await serviceClient.from('location_hosts').select('id').eq('owner_id', userData.user.id).single(); if (error || !host) throw new Error('Create a Host profile before connecting Stripe.'); return { serviceClient, host }; }
async function stripeAccount(id: string) { const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}` } }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not retrieve the Host account.'); return payload; }
function safeAccountState(account: Record<string, any>) { const requirements = account.requirements?.currently_due || []; const disabled = account.requirements?.disabled_reason || null; let status = 'onboarding_required'; if (account.charges_enabled && account.payouts_enabled) status = 'active'; else if (disabled) status = 'restricted'; else if (account.details_submitted) status = 'pending'; return { status, details_submitted: Boolean(account.details_submitted), charges_enabled: Boolean(account.charges_enabled), payouts_enabled: Boolean(account.payouts_enabled), requirements_due: requirements, disabled_reason: disabled, connected_at: status === 'active' ? new Date().toISOString() : null, last_synced_at: new Date().toISOString() }; }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, host } = await authenticatedHost(request);
    const { data: saved, error: savedError } = await serviceClient.from('host_stripe_connect_accounts')
      .select('stripe_account_id').eq('host_id', host.id).maybeSingle();
    if (savedError) throw savedError;
    if (!saved) return json(request, { status: 'not_connected' });
    const account = await stripeAccount(saved.stripe_account_id);
    const state = safeAccountState(account);
    const { error } = await serviceClient.from('host_stripe_connect_accounts').update(state).eq('host_id', host.id);
    if (error) throw error;
    return json(request, state);
  } catch (error) {
    console.error('Host Stripe Connect status failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
