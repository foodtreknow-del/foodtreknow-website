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
  let serviceClient: ReturnType<typeof createClient> | null = null;
  let cancellation: Record<string, any> | null = null;
  let stripeRefundCreated = false;
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in to cancel an order.');
    const url = environment('SUPABASE_URL');
    const userClient = createClient(url, environment('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your customer session has expired.');
    serviceClient = createClient(url, environment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await request.json();
    const orderId = String(body.orderId || '');
    const resolution = String(body.resolution || '');
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error('A valid order is required.');
    const { data, error } = await userClient.rpc('begin_customer_paid_cancellation', { p_order_id: orderId, p_resolution: resolution });
    if (error) throw error;
    cancellation = Array.isArray(data) ? data[0] : data;
    if (!cancellation?.order_id) throw new Error('The cancelled order was not returned.');
    if (resolution === 'vendor_credit' || Number(cancellation.stripe_refund_cents) === 0) {
      return json(request, { cancellation, refund: null });
    }

    const form = new URLSearchParams();
    form.set('payment_intent', cancellation.stripe_payment_intent_id);
    form.set('amount', String(cancellation.stripe_refund_cents));
    form.set('reason', 'requested_by_customer');
    form.set('metadata[foodtreknow_order_id]', cancellation.order_id);
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': cancellation.stripe_account_id,
        'Idempotency-Key': `foodtreknow-order-refund-${cancellation.order_id}`
      },
      body: form.toString()
    });
    const refund = await response.json();
    if (!response.ok) throw new Error(refund?.error?.message || 'Stripe could not create the refund.');
    stripeRefundCreated = true;
    let completionError: { message?: string } | null = null;
    if (refund.status === 'succeeded' || ['failed', 'canceled'].includes(refund.status)) {
      const completion = await serviceClient.rpc('complete_order_refund', {
        p_order_id: cancellation.order_id, p_refund_id: refund.id,
        p_refunded_cents: Number(refund.amount || cancellation.stripe_refund_cents),
        p_succeeded: refund.status === 'succeeded',
        p_failure: refund.status === 'succeeded' ? null : `Stripe refund status: ${refund.status}`
      });
      completionError = completion.error;
    } else {
      const pendingUpdate = await serviceClient.from('orders').update({
        stripe_refund_id: refund.id,
        refund_status: 'pending',
        refund_failure_message: null
      }).eq('id', cancellation.order_id);
      completionError = pendingUpdate.error;
    }
    if (completionError) throw completionError;
    return json(request, { cancellation, refund: { id: refund.id, status: refund.status, amountCents: Number(refund.amount) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order cancellation failed.';
    if (serviceClient && cancellation?.order_id && cancellation?.resolution === 'original_payment' && !stripeRefundCreated) {
      await serviceClient.rpc('complete_order_refund', {
        p_order_id: cancellation.order_id, p_refund_id: cancellation.stripe_refund_id || '',
        p_refunded_cents: 0, p_succeeded: false, p_failure: message
      });
    }
    console.error('Paid order cancellation failed:', message);
    return json(request, { error: message }, 400);
  }
});
