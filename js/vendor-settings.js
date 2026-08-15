(() => {
  'use strict';

  const SETTINGS_STORAGE_KEY = 'ftnVendorSettingsV1';
  const SOUND_STORAGE_KEY = 'ftnVendorSound';
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const standardHours = Object.fromEntries(dayNames.map(day => [day.toLowerCase(), { enabled: day !== 'Sunday', open: '11:00', close: day === 'Friday' || day === 'Saturday' ? '21:00' : '20:00' }]));
  const defaults = {
    profile: { truckName: 'Capital City Eats', cuisine: 'American favorites · Burgers · Tacos', description: 'Fresh-made comfort food, local favorites, and fast pickup from the heart of the city.', phone: '(919) 555-0147', email: 'vendor@foodtreknow.com', website: '', street: '', city: 'Raleigh', state: 'NC', zip: '27601', logo: '' },
    operations: { acceptingOrders: true, prepTime: 20, minimumOrder: 0, taxRate: 6, pickupInstructions: 'Look for the FoodTrekNow pickup sign at the service window.' },
    hours: standardHours,
    payments: { creditCard: true, applePay: true, googlePay: true, cashApp: true, payAtPickup: false },
    notifications: { orderSound: true, emailOrders: true, smsOrders: false, pushOrders: false, dailySummary: true }
  };
  let vendorSettings = loadSettings();
  let pendingLogo = vendorSettings.profile.logo || '';

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function normalizeSettings(value = {}) {
    const base = cloneDefaults();
    return {
      profile: { ...base.profile, ...(value.profile || {}) },
      operations: { ...base.operations, ...(value.operations || {}) },
      hours: Object.fromEntries(dayNames.map(day => { const key = day.toLowerCase(); return [key, { ...base.hours[key], ...(value.hours?.[key] || {}) }]; })),
      payments: { ...base.payments, ...(value.payments || {}) },
      notifications: { ...base.notifications, ...(value.notifications || {}) }
    };
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return normalizeSettings(JSON.parse(saved));
      const initial = cloneDefaults();
      initial.notifications.orderSound = localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
      return initial;
    } catch {
      return cloneDefaults();
    }
  }

  function saveSettings(value) {
    const normalized = normalizeSettings(value);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function validateSettings(value) {
    const errors = [];
    if (!value.profile.truckName.trim()) errors.push('Truck name is required.');
    if (!value.profile.cuisine.trim()) errors.push('Cuisine is required.');
    if (!/^\S+@\S+\.\S+$/.test(value.profile.email)) errors.push('Enter a valid business email.');
    if (!value.profile.phone.trim()) errors.push('Business phone is required.');
    if (value.operations.prepTime < 5 || value.operations.prepTime > 120) errors.push('Prep time must be between 5 and 120 minutes.');
    if (value.operations.taxRate < 0 || value.operations.taxRate > 25) errors.push('Sales tax must be between 0% and 25%.');
    if (value.operations.minimumOrder < 0) errors.push('Minimum order cannot be negative.');
    Object.entries(value.hours).forEach(([day, hours]) => { if (hours.enabled && (!hours.open || !hours.close || hours.open >= hours.close)) errors.push(`${day[0].toUpperCase()}${day.slice(1)} hours need a closing time after opening.`); });
    if (!Object.values(value.payments).some(Boolean)) errors.push('Select at least one accepted payment method.');
    return errors;
  }

  function field(id) {
    return document.getElementById(id);
  }

  function setValue(id, value) {
    const node = field(id);
    if (node) node.value = value ?? '';
  }

  function setChecked(id, value) {
    const node = field(id);
    if (node) node.checked = Boolean(value);
  }

  function renderLogo(settings = vendorSettings) {
    const preview = field('vendorLogoPreview');
    if (!preview) return;
    const logo = pendingLogo || settings.profile.logo;
    preview.innerHTML = logo ? `<img src="${logo}" alt="Vendor logo preview">` : (settings.profile.truckName?.trim()?.[0] || 'V').toUpperCase();
    field('removeVendorLogoButton').disabled = !logo;
  }

  function toggleHoursRow(day) {
    const key = day.toLowerCase();
    const enabled = field(`hours${day}Enabled`)?.checked;
    const open = field(`hours${day}Open`);
    const close = field(`hours${day}Close`);
    if (open) open.disabled = !enabled;
    if (close) close.disabled = !enabled;
    const row = document.querySelector(`[data-day="${key}"]`);
    row?.classList.toggle('closed', !enabled);
  }

  function populateSettingsForm(settings = vendorSettings) {
    setValue('vendorTruckName', settings.profile.truckName);
    setValue('vendorCuisine', settings.profile.cuisine);
    setValue('vendorDescription', settings.profile.description);
    setValue('vendorPhone', settings.profile.phone);
    setValue('vendorEmail', settings.profile.email);
    setValue('vendorWebsite', settings.profile.website);
    setValue('vendorStreet', settings.profile.street);
    setValue('vendorCity', settings.profile.city);
    setValue('vendorState', settings.profile.state);
    setValue('vendorZip', settings.profile.zip);
    setChecked('vendorAcceptingOrders', settings.operations.acceptingOrders);
    setValue('vendorPrepTime', settings.operations.prepTime);
    setValue('vendorMinimumOrder', settings.operations.minimumOrder);
    setValue('vendorTaxRate', settings.operations.taxRate);
    setValue('vendorPickupInstructions', settings.operations.pickupInstructions);
    dayNames.forEach(day => {
      const hours = settings.hours[day.toLowerCase()];
      setChecked(`hours${day}Enabled`, hours.enabled);
      setValue(`hours${day}Open`, hours.open);
      setValue(`hours${day}Close`, hours.close);
      toggleHoursRow(day);
    });
    setChecked('paymentCreditCard', settings.payments.creditCard);
    setChecked('paymentApplePay', settings.payments.applePay);
    setChecked('paymentGooglePay', settings.payments.googlePay);
    setChecked('paymentCashApp', settings.payments.cashApp);
    setChecked('paymentAtPickup', settings.payments.payAtPickup);
    setChecked('notificationOrderSound', settings.notifications.orderSound);
    setChecked('notificationEmailOrders', settings.notifications.emailOrders);
    setChecked('notificationSmsOrders', settings.notifications.smsOrders);
    setChecked('notificationPushOrders', settings.notifications.pushOrders);
    setChecked('notificationDailySummary', settings.notifications.dailySummary);
    pendingLogo = settings.profile.logo || '';
    renderLogo(settings);
  }

  function readSettingsForm() {
    return normalizeSettings({
      profile: { truckName: field('vendorTruckName').value.trim(), cuisine: field('vendorCuisine').value.trim(), description: field('vendorDescription').value.trim(), phone: field('vendorPhone').value.trim(), email: field('vendorEmail').value.trim().toLowerCase(), website: field('vendorWebsite').value.trim(), street: field('vendorStreet').value.trim(), city: field('vendorCity').value.trim(), state: field('vendorState').value.trim().toUpperCase(), zip: field('vendorZip').value.trim(), logo: pendingLogo },
      operations: { acceptingOrders: field('vendorAcceptingOrders').checked, prepTime: Number(field('vendorPrepTime').value), minimumOrder: Number(field('vendorMinimumOrder').value), taxRate: Number(field('vendorTaxRate').value), pickupInstructions: field('vendorPickupInstructions').value.trim() },
      hours: Object.fromEntries(dayNames.map(day => [day.toLowerCase(), { enabled: field(`hours${day}Enabled`).checked, open: field(`hours${day}Open`).value, close: field(`hours${day}Close`).value }])),
      payments: { creditCard: field('paymentCreditCard').checked, applePay: field('paymentApplePay').checked, googlePay: field('paymentGooglePay').checked, cashApp: field('paymentCashApp').checked, payAtPickup: field('paymentAtPickup').checked },
      notifications: { orderSound: field('notificationOrderSound').checked, emailOrders: field('notificationEmailOrders').checked, smsOrders: field('notificationSmsOrders').checked, pushOrders: field('notificationPushOrders').checked, dailySummary: field('notificationDailySummary').checked }
    });
  }

  function applyVendorSettings(settings = vendorSettings) {
    const onlineToggle = field('onlineToggle');
    if (onlineToggle) onlineToggle.checked = Boolean(settings.operations.acceptingOrders);
    const statusText = field('statusText');
    if (statusText) statusText.textContent = settings.operations.acceptingOrders ? 'Online' : 'Offline';
    const statusDot = field('statusDot');
    if (statusDot) statusDot.className = `status-dot ${settings.operations.acceptingOrders ? 'online' : 'offline'}`;
    const previewTitle = field('customerPreviewTitle');
    if (previewTitle) previewTitle.textContent = `${settings.profile.truckName} Menu`;
    const dashboardButton = document.querySelector('[data-page="dashboard"]');
    if (dashboardButton?.classList.contains('active')) field('pageTitle').textContent = settings.profile.truckName;
    localStorage.setItem(SOUND_STORAGE_KEY, settings.notifications.orderSound ? 'on' : 'off');
    try {
      if (typeof soundOn !== 'undefined') soundOn = settings.notifications.orderSound;
      if (typeof updateSoundButton === 'function') updateSoundButton();
    } catch {}
  }

  function setMessage(message, type = '') {
    const node = field('vendorSettingsMessage');
    if (!node) return;
    node.textContent = message;
    node.className = `settings-message${type ? ` ${type}` : ''}`;
  }

  const form = field('vendorSettingsForm');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const candidate = readSettingsForm();
    const errors = validateSettings(candidate);
    if (errors.length) {
      setMessage(errors[0], 'error');
      field('vendorSettingsMessage')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    vendorSettings = saveSettings(candidate);
    pendingLogo = vendorSettings.profile.logo;
    applyVendorSettings(vendorSettings);
    setMessage('Settings saved successfully.', 'success');
    const saveState = field('settingsSaveState');
    if (saveState) saveState.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (typeof notify === 'function') notify('Vendor settings saved');
  });

  dayNames.forEach(day => field(`hours${day}Enabled`)?.addEventListener('change', () => toggleHoursRow(day)));
  field('vendorLogoInput')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG, or WEBP image under 2 MB.', 'error');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { pendingLogo = String(reader.result || ''); renderLogo(); setMessage('Image ready. Save settings to keep it.', 'success'); };
    reader.readAsDataURL(file);
  });
  field('removeVendorLogoButton')?.addEventListener('click', () => { pendingLogo = ''; renderLogo(); setMessage('Image removed. Save settings to confirm.', 'success'); });
  field('restoreVendorDefaultsButton')?.addEventListener('click', () => {
    if (!window.confirm('Restore all vendor settings to their defaults?')) return;
    vendorSettings = cloneDefaults();
    pendingLogo = '';
    populateSettingsForm(vendorSettings);
    setMessage('Defaults restored. Save settings to confirm.', 'success');
  });
  field('vendorAcceptingOrders')?.addEventListener('change', event => {
    const toggle = field('onlineToggle');
    if (toggle) { toggle.checked = event.target.checked; toggle.dispatchEvent?.(new Event('change')); }
  });
  field('onlineToggle')?.addEventListener('change', event => {
    vendorSettings.operations.acceptingOrders = event.target.checked;
    vendorSettings = saveSettings(vendorSettings);
    setChecked('vendorAcceptingOrders', event.target.checked);
  });
  field('notificationOrderSound')?.addEventListener('change', event => {
    localStorage.setItem(SOUND_STORAGE_KEY, event.target.checked ? 'on' : 'off');
  });
  document.querySelector('[data-page="settings"]')?.addEventListener('click', () => { vendorSettings = loadSettings(); populateSettingsForm(vendorSettings); setMessage(''); });
  document.querySelector('[data-page="dashboard"]')?.addEventListener('click', () => applyVendorSettings(vendorSettings));

  populateSettingsForm(vendorSettings);
  applyVendorSettings(vendorSettings);
  window.FoodTrekNowVendorSettings = { defaults: cloneDefaults, normalizeSettings, validateSettings, loadSettings, saveSettings, applyVendorSettings };
})();
