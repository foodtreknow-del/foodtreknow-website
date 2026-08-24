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

async function stripeSession(sessionId: string, stripeAccountId: string) {
  const secret = requiredEnvironment('STRIPE_SECRET_KEY');
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  url.searchParams.append('expand[]', 'payment_intent.latest_charge');
  const response = await fetch(url, { headers: {
    Authorization: `Bearer ${secret}`,
    'Stripe-Account': stripeAccountId
  }});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not verify this checkout.');
  return payload;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in to confirm your payment.');
    const supabaseUrl = requiredEnvironment('SUPABASE_URL');
    const userClient = createClient(supabaseUrl, requiredEnvironment('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your customer session has expired. Please sign in again.');
    const serviceClient = createClient(supabaseUrl, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const body = await request.json();
    const sessionId = String(body.sessionId || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error('A valid Stripe checkout session is required.');
    const { data: draft, error: draftError } = await serviceClient.from('payment_checkout_drafts')
      .select('*').eq('stripe_checkout_session_id', sessionId).eq('customer_id', userData.user.id).single();
    if (draftError || !draft) throw new Error('This checkout does not belong to your account.');

    const session = await stripeSession(sessionId, draft.stripe_account_id);
    if (session.metadata?.foodtreknow_draft_id !== draft.id) throw new Error('Stripe returned a mismatched checkout.');
    if (session.payment_status !== 'paid') throw new Error('Stripe has not confirmed this payment yet.');
    if (Number(session.amount_total) !== Number(draft.stripe_due_cents)) throw new Error('The Stripe payment amount does not match this order.');
    const paymentIntent = session.payment_intent;
    const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || '';
    const latestCharge = typeof paymentIntent === 'object' ? paymentIntent?.latest_charge : null;
    const chargeId = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id || '';

    await serviceClient.from('payment_checkout_drafts').update({ status: 'paid' }).eq('id', draft.id);
    const { data: finalized, error: finalizeError } = await serviceClient.rpc('finalize_paid_checkout', {
      p_draft_id: draft.id,
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntentId,
      p_charge_id: chargeId,
      p_amount_paid_cents: Number(session.amount_total),
      p_payment_label: 'Stripe Checkout'
    });
    if (finalizeError) throw finalizeError;
    const order = Array.isArray(finalized) ? finalized[0] : finalized;
    return json(request, { order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment confirmation failed.';
    console.error('Stripe checkout completion failed:', message);
    return json(request, { error: message }, 400);
  }
});
