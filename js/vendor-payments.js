(function exposeVendorStripeConnection() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const field = id => document.getElementById(id);
  let currentStatus = 'not_connected';
  const copies = {
    not_connected: {
      badge: 'Not connected',
      title: 'Connect Stripe to accept online payments',
      message: 'FoodTrekNow does not hold your order funds. Stripe processes payments for your food truck.'
    },
    onboarding_required: {
      badge: 'Action needed',
      title: 'Finish setting up your Stripe account',
      message: 'Stripe still needs business or banking information before this truck can accept payments.'
    },
    pending: {
      badge: 'Under review',
      title: 'Stripe is reviewing your account',
      message: 'Your information was submitted. Check again later for payment and payout approval.'
    },
    active: {
      badge: 'Connected',
      title: 'Online payments are ready',
      message: 'Customer payments can be processed for this food truck and paid directly through Stripe.'
    },
    restricted: {
      badge: 'Action needed',
      title: 'Stripe needs additional information',
      message: 'Return to Stripe to resolve the account requirement before accepting online payments.'
    }
  };

  function normalizeStatus(value) {
    return Object.hasOwn(copies, value) ? value : 'not_connected';
  }

  function secureVendorSignedIn() {
    return Boolean(client && localStorage.getItem('ftnVendorLoggedIn') === 'supabase');
  }

  function setBusy(busy, label = '') {
    const connect = field('connectStripeButton');
    const refresh = field('refreshStripeStatusButton');
    if (connect) {
      connect.disabled = busy || !secureVendorSignedIn() || currentStatus === 'active';
      connect.textContent = busy && label
        ? label
        : currentStatus === 'not_connected'
          ? 'Connect with Stripe'
          : currentStatus === 'active'
            ? 'Stripe Connected'
            : 'Continue Stripe Setup';
    }
    if (refresh) refresh.disabled = busy || !secureVendorSignedIn();
  }

  function renderState(rawState = {}) {
    const status = normalizeStatus(rawState.status);
    currentStatus = status;
    const copy = copies[status];
    const badge = field('stripeConnectBadge');
    if (badge) {
      badge.textContent = copy.badge;
      badge.className = `stripe-status-badge ${status.replace('_', '-')}`;
    }
    if (field('stripeConnectTitle')) field('stripeConnectTitle').textContent = copy.title;
    if (field('stripeConnectMessage')) field('stripeConnectMessage').textContent = copy.message;
    field('stripeDetailsIndicator')?.classList.toggle('ready', Boolean(rawState.details_submitted));
    field('stripeChargesIndicator')?.classList.toggle('ready', Boolean(rawState.charges_enabled));
    field('stripePayoutsIndicator')?.classList.toggle('ready', Boolean(rawState.payouts_enabled));
    setBusy(false);
    return status;
  }

  async function invoke(functionName) {
    if (!client?.functions?.invoke) throw new Error('Secure Stripe connection is unavailable.');
    const { data, error } = await client.functions.invoke(functionName, { body: {} });
    if (error) throw new Error(data?.error || error.message || 'Stripe could not complete the request.');
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  async function refreshStatus() {
    const errorNode = field('stripeConnectError');
    if (errorNode) errorNode.textContent = '';
    if (!secureVendorSignedIn()) {
      renderState({ status: 'not_connected' });
      if (errorNode) errorNode.textContent = 'Sign in with an approved vendor account to connect Stripe.';
      setBusy(false);
      return { status: 'not_connected' };
    }
    setBusy(true, 'Checking…');
    try {
      const state = await invoke('stripe-connect-status');
      renderState(state);
      return state;
    } catch (error) {
      if (errorNode) errorNode.textContent = error.message;
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function startOnboarding() {
    const errorNode = field('stripeConnectError');
    if (errorNode) errorNode.textContent = '';
    if (!secureVendorSignedIn()) {
      if (errorNode) errorNode.textContent = 'Sign in with an approved vendor account to connect Stripe.';
      setBusy(false);
      return;
    }
    setBusy(true, 'Opening Stripe…');
    try {
      const data = await invoke('stripe-connect-start');
      const destination = new URL(data.onboardingUrl);
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.stripe.com')) {
        throw new Error('Stripe returned an invalid onboarding address.');
      }
      window.location.assign(destination.toString());
    } catch (error) {
      if (errorNode) errorNode.textContent = error.message;
      setBusy(false);
    }
  }

  field('connectStripeButton')?.addEventListener('click', startOnboarding);
  field('refreshStripeStatusButton')?.addEventListener('click', () => refreshStatus().catch(() => {}));
  document.querySelector('[data-page="settings"]')?.addEventListener('click', () => {
    setBusy(false);
    refreshStatus().catch(() => {});
  });

  async function handleStripeReturn() {
    const pageUrl = new URL(window.location.href);
    const action = pageUrl.searchParams.get('stripe');
    if (!['return', 'refresh'].includes(action) || !secureVendorSignedIn()) return;
    document.querySelector('[data-page="settings"]')?.click();
    pageUrl.searchParams.delete('stripe');
    window.history.replaceState({}, '', pageUrl.toString());
    if (action === 'refresh') await startOnboarding();
    else await refreshStatus().catch(() => {});
  }

  setBusy(false);
  renderState({ status: 'not_connected' });
  window.setTimeout(handleStripeReturn, 600);
  window.FoodTrekNowVendorPayments = Object.freeze({ normalizeStatus, renderState, refreshStatus, startOnboarding });
})();
