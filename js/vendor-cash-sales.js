(function exposeVendorCashSales() {
  'use strict';

  const button = document.getElementById('newCashSaleButton');
  const modal = document.getElementById('cashSaleModal');
  const form = document.getElementById('cashSaleForm');
  if (!button || !modal || !form) return;

  const field = id => document.getElementById(id);
  const text = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const cashMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  let selectedQuantities = new Map();

  function availableItems() {
    return (typeof menuItems === 'undefined' ? [] : menuItems)
      .filter(item => item.available !== false && item.databaseId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function totals() {
    const items = availableItems();
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(selectedQuantities.get(String(item.databaseId)) || 0), 0);
    const taxRate = Number(activeVendorContext?.truck?.tax_rate || 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const received = Number(field('cashSaleReceived').value || 0);
    return { subtotal, tax, total, received, change: Math.max(0, Math.round((received - total) * 100) / 100) };
  }

  function renderTotals() {
    const values = totals();
    field('cashSaleSubtotal').textContent = cashMoney(values.subtotal);
    field('cashSaleTax').textContent = cashMoney(values.tax);
    field('cashSaleTotal').textContent = cashMoney(values.total);
    field('cashSaleChange').textContent = cashMoney(values.change);
    field('cashSaleExactButton').disabled = values.total <= 0;
  }

  function renderItems() {
    const items = availableItems();
    field('cashSaleItems').innerHTML = items.length ? items.map(item => {
      const id = String(item.databaseId);
      return `<div class="cash-sale-item"><div><strong>${text(item.name)}</strong><small>${text(item.category || 'Menu')} · ${cashMoney(item.price)}</small></div><label><span>Quantity</span><input class="cash-sale-quantity" data-cash-menu-id="${text(id)}" type="number" min="0" max="99" step="1" value="${Number(selectedQuantities.get(id) || 0)}" inputmode="numeric"></label></div>`;
    }).join('') : '<div class="cash-sale-empty"><strong>No available menu items.</strong><p>Add or enable a menu item before recording a cash sale.</p></div>';
    field('cashSaleSubmitButton').disabled = !items.length;
  }

  function open() {
    if (!activeVendorContext?.truck?.id || localStorage.getItem('ftnVendorLoggedIn') !== 'supabase') {
      notify('Sign in with an approved vendor account to record a cash sale.');
      return;
    }
    selectedQuantities = new Map();
    form.reset();
    field('cashSaleCustomer').value = 'Walk-up Customer';
    field('cashSaleError').textContent = '';
    renderItems();
    renderTotals();
    modal.classList.remove('hidden');
    setTimeout(() => field('cashSaleItems').querySelector('input')?.focus(), 50);
  }

  function close() {
    modal.classList.add('hidden');
    field('cashSaleError').textContent = '';
  }

  button.addEventListener('click', open);
  field('closeCashSaleModal').addEventListener('click', close);
  field('cancelCashSaleButton').addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) close(); });

  field('cashSaleItems').addEventListener('input', event => {
    const input = event.target.closest('[data-cash-menu-id]');
    if (!input) return;
    const quantity = Math.min(99, Math.max(0, Math.trunc(Number(input.value) || 0)));
    input.value = String(quantity);
    selectedQuantities.set(input.dataset.cashMenuId, quantity);
    renderTotals();
  });
  field('cashSaleReceived').addEventListener('input', renderTotals);
  field('cashSaleExactButton').addEventListener('click', () => {
    field('cashSaleReceived').value = totals().total.toFixed(2);
    renderTotals();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const error = field('cashSaleError');
    const submit = field('cashSaleSubmitButton');
    const items = availableItems().map(item => ({
      menuItemId: item.databaseId,
      quantity: Number(selectedQuantities.get(String(item.databaseId)) || 0)
    })).filter(item => item.quantity > 0);
    const values = totals();
    error.textContent = '';
    if (!items.length) { error.textContent = 'Select at least one menu item.'; return; }
    if (!Number.isFinite(values.received) || values.received < values.total) {
      error.textContent = `Enter at least ${cashMoney(values.total)} as cash received.`;
      field('cashSaleReceived').focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Saving Cash Sale…';
    try {
      const sale = await window.FoodTrekNowLiveOrders.placeVendorCashSale({
        truckId: activeVendorContext.truck.id,
        items,
        customerName: field('cashSaleCustomer').value,
        orderNotes: field('cashSaleNotes').value,
        cashReceived: values.received
      });
      close();
      await hydrateVendorOrders(activeVendorContext);
      window.dispatchEvent(new CustomEvent('ftn:vendor-orders-updated'));
      notify(`Cash sale #${sale.order_number} saved · Change ${cashMoney(sale.cash_change)}.`);
    } catch (saleError) {
      error.textContent = saleError.message || 'The cash sale could not be saved.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Save Paid Cash Sale';
    }
  });
})();
