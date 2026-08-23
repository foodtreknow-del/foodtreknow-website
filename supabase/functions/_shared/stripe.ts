function secretKey() {
  const value = Deno.env.get('STRIPE_SECRET_KEY');
  if (!value) throw new Error('Stripe is not configured for this environment.');
  if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
    throw new Error('Stripe is configured with an invalid server key.');
  }
  return value;
}

type StripeOptions = {
  method?: 'GET' | 'POST';
  form?: URLSearchParams;
  idempotencyKey?: string;
};

export async function stripeRequest<T>(path: string, options: StripeOptions = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer ${secretKey()}` };
  if (options.form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method || (options.form ? 'POST' : 'GET'),
    headers,
    body: options.form?.toString()
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not complete the request.');
  return payload as T;
}

export function applicationUrl(kind: 'return' | 'refresh') {
  const configured = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000';
  const url = new URL(configured);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('stripe', kind);
  return url.toString();
}

export type StripeAccount = {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    disabled_reason?: string | null;
  };
};

export function safeAccountState(account: StripeAccount) {
  const requirements = account.requirements?.currently_due || [];
  const disabledReason = account.requirements?.disabled_reason || null;
  let status = 'onboarding_required';
  if (account.charges_enabled && account.payouts_enabled) status = 'active';
  else if (disabledReason) status = 'restricted';
  else if (account.details_submitted) status = 'pending';
  return {
    status,
    details_submitted: Boolean(account.details_submitted),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    requirements_due: requirements,
    disabled_reason: disabledReason,
    connected_at: status === 'active' ? new Date().toISOString() : null,
    last_synced_at: new Date().toISOString()
  };
}
