import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowed = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin' } }); }
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function authenticatedVendor(request: Request) { const authorization = request.headers.get('Authorization'); if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.'); const url = requiredEnvironment('SUPABASE_URL'); const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } }); const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7).trim()); if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.'); const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } }); const { data: vendor, error } = await serviceClient.from('vendor_profiles').select('id').eq('owner_id', userData.user.id).single(); if (error || !vendor) throw new Error('Only an approved vendor can confirm an event payment.'); return { serviceClient, vendor }; }
async function stripeRequest<T>(path: string, stripeAccountId: string) { const response = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}`, 'Stripe-Account': stripeAccountId } }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not verify the event payment.'); return payload as T; }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, vendor } = await authenticatedVendor(request);
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error('A valid Stripe Checkout session is required.');
    const { data: payment, error: paymentError } = await serviceClient.from('event_fee_payments')
      .select('*').eq('stripe_checkout_session_id', sessionId).eq('vendor_profile_id', vendor.id).single();
    if (paymentError || !payment) throw new Error('This event payment does not belong to your food truck.');
    const session = await stripeRequest<Record<string, any>>(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`, payment.stripe_account_id);
    if (session.metadata?.foodtreknow_event_fee_payment_id !== payment.id) throw new Error('Stripe returned a mismatched event payment.');
    if (session.payment_status !== 'paid') throw new Error('Stripe has not confirmed this event payment yet.');
    if (Number(session.amount_total) !== Number(payment.amount_due_cents)) throw new Error('Stripe payment amount does not match the event fee.');
    const intent = session.payment_intent;
    const charge = typeof intent === 'object' ? intent?.latest_charge : null;
    const { data: finalized, error: finalizeError } = await serviceClient.rpc('finalize_event_fee_payment', {
      p_payment_id: payment.id,
      p_checkout_session_id: session.id,
      p_payment_intent_id: typeof intent === 'string' ? intent : intent?.id || '',
      p_charge_id: typeof charge === 'string' ? charge : charge?.id || '',
      p_amount_paid_cents: Number(session.amount_total),
      p_receipt_url: typeof charge === 'object' ? charge?.receipt_url || null : null
    });
    if (finalizeError) throw finalizeError;
    return json(request, { payment: finalized });
  } catch (error) {
    console.error('Event fee Checkout completion failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
