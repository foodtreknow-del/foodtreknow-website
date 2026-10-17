(function exposeVendorCashSales() {
  'use strict';

  const button = document.getElementById('newCashSaleButton');
  const modal = document.getElementById('cashSaleModal');
  const form = document.getElementById('cashSaleForm');
  if (!button || !modal || !form) return;

  const field = id => document.getElementById(id);
  const text = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const cashMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const validOptions = options => {
    const seen = new Set();
    return (Array.isArray(options) ? options : [])
      .map(option => ({ name: String(option?.name || '').trim(), price: Number(option?.price || 0) }))
      .filter(option => {
        const key = option.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!option.name || !Number.isFinite(option.price) || option.price < 0 || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const STANDARD_CONDIMENTS = ['Ketchup', 'Yellow Mustard', 'Brown Mustard', 'Mayonnaise', 'Pickles', 'Onions', 'Relish', 'Salt', 'Pepper'];
  const MILKSHAKE_FLAVORS = ['Vanilla', 'Strawberry', 'Chocolate'];
  const itemKey = item => String(item?.databaseId || item?.id || '');
  const itemName = item => String(item?.name || '').trim().toLocaleLowerCase();
  let selectedItems = new Map();

  function availableItems() {
    return (typeof menuItems === 'undefined' ? [] : menuItems)
      .filter(item => item.available !== false && itemKey(item))
      .sort((a, b) => String(a.category || '').localeCompare(String(b.category || '')) || Number(a.order || 0) - Number(b.order || 0));
  }

  function customerEquivalentChoices(item) {
    const name = itemName(item);
    const milkshake = /\bmilk\s*shakes?\b/.test(name);
    const hotDog = /\bhot\s*dogs?\b/.test(name);
    const cheeseburger = /\bcheese\s*burgers?\b/.test(name);
    const configuredSizes = validOptions(item.sizeOptions);
    const sizes = configuredSizes.length ? configuredSizes : (milkshake
      ? ['Small', 'Medium', 'Large'].map(size => ({ name: size, price: Number(item.price || 0) }))
      : []);
    const configuredAddOns = validOptions(item.addOns);
    const addOns = configuredAddOns.length ? configuredAddOns : ((hotDog || cheeseburger)
      ? [...STANDARD_CONDIMENTS, ...(cheeseburger ? ['No Cheese'] : [])].map(option => ({ name: option, price: 0 }))
      : []);
    return {
      sizes,
      flavors: milkshake ? MILKSHAKE_FLAVORS.map(flavor => ({ name: flavor, price: 0 })) : [],
      addOns,
      addOnLabel: String(item.addOnLabel || (hotDog || cheeseburger ? 'Choose Condiments' : 'Add-ons')).trim() || 'Add-ons'
    };
  }

  function selectionFor(item) {
    const id = itemKey(item);
    if (!selectedItems.has(id)) {
      const choices = customerEquivalentChoices(item);
      selectedItems.set(id, { quantity: 0, sizeName: choices.sizes[0]?.name || '', flavorName: choices.flavors[0]?.name || '', addOnNames: [], instructions: '' });
    }
    return selectedItems.get(id);
  }

  function unitPrice(item) {
    const selection = selectionFor(item);
    const choices = customerEquivalentChoices(item);
    const size = choices.sizes.find(option => option.name === selection.sizeName);
    const addOnTotal = choices.addOns
      .filter(option => selection.addOnNames.includes(option.name))
      .reduce((sum, option) => sum + option.price, 0);
    return Number(size ? size.price : item.price || 0) + addOnTotal;
  }

  function totals() {
    const subtotal = availableItems().reduce((sum, item) => sum + unitPrice(item) * selectionFor(item).quantity, 0);
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

  function optionPrice(price, absolute = false) {
    return absolute ? cashMoney(price) : (Number(price) > 0 ? `+${cashMoney(price)}` : 'Included');
  }

  function itemMarkup(item) {
    const id = itemKey(item);
    const selection = selectionFor(item);
    const { sizes, flavors, addOns, addOnLabel } = customerEquivalentChoices(item);
    const sizeMarkup = sizes.length ? `<fieldset class="cash-sale-options"><legend>Choose a Size <span>Required</span></legend>${sizes.map((option, index) => `<label><input type="radio" name="cash-size-${text(id)}" data-cash-menu-id="${text(id)}" data-cash-control="size" data-option-name="${text(option.name)}" ${selection.sizeName === option.name || (!selection.sizeName && index === 0) ? 'checked' : ''}><span><strong>${text(option.name)}</strong><small>${optionPrice(option.price, true)}</small></span></label>`).join('')}</fieldset>` : '';
    const flavorMarkup = flavors.length ? `<fieldset class="cash-sale-options"><legend>Choose a Flavor <span>Required</span></legend>${flavors.map((option, index) => `<label><input type="radio" name="cash-flavor-${text(id)}" data-cash-menu-id="${text(id)}" data-cash-control="flavor" data-option-name="${text(option.name)}" ${selection.flavorName === option.name || (!selection.flavorName && index === 0) ? 'checked' : ''}><span><strong>${text(option.name)}</strong><small>Included</small></span></label>`).join('')}</fieldset>` : '';
    const addOnMarkup = addOns.length ? `<fieldset class="cash-sale-options"><legend>${text(addOnLabel)} <span>Optional</span></legend>${addOns.map(option => `<label><input type="checkbox" data-cash-menu-id="${text(id)}" data-cash-control="addon" data-option-name="${text(option.name)}" ${selection.addOnNames.includes(option.name) ? 'checked' : ''}><span><strong>${text(option.name)}</strong><small>${optionPrice(option.price)}</small></span></label>`).join('')}</fieldset>` : '';
    return `<article class="cash-sale-item" data-cash-item="${text(id)}">
      <div class="cash-sale-item-heading">
        ${item.image ? `<img src="${text(item.image)}" alt="">` : ''}
        <div><strong>${text(item.name)}</strong>${item.description ? `<p>${text(item.description)}</p>` : ''}<small>${sizes.length ? `From ${cashMoney(Math.min(...sizes.map(option => option.price)))}` : cashMoney(item.price)}</small></div>
        <label class="cash-sale-quantity-label"><span>Quantity</span><input class="cash-sale-quantity" data-cash-menu-id="${text(id)}" data-cash-control="quantity" type="number" min="0" max="99" step="1" value="${selection.quantity}" inputmode="numeric"></label>
      </div>
      ${(sizeMarkup || flavorMarkup || addOnMarkup) ? `<div class="cash-sale-customization">${sizeMarkup}${flavorMarkup}${addOnMarkup}</div>` : ''}
      <label class="cash-sale-instructions"><span>Special instructions <small>(optional)</small></span><input type="text" maxlength="500" data-cash-menu-id="${text(id)}" data-cash-control="instructions" value="${text(selection.instructions)}" placeholder="Example: Sauce on the side"></label>
      <div class="cash-sale-line-total"><span>Item total</span><strong data-cash-line-total="${text(id)}">${cashMoney(unitPrice(item) * selection.quantity)}</strong></div>
    </article>`;
  }

  function renderItems() {
    const items = availableItems();
    const categories = new Map();
    items.forEach(item => {
      const category = String(item.category || 'Menu').trim() || 'Menu';
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(item);
    });
    const categoryNavigation = [...categories.keys()].map(category => `<button type="button" data-cash-category="${text(category)}">${text(category)}</button>`).join('');
    field('cashSaleItems').innerHTML = items.length ? `<nav class="cash-sale-category-jump" aria-label="Cash sale menu categories">${categoryNavigation}</nav>${[...categories.entries()].map(([category, categoryItems]) => `<section class="cash-sale-category" data-cash-category-section="${text(category)}"><h4>${text(category)}</h4>${categoryItems.map(itemMarkup).join('')}</section>`).join('')}` : '<div class="cash-sale-empty"><strong>No available menu items.</strong><p>Add or enable a menu item before recording a cash sale.</p></div>';
    field('cashSaleSubmitButton').disabled = !items.length;
  }

  function refreshLine(itemId) {
    const item = availableItems().find(entry => String(entry.databaseId) === itemId);
    if (!item) return;
    const line = field('cashSaleItems').querySelector(`[data-cash-line-total="${CSS.escape(itemId)}"]`);
    if (line) line.textContent = cashMoney(unitPrice(item) * selectionFor(item).quantity);
    renderTotals();
  }

  function ensureItemSelected(itemId) {
    const item = availableItems().find(entry => String(entry.databaseId) === itemId);
    if (!item) return null;
    const selection = selectionFor(item);
    if (selection.quantity === 0) {
      selection.quantity = 1;
      const quantityInput = field('cashSaleItems').querySelector(`[data-cash-control="quantity"][data-cash-menu-id="${CSS.escape(itemId)}"]`);
      if (quantityInput) quantityInput.value = '1';
    }
    return selection;
  }

  async function open() {
    if (!activeVendorContext?.truck?.id || localStorage.getItem('ftnVendorLoggedIn') !== 'supabase') {
      notify('Sign in with an approved vendor account to record a cash sale.');
      return;
    }
    selectedItems = new Map();
    form.reset();
    field('cashSaleCustomer').value = 'Walk-up Customer';
    field('cashSaleMobile').value = '';
    field('cashSaleError').textContent = '';
    field('cashSaleItems').innerHTML = '<div class="cash-sale-empty"><strong>Loading the complete menu…</strong></div>';
    modal.classList.remove('hidden');
    button.disabled = true;
    try {
      if (window.FoodTrekNowVendorData?.available) {
        const remote = await window.FoodTrekNowVendorData.loadMenu(activeVendorContext.truck.id);
        if (remote?.items?.length) {
          menuItems = remote.items;
          if (remote.categories?.length) categories = remote.categories;
          localStorage.setItem(vendorStorageKey(MENU_STORAGE_KEY), JSON.stringify(menuItems));
          localStorage.setItem(vendorStorageKey(CATEGORY_STORAGE_KEY), JSON.stringify(categories));
          if (typeof renderMenu === 'function') renderMenu();
        }
      }
    } catch (menuError) {
      field('cashSaleError').textContent = `Menu refresh: ${menuError.message || 'Using the most recently saved menu.'}`;
    } finally {
      button.disabled = false;
    }
    renderItems();
    renderTotals();
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
    const input = event.target.closest('[data-cash-menu-id][data-cash-control]');
    if (!input) return;
    const itemId = input.dataset.cashMenuId;
    const item = availableItems().find(entry => String(entry.databaseId) === itemId);
    if (!item) return;
    const selection = selectionFor(item);
    if (input.dataset.cashControl === 'quantity') {
      selection.quantity = Math.min(99, Math.max(0, Math.trunc(Number(input.value) || 0)));
      input.value = String(selection.quantity);
    } else if (input.dataset.cashControl === 'instructions') {
      selection.instructions = input.value;
    }
    refreshLine(itemId);
  });

  field('cashSaleItems').addEventListener('change', event => {
    const input = event.target.closest('[data-cash-menu-id][data-cash-control]');
    if (!input || !['size', 'flavor', 'addon'].includes(input.dataset.cashControl)) return;
    const selection = ensureItemSelected(input.dataset.cashMenuId);
    if (!selection) return;
    if (input.dataset.cashControl === 'size') selection.sizeName = input.dataset.optionName;
    if (input.dataset.cashControl === 'flavor') selection.flavorName = input.dataset.optionName;
    if (input.dataset.cashControl === 'addon') {
      const names = new Set(selection.addOnNames);
      input.checked ? names.add(input.dataset.optionName) : names.delete(input.dataset.optionName);
      selection.addOnNames = [...names];
    }
    refreshLine(input.dataset.cashMenuId);
  });

  field('cashSaleItems').addEventListener('click', event => {
    const categoryButton = event.target.closest('[data-cash-category]');
    if (!categoryButton) return;
    const section = [...field('cashSaleItems').querySelectorAll('[data-cash-category-section]')]
      .find(candidate => candidate.dataset.cashCategorySection === categoryButton.dataset.cashCategory);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const items = availableItems().map(item => {
      const selection = selectionFor(item);
      const modifiers = [];
      if (selection.sizeName) modifiers.push({ group: 'Choose a Size', name: selection.sizeName });
      if (selection.flavorName) modifiers.push({ group: 'Choose a Flavor', name: selection.flavorName });
      selection.addOnNames.forEach(name => modifiers.push({ group: String(item.addOnLabel || 'Add-ons').trim() || 'Add-ons', name }));
      return { menuItemId: item.databaseId || item.id, quantity: selection.quantity, modifiers, instructions: selection.instructions };
    }).filter(item => item.quantity > 0);
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
        customerMobile: field('cashSaleMobile').value,
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
