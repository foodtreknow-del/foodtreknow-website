import { createClient } from 'npm:@supabase/supabase-js@2';

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string) {
  const values = signatureHeader.split(',').map(value => value.split('='));
  const timestamp = values.find(([key]) => key === 't')?.[1] || '';
  const signatures = values.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requiredEnvironment('STRIPE_WEBHOOK_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some(signature => safeEqual(signature, expected));
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  if (!await verifyStripeSignature(rawBody, signature)) return new Response('Invalid signature', { status: 400 });
  const serviceClient = createClient(requiredEnvironment('SUPABASE_URL'), requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); } catch { return new Response('Invalid payload', { status: 400 }); }
  const { data: existing } = await serviceClient.from('stripe_webhook_events').select('processed_at').eq('id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { 'Content-Type': 'application/json' } });
  await serviceClient.from('stripe_webhook_events').upsert({
    id: event.id,
    event_type: event.type,
    stripe_account_id: event.account || null,
    error_message: null
  }, { onConflict: 'id' });
  try {
    const session = event.data?.object;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const draftId = session?.metadata?.foodtreknow_draft_id;
      if (draftId && session.payment_status === 'paid') {
        const { data: draft, error: draftError } = await serviceClient.from('payment_checkout_drafts')
          .select('*').eq('id', draftId).eq('stripe_checkout_session_id', session.id).single();
        if (draftError || !draft) throw new Error('Webhook checkout draft was not found.');
        if (event.account && event.account !== draft.stripe_account_id) throw new Error('Webhook connected account did not match.');
        const { error: finalizeError } = await serviceClient.rpc('finalize_paid_checkout', {
          p_draft_id: draft.id,
          p_checkout_session_id: session.id,
          p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
          p_charge_id: '',
          p_amount_paid_cents: Number(session.amount_total),
          p_payment_label: 'Stripe Checkout'
        });
        if (finalizeError) throw finalizeError;
      }
    } else if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
      const { data: expiringDraft } = await serviceClient.from('payment_checkout_drafts')
        .select('id').eq('stripe_checkout_session_id', session.id).is('order_id', null).maybeSingle();
      if (expiringDraft?.id) await serviceClient.rpc('release_checkout_credit', { p_draft_id: expiringDraft.id });
      await serviceClient.from('payment_checkout_drafts').update({
        status: event.type === 'checkout.session.expired' ? 'expired' : 'failed'
      }).eq('stripe_checkout_session_id', session.id).is('order_id', null);
    } else if (event.type === 'refund.updated') {
      const refund = event.data?.object;
      const paymentIntentId = typeof refund?.payment_intent === 'string' ? refund.payment_intent : refund?.payment_intent?.id;
      if (paymentIntentId && ['succeeded', 'failed', 'canceled'].includes(refund.status)) {
        const { data: order } = await serviceClient.from('orders').select('id,stripe_account_id')
          .eq('stripe_payment_intent_id', paymentIntentId).maybeSingle();
        if (order) {
          if (event.account && event.account !== order.stripe_account_id) throw new Error('Refund connected account did not match.');
          const { error: refundError } = await serviceClient.rpc('complete_order_refund', {
            p_order_id: order.id,
            p_refund_id: refund.id,
            p_refunded_cents: Number(refund.amount || 0),
            p_succeeded: refund.status === 'succeeded',
            p_failure: refund.status === 'succeeded' ? null : `Stripe refund status: ${refund.status}`
          });
          if (refundError) throw refundError;
        }
      }
    }
    await serviceClient.from('stripe_webhook_events').update({ processed_at: new Date().toISOString(), error_message: null }).eq('id', event.id);
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    console.error('Stripe webhook failed:', message);
    await serviceClient.from('stripe_webhook_events').update({ error_message: message }).eq('id', event.id);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
