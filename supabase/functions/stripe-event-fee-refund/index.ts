import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowed = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin' } }); }
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function authenticatedHost(request: Request) { const authorization = request.headers.get('Authorization'); if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with a Host account.'); const url = requiredEnvironment('SUPABASE_URL'); const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } }); const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7).trim()); if (userError || !userData.user) throw new Error('Your Host session has expired. Please sign in again.'); const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } }); const { data: host, error } = await serviceClient.from('location_hosts').select('id').eq('owner_id', userData.user.id).single(); if (error || !host) throw new Error('Only the event Host can issue this refund.'); return { serviceClient, host }; }
async function stripeRequest<T>(path: string, form: URLSearchParams, stripeAccountId: string, idempotencyKey: string) { const response = await fetch(`https://api.stripe.com${path}`, { method: 'POST', headers: { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Account': stripeAccountId, 'Idempotency-Key': idempotencyKey }, body: form.toString() }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not refund the event payment.'); return payload as T; }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, host } = await authenticatedHost(request);
    const body = await request.json().catch(() => ({}));
    if (body.confirmed !== true) throw new Error('Confirm the full event-fee refund before continuing.');
    const paymentId = String(body.paymentId || '');
    const { data: payment, error: paymentError } = await serviceClient.from('event_fee_payments')
      .select('*').eq('id', paymentId).eq('host_id', host.id).single();
    if (paymentError || !payment) throw new Error('This event payment does not belong to your Host account.');
    if (payment.status === 'refunded') return json(request, { payment });
    if (payment.status !== 'paid' || !payment.stripe_payment_intent_id || !payment.stripe_account_id) {
      throw new Error('Only a completed event payment can be refunded.');
    }
    const form = new URLSearchParams();
    form.set('payment_intent', payment.stripe_payment_intent_id);
    form.set('amount', String(payment.amount_due_cents));
    form.set('metadata[foodtreknow_event_fee_payment_id]', payment.id);
    const refund = await stripeRequest<Record<string, any>>('/v1/refunds', form, payment.stripe_account_id, `foodtreknow-event-fee-refund-${payment.id}`);
    const succeeded = refund.status === 'succeeded';
    const { data: finalized, error: finalizeError } = await serviceClient.rpc('complete_event_fee_refund', {
      p_payment_id: payment.id,
      p_refund_id: refund.id,
      p_refunded_cents: Number(refund.amount || 0),
      p_succeeded: succeeded,
      p_failure: succeeded ? null : `Stripe refund status: ${refund.status}`
    });
    if (finalizeError) throw finalizeError;
    if (!succeeded) {
      await serviceClient.from('event_fee_payments').update({ status: 'refund_pending', stripe_refund_id: refund.id }).eq('id', payment.id);
    }
    return json(request, { payment: finalized, refundStatus: refund.status });
  } catch (error) {
    console.error('Event fee refund failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
