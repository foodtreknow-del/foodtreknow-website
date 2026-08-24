import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '')
  .split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const environment = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; };
const originAllowed = (request: Request) => { const origin = request.headers.get('origin')?.replace(/\/$/, ''); return !origin || allowedOrigins.includes(origin) || localOrigins.includes(origin); };
function json(request: Request, body: unknown, status = 200) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '');
  return new Response(JSON.stringify(body), { status, headers: {
    'Access-Control-Allow-Origin': origin && originAllowed(request) ? origin : allowedOrigins[0] || localOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin'
  }});
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!originAllowed(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in to cancel checkout.');
    const url = environment('SUPABASE_URL');
    const userClient = createClient(url, environment('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your customer session has expired.');
    const body = await request.json();
    const draftId = String(body.draftId || '');
    if (!/^[0-9a-f-]{36}$/i.test(draftId)) throw new Error('A valid checkout is required.');
    const { data: draft, error: draftError } = await userClient.from('payment_checkout_drafts')
      .select('id,stripe_account_id,stripe_checkout_session_id,order_id').eq('id', draftId).single();
    if (draftError || !draft) throw new Error('This checkout does not belong to your account.');
    if (draft.order_id) return json(request, { cancelled: false, orderCreated: true });
    if (draft.stripe_checkout_session_id?.startsWith('cs_')) {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(draft.stripe_checkout_session_id)}/expire`, {
        method: 'POST', headers: { Authorization: `Bearer ${environment('STRIPE_SECRET_KEY')}`, 'Stripe-Account': draft.stripe_account_id }
      });
      const result = await response.json();
      if (!response.ok && result?.error?.code !== 'resource_missing') throw new Error(result?.error?.message || 'Stripe Checkout could not be cancelled safely.');
    }
    const serviceClient = createClient(url, environment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: released, error: releaseError } = await serviceClient.rpc('release_checkout_credit', { p_draft_id: draft.id });
    if (releaseError) throw releaseError;
    return json(request, { cancelled: true, releasedCreditCents: Number(released || 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout could not be cancelled.';
    console.error('Stripe checkout cancellation failed:', message);
    return json(request, { error: message }, 400);
  }
});
