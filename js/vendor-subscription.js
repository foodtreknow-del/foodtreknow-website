(function exposeVendorSubscriptionBilling() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const field = id => document.getElementById(id);
  let currentState = { status: 'not_started', access_allowed: false, has_customer: false };
  const states = {
    not_started: { badge: 'Subscription required', title: 'Activate your vendor account', message: 'Subscribe for $14.99 per month to use FoodTrekNow vendor operations.' },
    incomplete: { badge: 'Action needed', title: 'Finish subscription checkout', message: 'Stripe still needs payment information before your vendor account can be activated.' },
    incomplete_expired: { badge: 'Checkout expired', title: 'Start subscription again', message: 'The previous checkout expired before payment was completed.' },
    trialing: { badge: 'Trial active', title: 'Vendor account active', message: 'Your FoodTrekNow vendor subscription is currently in its trial period.' },
    active: { badge: 'Active', title: '$14.99 monthly plan active', message: 'Your vendor account has full access to FoodTrekNow operations.' },
    past_due: { badge: 'Payment past due', title: 'Update your payment method', message: 'Stripe could not collect the renewal. Update billing before the seven-day grace period ends.' },
    unpaid: { badge: 'Access paused', title: 'Subscription payment required', message: 'Vendor operations are paused until the outstanding subscription payment is resolved.' },
    canceled: { badge: 'Canceled', title: 'Restart your subscription', message: 'Subscribe again to restore FoodTrekNow vendor operations.' },
    paused: { badge: 'Paused', title: 'Subscription paused', message: 'Open billing management to restore your vendor subscription.' }
  };

  function secureVendorSignedIn() { return Boolean(client && localStorage.getItem('ftnVendorLoggedIn') === 'supabase'); }
  function normalizeStatus(value) { return Object.hasOwn(states, value) ? value : 'not_started'; }
  function dateLabel(value) { return !value || Number.isNaN(Date.parse(value)) ? '' : new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }

  function setBusy(busy, label = '') {
    const subscribe = field('startVendorSubscriptionButton');
    const manage = field('manageVendorBillingButton');
    const refresh = field('refreshVendorSubscriptionButton');
    if (subscribe) {
      subscribe.disabled = busy || !secureVendorSignedIn() || ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'].includes(currentState.status);
      subscribe.textContent = busy && label ? label : ['canceled', 'incomplete_expired'].includes(currentState.status) ? 'Restart Subscription' : 'Subscribe for $14.99/month';
    }
    if (manage) manage.disabled = busy || !secureVendorSignedIn() || !currentState.has_customer;
    if (refresh) refresh.disabled = busy || !secureVendorSignedIn();
  }

  function renderState(rawState = {}) {
    const status = normalizeStatus(rawState.status);
    currentState = { ...rawState, status, access_allowed: Boolean(rawState.access_allowed), has_customer: Boolean(rawState.has_customer) };
    const copy = states[status];
    const badge = field('vendorSubscriptionBadge');
    if (badge) { badge.textContent = copy.badge; badge.className = `stripe-status-badge subscription-${status.replaceAll('_', '-')}`; }
    if (field('vendorSubscriptionTitle')) field('vendorSubscriptionTitle').textContent = copy.title;
    if (field('vendorSubscriptionMessage')) field('vendorSubscriptionMessage').textContent = copy.message;
    const detail = field('vendorSubscriptionDetail');
    if (detail) {
      if (status === 'past_due' && rawState.grace_period_ends_at) detail.textContent = `Grace period ends ${dateLabel(rawState.grace_period_ends_at)}.`;
      else if (rawState.cancel_at_period_end && rawState.current_period_end) detail.textContent = `Access remains active through ${dateLabel(rawState.current_period_end)}.`;
      else if (['active', 'trialing'].includes(status) && rawState.current_period_end) detail.textContent = `Next billing date: ${dateLabel(rawState.current_period_end)}.`;
      else detail.textContent = 'Monthly subscription · Cancel through Stripe billing management.';
    }
    field('vendorSubscriptionGate')?.classList.toggle('hidden-view', currentState.access_allowed || !secureVendorSignedIn());
    window.dispatchEvent(new CustomEvent('ftn:vendor-subscription', { detail: currentState }));
    setBusy(false);
    return currentState;
  }

  async function invoke(functionName) {
    if (!client?.functions?.invoke) throw new Error('Secure vendor billing is unavailable.');
    const { data, error } = await client.functions.invoke(functionName, { body: {} });
    if (error) {
      let message = data?.error || '';
      if (!message && error.context?.json) {
        try { message = (await error.context.json())?.error || ''; } catch (_) { /* Response body was unavailable. */ }
      }
      throw new Error(message || error.message || 'Stripe could not complete the request.');
    }
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  function verifiedStripeUrl(value) {
    const destination = new URL(value);
    if (destination.protocol !== 'https:' || !(destination.hostname === 'stripe.com' || destination.hostname.endsWith('.stripe.com'))) throw new Error('Stripe returned an invalid billing address.');
    return destination.toString();
  }

  async function refreshStatus() {
    const errorNode = field('vendorSubscriptionError');
    if (errorNode) errorNode.textContent = '';
    if (!secureVendorSignedIn()) return renderState({ status: 'not_started', access_allowed: false, has_customer: false });
    setBusy(true, 'Checking…');
    try { return renderState(await invoke('stripe-vendor-subscription-status')); }
    catch (error) { if (errorNode) errorNode.textContent = error.message; throw error; }
    finally { setBusy(false); }
  }

  async function startSubscription() {
    const errorNode = field('vendorSubscriptionError');
    if (errorNode) errorNode.textContent = '';
    setBusy(true, 'Opening Stripe…');
    try { const data = await invoke('stripe-vendor-subscription-start'); window.location.assign(verifiedStripeUrl(data.checkoutUrl)); }
    catch (error) { if (errorNode) errorNode.textContent = error.message; setBusy(false); }
  }

  async function manageBilling() {
    const errorNode = field('vendorSubscriptionError');
    if (errorNode) errorNode.textContent = '';
    setBusy(true, 'Opening Billing…');
    try { const data = await invoke('stripe-vendor-billing-portal'); window.location.assign(verifiedStripeUrl(data.portalUrl)); }
    catch (error) { if (errorNode) errorNode.textContent = error.message; setBusy(false); }
  }

  async function handleBillingReturn() {
    const pageUrl = new URL(window.location.href);
    const result = pageUrl.searchParams.get('billing');
    if (!['success', 'cancelled', 'return'].includes(result) || !secureVendorSignedIn()) return;
    document.querySelector('[data-page="settings"]')?.click();
    pageUrl.searchParams.delete('billing'); pageUrl.searchParams.delete('session_id');
    window.history.replaceState({}, '', pageUrl.toString());
    if (field('vendorSubscriptionError')) field('vendorSubscriptionError').textContent = result === 'cancelled' ? 'Subscription checkout was canceled. No charge was made.' : '';
    await refreshStatus().catch(() => {});
  }

  field('startVendorSubscriptionButton')?.addEventListener('click', startSubscription);
  field('manageVendorBillingButton')?.addEventListener('click', manageBilling);
  field('refreshVendorSubscriptionButton')?.addEventListener('click', () => refreshStatus().catch(() => {}));
  field('vendorSubscriptionGateButton')?.addEventListener('click', () => document.querySelector('[data-page="settings"]')?.click());
  document.querySelector('[data-page="settings"]')?.addEventListener('click', () => refreshStatus().catch(() => {}));
  renderState(currentState);
  window.setTimeout(handleBillingReturn, 650);
  window.FoodTrekNowVendorSubscription = Object.freeze({ normalizeStatus, renderState, refreshStatus, startSubscription, manageBilling });
  if (secureVendorSignedIn()) window.setTimeout(() => refreshStatus().catch(() => {}), 750);
})();
