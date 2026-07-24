(() => {
  'use strict';

  const ACCOUNT_STORAGE_KEY = 'ftnCustomerAccountsV1';
  const PERSISTENT_SESSION_KEY = 'ftnCustomerSessionV1';
  const TEMP_SESSION_KEY = 'ftnCustomerSessionTempV1';
  const MENU_STORAGE_KEY = 'ftnVendorMenuV0400';
  const TRUCK = {
    id: 'capital-city-eats',
    name: 'Capital City Eats',
    cuisine: 'American favorites · Burgers · Tacos',
    status: 'Open now',
    wait: '15–20 min'
  };

  const TRUCKS = [
    TRUCK,
    { id: 'rolling-ember-bbq', name: 'Rolling Ember BBQ', cuisine: 'Smoked BBQ · Southern', status: 'Open now', wait: '20–25 min', icon: '🔥' },
    { id: 'taco-luna', name: 'Taco Luna', cuisine: 'Mexican · Street tacos', status: 'Closed', wait: 'Opens at 5:00 PM', icon: '🌮' }
  ];
  const EVENTS = [
    { id: 'first-friday', date: 'AUG 01', name: 'First Friday Food Truck Rodeo', location: 'City Market Plaza', time: '5:00–9:00 PM', detail: '12 trucks · Live music' },
    { id: 'riverfront-bites', date: 'AUG 09', name: 'Riverfront Bites & Beats', location: 'Riverfront Park', time: '3:00–8:00 PM', detail: '8 trucks · Family friendly' },
    { id: 'night-market', date: 'AUG 16', name: 'Downtown Night Market', location: 'Fayetteville Street', time: '6:00–10:00 PM', detail: '16 trucks · Local makers' }
  ];

  const defaultMenu = [
    { id: 1, name: 'Classic Cheeseburger', category: 'Burgers', price: 11.5, description: 'Seasoned beef patty, American cheese, lettuce, tomato, pickles, and house sauce.', available: true, image: '' },
    { id: 2, name: 'Loaded Nachos', category: 'Entrées', price: 12, description: 'Crispy tortilla chips with cheese, seasoned meat, pico de gallo, and crema.', available: true, image: '' },
    { id: 3, name: 'Chicken Tacos', category: 'Tacos', price: 5.25, description: 'Grilled chicken, cabbage slaw, pico de gallo, and lime crema.', available: true, image: '' },
    { id: 4, name: 'Seasoned Fries', category: 'Sides', price: 4.5, description: 'Crispy fries tossed in the truck’s signature seasoning.', available: true, image: '' },
    { id: 5, name: 'Sweet Potato Fries', category: 'Sides', price: 5.5, description: 'Crispy sweet potato fries with dipping sauce.', available: false, image: '' },
    { id: 6, name: 'Fresh Lemonade', category: 'Drinks', price: 4, description: 'Fresh-squeezed lemonade served cold.', available: true, image: '' }
  ];

  const seedOrders = () => [
    {
      id: `FTN-${Math.floor(4100 + Math.random() * 800)}`,
      truckId: TRUCK.id,
      truckName: TRUCK.name,
      status: 'preparing',
      statusLabel: 'Preparing',
      createdAt: Date.now() - 9 * 60 * 1000,
      items: [{ name: 'Classic Cheeseburger', qty: 1, price: 11.5 }, { name: 'Seasoned Fries', qty: 1, price: 4.5 }],
      subtotal: 16,
      tax: 0.96,
      total: 16.96
    },
    {
      id: 'FTN-3872',
      truckId: TRUCK.id,
      truckName: TRUCK.name,
      status: 'completed',
      statusLabel: 'Picked Up',
      createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
      items: [{ name: 'Chicken Tacos', qty: 3, price: 5.25 }, { name: 'Fresh Lemonade', qty: 1, price: 4 }],
      subtotal: 19.75,
      tax: 1.19,
      total: 20.94
    },
    {
      id: 'FTN-3615',
      truckId: TRUCK.id,
      truckName: TRUCK.name,
      status: 'completed',
      statusLabel: 'Picked Up',
      createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      items: [{ name: 'Loaded Nachos', qty: 1, price: 12 }, { name: 'Fresh Lemonade', qty: 2, price: 4 }],
      subtotal: 20,
      tax: 1.2,
      total: 21.2
    }
  ];

  const defaultPreferences = () => ({
    notifications: { orderUpdates: true, promotions: false, favoriteTrucks: true, push: false },
    privacy: { personalizedOffers: true, activityHistory: true }
  });

  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const customerMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const formatDate = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const normalizePhone = value => String(value || '').replace(/\D/g, '');
  const getInitials = account => `${account?.firstName?.[0] || ''}${account?.lastName?.[0] || ''}`.toUpperCase() || 'FT';
  const avatarMarkup = (account, large = false) => `<span class="customer-avatar${large ? ' large' : ''}">${account?.photo ? `<img src="${account.photo}" alt="">` : escapeHtml(getInitials(account))}</span>`;

  async function hashPassword(value) {
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(value);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return btoa(unescape(encodeURIComponent(value)));
  }

  class CustomerAccountRepository {
    getAll() {
      try {
        const data = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY));
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }

    saveAll(accounts) {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    }

    findByIdentifier(identifier) {
      const normalized = String(identifier || '').trim().toLowerCase();
      const phone = normalizePhone(normalized);
      return this.getAll().find(account => account.email.toLowerCase() === normalized || (phone && normalizePhone(account.mobile) === phone)) || null;
    }

    findById(id) {
      return this.getAll().find(account => account.id === id) || null;
    }

    save(account) {
      const accounts = this.getAll();
      const index = accounts.findIndex(item => item.id === account.id);
      if (index >= 0) accounts[index] = account;
      else accounts.push(account);
      this.saveAll(accounts);
      return account;
    }

    remove(id) {
      this.saveAll(this.getAll().filter(account => account.id !== id));
    }
  }

  class LocalCustomerAuthAdapter {
    constructor(repository) {
      this.repository = repository;
    }

    async signUp(input) {
      if (this.repository.findByIdentifier(input.email) || this.repository.findByIdentifier(input.mobile)) throw new Error('An account already exists with that email or mobile number.');
      const account = {
        id: uid('customer'),
        firstName: input.firstName,
        lastName: input.lastName,
        preferredName: '',
        mobile: input.mobile,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        photo: '',
        emailVerified: false,
        verificationDismissed: false,
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        addresses: [],
        favoriteTrucks: [TRUCK.id],
        favoriteOrders: [],
        paymentMethods: [
          { id: uid('payment'), brand: 'Visa', last4: '1234', name: `${input.firstName} ${input.lastName}`, expiry: '12/30', isDefault: true },
          { id: uid('payment'), brand: 'Mastercard', last4: '9876', name: `${input.firstName} ${input.lastName}`, expiry: '10/31', isDefault: false }
        ],
        orders: seedOrders(),
        preferredLocation: null,
        preferences: defaultPreferences()
      };
      return this.repository.save(account);
    }

    async signIn(identifier, password) {
      const account = this.repository.findByIdentifier(identifier);
      if (!account || account.passwordHash !== await hashPassword(password)) throw new Error('Email, mobile number, or password is incorrect.');
      return account;
    }

    async updateProfile(accountId, updates) {
      const account = this.repository.findById(accountId);
      if (!account) throw new Error('Customer account not found.');
      Object.assign(account, updates);
      return this.repository.save(account);
    }

    async changePassword(accountId, currentPassword, nextPassword) {
      const account = this.repository.findById(accountId);
      if (!account || account.passwordHash !== await hashPassword(currentPassword)) throw new Error('Your current password is incorrect.');
      account.passwordHash = await hashPassword(nextPassword);
      return this.repository.save(account);
    }

    async deleteAccount(accountId) {
      this.repository.remove(accountId);
    }
  }

  // This service is the authentication boundary. A future Supabase adapter can
  // replace LocalCustomerAuthAdapter without changing the customer UI.
  const repository = new CustomerAccountRepository();
  const CustomerAuthService = {
    adapter: new LocalCustomerAuthAdapter(repository),
    setAdapter(adapter) { this.adapter = adapter; },
    signUp(input) { return this.adapter.signUp(input); },
    signIn(identifier, password) { return this.adapter.signIn(identifier, password); },
    updateProfile(accountId, updates) { return this.adapter.updateProfile(accountId, updates); },
    changePassword(accountId, currentPassword, nextPassword) { return this.adapter.changePassword(accountId, currentPassword, nextPassword); },
    deleteAccount(accountId) { return this.adapter.deleteAccount(accountId); }
  };
  window.FoodTrekNowCustomerAuth = CustomerAuthService;

  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const authView = document.getElementById('customerAuthView');
  const accountView = document.getElementById('customerAccountView');
  const accountContent = document.getElementById('customerAccountContent');
  const accountModal = document.getElementById('customerAccountModal');
  const modalContent = document.getElementById('customerAccountModalContent');
  let currentAccount = null;
  let currentPage = 'overview';
  let orderHistoryFilter = 'current';

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(PERSISTENT_SESSION_KEY) || sessionStorage.getItem(TEMP_SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveSession(accountId, remember) {
    clearSession();
    const storage = remember ? localStorage : sessionStorage;
    const key = remember ? PERSISTENT_SESSION_KEY : TEMP_SESSION_KEY;
    storage.setItem(key, JSON.stringify({ accountId, createdAt: Date.now() }));
  }

  function clearSession() {
    localStorage.removeItem(PERSISTENT_SESSION_KEY);
    sessionStorage.removeItem(TEMP_SESSION_KEY);
  }

  function hidePrimaryViews() {
    loginView.classList.add('hidden-view');
    dashboardView.classList.add('hidden-view');
    authView.classList.add('hidden-view');
    accountView.classList.add('hidden-view');
  }

  function showCustomerAuth(panel = 'welcome') {
    hidePrimaryViews();
    authView.classList.remove('hidden-view');
    document.body.classList.remove('login-page');
    ['customerWelcomePanel', 'customerSignInPanel', 'customerCreatePanel', 'customerForgotPanel', 'customerGuestPanel'].forEach(id => document.getElementById(id).classList.add('hidden-view'));
    const panels = { welcome: 'customerWelcomePanel', signin: 'customerSignInPanel', create: 'customerCreatePanel', forgot: 'customerForgotPanel', guest: 'customerGuestPanel' };
    document.getElementById(panels[panel] || panels.welcome).classList.remove('hidden-view');
    if (panel === 'guest') renderGuestMenu();
    window.scrollTo(0, 0);
  }

  function showVendorLogin() {
    hidePrimaryViews();
    loginView.classList.remove('hidden-view');
    document.body.classList.add('login-page');
  }

  function openCustomerAccount(account, page = 'overview') {
    currentAccount = account;
    currentPage = page;
    hidePrimaryViews();
    accountView.classList.remove('hidden-view');
    document.body.classList.remove('login-page');
    renderCustomerShell();
    renderCustomerPage(page);
    window.scrollTo(0, 0);
  }

  function persistCurrentAccount() {
    if (currentAccount) repository.save(currentAccount);
  }

  function customerToast(message) {
    const toast = document.getElementById('customerToast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.ftnCustomerToast);
    window.ftnCustomerToast = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function renderGuestMenu() {
    let menu = defaultMenu;
    try {
      const saved = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY));
      if (Array.isArray(saved) && saved.length) menu = saved;
    } catch {}
    const categoryIcon = category => String(category).toLowerCase().includes('drink') ? '🥤' : String(category).toLowerCase().includes('taco') ? '🌮' : String(category).toLowerCase().includes('side') ? '🍟' : '🍔';
    document.getElementById('customerGuestMenu').innerHTML = menu.sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => `
      <article class="guest-menu-card">
        <div class="guest-menu-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : categoryIcon(item.category)}${item.available ? '' : '<span class="guest-sold-out">SOLD OUT</span>'}</div>
        <div class="guest-menu-body">
          <div class="guest-menu-title"><h3>${escapeHtml(item.name)}</h3><strong>${customerMoney(item.price)}</strong></div>
          <p>${escapeHtml(item.description || '')}</p>
          <button class="primary-button full" type="button" ${item.available ? '' : 'disabled'}>${item.available ? 'Add to Order' : 'Unavailable'}</button>
        </div>
      </article>`).join('');
  }

  function renderCustomerShell() {
    const name = currentAccount.preferredName || currentAccount.firstName;
    document.getElementById('customerMiniProfile').innerHTML = `${avatarMarkup(currentAccount)}<div><strong>${escapeHtml(name)} ${escapeHtml(currentAccount.lastName)}</strong><small>${escapeHtml(currentAccount.email)}</small></div>`;
    document.getElementById('customerVerificationBanner').classList.toggle('hidden-view', currentAccount.emailVerified || currentAccount.verificationDismissed);
    document.querySelectorAll('.customer-nav-link').forEach(button => button.classList.toggle('active', button.dataset.customerPage === currentPage));
  }

  function pageHeader(eyebrow, title, description = '', action = '') {
    return `<header class="customer-page-header"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${action}</header>`;
  }

  function timeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  function preferredLocationLabel() {
    const location = currentAccount.preferredLocation;
    if (!location) return 'Current Location';
    if (location.method === 'city') return location.city;
    if (location.method === 'zip') return `ZIP ${location.zip}`;
    return location.label || 'Current Location';
  }

  function activeOrderCard(order) {
    if (!order) return `<article class="customer-card customer-empty-order">
      <span class="home-card-icon" aria-hidden="true">🍽️</span>
      <div><p class="eyebrow">Hungry?</p><h2>Find a great food truck near you.</h2><p>Fresh local favorites are just a few taps away.</p></div>
      <button class="primary-button" data-home-target="explore" type="button">Browse Trucks</button>
    </article>`;
    const preparing = ['preparing', 'ready'].includes(order.status);
    const ready = order.status === 'ready';
    return `<article class="customer-card customer-current-order home-active-order">
      <div class="active-order-heading"><div><p class="eyebrow">Active Order</p><h2>${escapeHtml(order.statusLabel)}</h2><p>${escapeHtml(order.truckName)} · ${escapeHtml(order.id)}</p></div><span class="status-live-dot">Live</span></div>
      <div class="home-order-track" aria-label="Order progress">
        <div class="complete"><span>✓</span><strong>Received</strong></div>
        <i class="complete"></i>
        <div class="${preparing ? 'complete' : ''}"><span>2</span><strong>Preparing</strong></div>
        <i class="${ready ? 'complete' : ''}"></i>
        <div class="${ready ? 'complete' : ''}"><span>3</span><strong>Ready</strong></div>
      </div>
      <button class="customer-small-button primary" data-order-details="${escapeHtml(order.id)}" type="button">Track Order</button>
    </article>`;
  }

  function favoriteTruckHomeCard(truck) {
    const saved = currentAccount.favoriteTrucks.includes(truck.id);
    return `<article class="home-truck-card">
      <div class="home-truck-logo" aria-hidden="true">${truck.icon || '🚚'}</div>
      <div class="home-truck-copy"><div class="home-truck-title"><h3>${escapeHtml(truck.name)}</h3><button class="home-heart-button ${saved ? 'saved' : ''}" data-toggle-truck-favorite="${truck.id}" type="button" aria-label="${saved ? 'Remove' : 'Add'} ${escapeHtml(truck.name)} ${saved ? 'from' : 'to'} favorites">${saved ? '♥' : '♡'}</button></div><p>${escapeHtml(truck.cuisine)}</p><div class="truck-meta"><span class="${truck.status === 'Closed' ? 'closed' : ''}">${escapeHtml(truck.status)}</span><span>⏱ ${escapeHtml(truck.wait)}</span></div></div>
    </article>`;
  }

  function homeAddressCard(label) {
    const address = currentAccount.addresses.find(item => item.label.toLowerCase() === label.toLowerCase());
    return `<button class="home-saved-tile" data-customer-action="${address ? 'view-addresses' : 'add-address'}" type="button"><span class="saved-tile-icon">${label === 'Home' ? '🏠' : '💼'}</span><span><strong>${label}</strong><small>${address ? `${escapeHtml(address.street)}, ${escapeHtml(address.city)}` : `Add your ${label.toLowerCase()} address`}</small></span><b>›</b></button>`;
  }

  function homePaymentCard(method) {
    if (!method) return '';
    return `<button class="home-saved-tile" data-customer-action="view-payments" type="button"><span class="saved-tile-icon card-brand">${method.brand === 'Visa' ? 'VISA' : method.brand === 'Mastercard' ? 'MC' : 'CARD'}</span><span><strong>${escapeHtml(method.brand)} ••••${escapeHtml(method.last4)}</strong><small>${method.isDefault ? 'Default card' : `Expires ${escapeHtml(method.expiry)}`}</small></span><b>›</b></button>`;
  }

  function renderCustomerPage(page) {
    currentPage = page;
    document.querySelectorAll('.customer-nav-link').forEach(button => button.classList.toggle('active', button.dataset.customerPage === page));
    document.querySelectorAll('[data-bottom-page]').forEach(button => button.classList.toggle('active', button.dataset.bottomPage === page));
    const renderers = {
      overview: renderOverview,
      profile: renderProfile,
      addresses: renderAddresses,
      favorites: renderFavorites,
      orders: renderOrders,
      payments: renderPayments,
      notifications: renderNotifications,
      settings: renderSettings
    };
    accountContent.innerHTML = (renderers[page] || renderers.overview)();
    document.querySelector('.customer-sidebar')?.classList.remove('open');
    document.getElementById('customerMenuButton').setAttribute('aria-expanded', 'false');
  }

  function renderOverview() {
    const currentOrders = currentAccount.orders.filter(order => order.status !== 'completed');
    const pastOrders = currentAccount.orders.filter(order => order.status === 'completed');
    const current = currentOrders[0];
    const name = escapeHtml(currentAccount.preferredName || currentAccount.firstName);
    const favoriteTrucks = TRUCKS.filter(truck => currentAccount.favoriteTrucks.includes(truck.id));
    const visibleTrucks = favoriteTrucks.length ? favoriteTrucks : [TRUCK];
    const payments = currentAccount.paymentMethods.slice(0, 2);
    return `<div class="customer-home">
      <header class="home-welcome">
        <div><p class="home-kicker">${timeGreeting()}, ${name}!</p><h1>Ready for something delicious?</h1>
          <button class="home-location-button" data-customer-action="change-location" type="button"><span>📍</span><span><small>Current Location</small><strong>${escapeHtml(preferredLocationLabel())}</strong></span><b>Change Location⌄</b></button>
        </div>
        <div class="home-weather-mark" aria-hidden="true"><span>Local eats</span><strong>Fresh finds nearby</strong></div>
      </header>

      <form id="customerHomeSearch" class="home-search" role="search">
        <span aria-hidden="true">⌕</span><label class="sr-only" for="customerHomeSearchInput">Search FoodTrekNow</label><input id="customerHomeSearchInput" type="search" autocomplete="off" placeholder="Search food trucks, menu items, cuisines, or events..."><button type="submit">Search</button>
      </form>
      <div id="customerHomeSearchResults" class="home-search-results" aria-live="polite"></div>

      <section class="home-primary-actions" aria-label="Primary actions">
        <button class="home-action-card order" data-home-target="order" type="button"><span>🍔</span><strong>Order Food</strong><small>Browse menus</small><b>›</b></button>
        <button class="home-action-card trucks" data-home-target="explore" type="button"><span>📍</span><strong>Find Trucks</strong><small>Near your location</small><b>›</b></button>
        <button class="home-action-card events" data-home-target="events" type="button"><span>🎪</span><strong>Events</strong><small>Food & community</small><b>›</b></button>
        <button class="home-action-card favorites" data-customer-action="view-favorites" type="button"><span>❤️</span><strong>Favorites</strong><small>Your saved spots</small><b>›</b></button>
      </section>

      <section class="home-section home-order-section">
        <div class="home-section-heading"><div><p class="eyebrow">Pickup status</p><h2>${current ? 'Your order is moving' : 'What are you craving?'}</h2></div>${current ? '<button class="home-link-button" data-customer-action="view-orders" type="button">Order History →</button>' : ''}</div>
        ${activeOrderCard(current)}
      </section>

      <section id="customerHomeExplore" class="home-section">
        <div class="home-section-heading"><div><p class="eyebrow">Saved for later</p><h2>Favorite Trucks</h2></div><button class="home-link-button" data-customer-action="view-favorites" type="button">View Favorites →</button></div>
        <div class="home-truck-grid">${visibleTrucks.map(favoriteTruckHomeCard).join('')}</div>
      </section>

      <section id="customerHomeEvents" class="home-section">
        <div class="home-section-heading"><div><p class="eyebrow">Make a plan</p><h2>Events Near You</h2></div><button class="home-link-button" data-home-target="all-events" type="button">View All Events →</button></div>
        <div class="home-event-grid">${EVENTS.map(event => `<article class="home-event-card"><div class="event-date"><span>${event.date.split(' ')[0]}</span><strong>${event.date.split(' ')[1]}</strong></div><div><p>${escapeHtml(event.location)}</p><h3>${escapeHtml(event.name)}</h3><span>${escapeHtml(event.time)} · ${escapeHtml(event.detail)}</span></div><button data-home-event="${event.id}" type="button" aria-label="View ${escapeHtml(event.name)}">›</button></article>`).join('')}</div>
      </section>

      <section class="home-section">
        <div class="home-section-heading"><div><p class="eyebrow">Order it again</p><h2>Recent Orders</h2></div><button class="home-link-button" data-customer-action="view-orders" type="button">View Order History →</button></div>
        <div class="home-recent-orders">${pastOrders.slice(0, 3).map(order => `<article class="home-recent-order"><div class="recent-order-logo">🚚</div><div><h3>${escapeHtml(order.truckName)}</h3><p>${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</p><span>${formatDate(order.createdAt)} · ${customerMoney(order.total)}</span></div><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button></article>`).join('') || '<div class="customer-card empty-customer-state"><strong>No recent orders yet</strong><p>Your past pickups will appear here.</p></div>'}</div>
      </section>

      <div class="home-two-column">
        <section class="home-section home-compact-section"><div class="home-section-heading"><div><p class="eyebrow">Delivery details</p><h2>Addresses</h2></div></div><div class="home-saved-list">${homeAddressCard('Home')}${homeAddressCard('Work')}<button class="home-add-row" data-customer-action="add-address" type="button"><span>＋</span><strong>Add Address</strong></button></div></section>
        <section class="home-section home-compact-section"><div class="home-section-heading"><div><p class="eyebrow">Faster checkout</p><h2>Payment Methods</h2></div></div><div class="home-saved-list">${payments.map(homePaymentCard).join('')}${payments.length ? '' : '<p class="home-empty-copy">No saved cards yet.</p>'}<button class="home-add-row" data-customer-action="add-payment" type="button"><span>＋</span><strong>Add Payment Method</strong></button></div></section>
      </div>

      <section class="home-section home-notifications">
        <div class="home-section-heading"><div><p class="eyebrow">Stay in the loop</p><h2>Notifications</h2></div><button class="home-link-button" data-home-page="notifications" type="button">Manage Notifications →</button></div>
        <div class="home-notification-list">
          <article><span>🛍️</span><div><strong>Order updates are ${currentAccount.preferences.notifications.orderUpdates ? 'on' : 'off'}</strong><p>Pickup status and order confirmations</p></div><b>${currentAccount.preferences.notifications.orderUpdates ? 'On' : 'Off'}</b></article>
          <article><span>❤️</span><div><strong>Favorite truck alerts are ${currentAccount.preferences.notifications.favoriteTrucks ? 'on' : 'off'}</strong><p>Hours, new menu items, and availability</p></div><b>${currentAccount.preferences.notifications.favoriteTrucks ? 'On' : 'Off'}</b></article>
        </div>
      </section>
    </div>`;
  }

  function renderProfile() {
    return `${pageHeader('Account', 'Your Profile', 'Keep your contact details and preferred name up to date.')}
      <div class="customer-content-grid">
        <section class="customer-card">
          <div class="profile-photo-row">${avatarMarkup(currentAccount, true)}<div class="profile-photo-actions"><strong>Profile Photo <span class="muted">(optional)</span></strong><label class="customer-small-button" for="customerProfilePhoto">Choose Photo</label><input id="customerProfilePhoto" type="file" accept="image/*" hidden><small class="muted">JPG, PNG, or WEBP under 2 MB.</small></div></div>
          <form id="customerProfileForm">
            <div class="customer-form-grid">
              <div><label for="profileFirstName">First Name</label><input id="profileFirstName" class="customer-input" value="${escapeHtml(currentAccount.firstName)}" required maxlength="50"></div>
              <div><label for="profileLastName">Last Name</label><input id="profileLastName" class="customer-input" value="${escapeHtml(currentAccount.lastName)}" required maxlength="50"></div>
              <div><label for="profilePreferredName">Preferred Name</label><input id="profilePreferredName" class="customer-input" value="${escapeHtml(currentAccount.preferredName || '')}" maxlength="50" placeholder="What should we call you?"></div>
              <div><label for="profileMobile">Mobile Number</label><input id="profileMobile" class="customer-input" type="tel" value="${escapeHtml(currentAccount.mobile)}" required maxlength="20"></div>
              <div><label for="profileEmail">Email Address</label><input id="profileEmail" class="customer-input" type="email" value="${escapeHtml(currentAccount.email)}" required maxlength="120"></div>
            </div>
            <p id="customerProfileMessage" class="form-message"></p>
            <div class="customer-form-actions"><button class="primary-button" type="submit">Save Profile</button></div>
          </form>
        </section>
        <aside class="customer-card"><h2 class="customer-section-title">Security</h2><p class="muted">Use a unique password to protect your account and order information.</p><button class="secondary-button full" data-customer-action="change-password" type="button">Change Password</button><div class="demo-note"><strong>Email verification</strong><br>${currentAccount.emailVerified ? 'Verified' : 'Pending — delivery placeholder only'}</div></aside>
      </div>`;
  }

  function renderAddresses() {
    const cards = currentAccount.addresses.length ? currentAccount.addresses.map(address => `
      <article class="customer-card customer-list-card">
        <div><span class="address-label">${escapeHtml(address.label)}</span>${address.isDefault ? ' <span class="default-pill">Default</span>' : ''}<h3>${escapeHtml(address.recipient || `${currentAccount.firstName} ${currentAccount.lastName}`)}</h3><p>${escapeHtml(address.street)}${address.unit ? `, ${escapeHtml(address.unit)}` : ''}<br>${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.zip)}</p>${address.notes ? `<p><small>${escapeHtml(address.notes)}</small></p>` : ''}</div>
        <div class="customer-card-actions"><button class="customer-small-button" data-edit-address="${address.id}" type="button">Edit</button><button class="customer-small-button danger" data-delete-address="${address.id}" type="button">Delete</button></div>
      </article>`).join('') : '<div class="customer-card empty-customer-state"><span>⌖</span><strong>No saved addresses yet</strong><p>Add home, work, or another delivery location.</p></div>';
    return `${pageHeader('Saved Locations', 'Addresses', 'Manage the locations you use for delivery and checkout.', '<button class="primary-button" data-customer-action="add-address" type="button">+ Add Address</button>')}<div class="customer-list">${cards}</div>`;
  }

  function renderFavorites() {
    const truckSaved = currentAccount.favoriteTrucks.includes(TRUCK.id);
    const favoriteOrders = currentAccount.orders.filter(order => currentAccount.favoriteOrders.includes(order.id));
    return `${pageHeader('Saved for Later', 'Favorites', 'Keep favorite trucks and meals close at hand.')}
      <section class="customer-card favorite-truck-card">
        <div class="favorite-truck-art">🚚</div><div><p class="eyebrow">${escapeHtml(TRUCK.status)}</p><h2 class="customer-section-title">${escapeHtml(TRUCK.name)}</h2><p class="muted">${escapeHtml(TRUCK.cuisine)} · ${escapeHtml(TRUCK.wait)}</p></div>
        <button class="heart-button ${truckSaved ? 'saved' : ''}" data-toggle-truck-favorite="${TRUCK.id}" type="button" aria-label="${truckSaved ? 'Remove' : 'Save'} favorite truck">♥</button>
      </section>
      <h2>Favorite Orders</h2>
      <div class="customer-list">${favoriteOrders.length ? favoriteOrders.map(order => favoriteOrderCard(order)).join('') : '<div class="customer-card empty-customer-state"><span>♡</span><strong>No favorite orders yet</strong><p>Open Order History and tap “Save Favorite” on a past meal.</p><button class="secondary-button" data-customer-action="view-orders" type="button">View Order History</button></div>'}</div>`;
  }

  function favoriteOrderCard(order) {
    return `<article class="customer-card customer-order-card"><div><p class="eyebrow">${formatDate(order.createdAt)}</p><h3>${escapeHtml(order.truckName)}</h3><div class="order-item-summary">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</div></div><div><div class="order-total">${customerMoney(order.total)}</div><div class="customer-card-actions"><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button><button class="customer-small-button danger" data-toggle-order-favorite="${escapeHtml(order.id)}" type="button">Remove</button></div></div></article>`;
  }

  function renderOrders() {
    const current = currentAccount.orders.filter(order => order.status !== 'completed');
    const past = currentAccount.orders.filter(order => order.status === 'completed');
    const shown = orderHistoryFilter === 'current' ? current : past;
    return `${pageHeader('Every Pickup', 'Order History', 'Track active orders and revisit past meals.')}
      <div class="order-history-tabs" role="tablist"><button class="order-history-tab ${orderHistoryFilter === 'current' ? 'active' : ''}" data-order-filter="current" type="button">Current Orders (${current.length})</button><button class="order-history-tab ${orderHistoryFilter === 'past' ? 'active' : ''}" data-order-filter="past" type="button">Past Orders (${past.length})</button></div>
      <div class="customer-list">${shown.length ? shown.map(order => orderHistoryCard(order)).join('') : `<div class="customer-card empty-customer-state"><span>▤</span><strong>No ${orderHistoryFilter} orders</strong><p>Orders will appear here after checkout.</p></div>`}</div>`;
  }

  function orderHistoryCard(order) {
    const isFavorite = currentAccount.favoriteOrders.includes(order.id);
    return `<article class="customer-card customer-order-card"><div><span class="status-pill ${order.status === 'completed' ? 'past' : ''}">${escapeHtml(order.statusLabel)}</span><h3>${escapeHtml(order.truckName)} · ${escapeHtml(order.id)}</h3><p class="muted">${formatDate(order.createdAt)}</p><div class="order-item-summary">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</div></div><div><div class="order-total">${customerMoney(order.total)}</div><div class="customer-card-actions"><button class="customer-small-button" data-order-details="${escapeHtml(order.id)}" type="button">Order Details</button>${order.status === 'completed' ? `<button class="customer-small-button" data-receipt="${escapeHtml(order.id)}" type="button">Receipt</button><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button><button class="customer-small-button" data-toggle-order-favorite="${escapeHtml(order.id)}" type="button">${isFavorite ? '♥ Saved' : '♡ Save Favorite'}</button>` : ''}</div></div></article>`;
  }

  function renderPayments() {
    const methods = currentAccount.paymentMethods;
    return `${pageHeader('Checkout', 'Payment Methods', 'Saved payment methods are a UI-only prototype. No card numbers are retained.', '<button class="primary-button" data-customer-action="add-payment" type="button">+ Add Payment Method</button>')}
      <div class="customer-quick-grid">${methods.length ? methods.map(method => `
        <article class="customer-card payment-card"><div class="payment-card-top"><strong>${escapeHtml(method.brand)}</strong>${method.isDefault ? '<span class="default-pill">Default</span>' : ''}</div><div class="payment-card-number">•••• •••• •••• ${escapeHtml(method.last4)}</div><div class="payment-card-bottom"><span>${escapeHtml(method.name)}</span><span>EXP ${escapeHtml(method.expiry)}</span></div></article>`).join('') : '<div class="customer-card empty-customer-state"><span>▣</span><strong>No payment methods saved</strong><p>Add a card preference for faster checkout.</p></div>'}</div>
      ${methods.length ? `<div class="customer-card" style="margin-top:18px"><h2 class="customer-section-title">Manage Methods</h2>${methods.map(method => `<div class="setting-row"><div><strong>${escapeHtml(method.brand)} ending in ${escapeHtml(method.last4)}</strong><small>${escapeHtml(method.name)} · Expires ${escapeHtml(method.expiry)}</small></div><div class="customer-card-actions">${method.isDefault ? '' : `<button class="customer-small-button" data-default-payment="${method.id}" type="button">Make Default</button>`}<button class="customer-small-button danger" data-delete-payment="${method.id}" type="button">Delete</button></div></div>`).join('')}</div>` : ''}`;
  }

  function renderNotifications() {
    const preferences = currentAccount.preferences.notifications;
    const rows = [
      ['orderUpdates', 'Order Updates', 'Status changes, pickup readiness, and order confirmations.'],
      ['promotions', 'Promotions', 'Occasional offers and FoodTrekNow news.'],
      ['favoriteTrucks', 'Favorite Truck Notifications', 'Opening hours, new menu items, and availability from saved trucks.'],
      ['push', 'Push Notifications', 'UI-only preference until push delivery is connected.']
    ];
    return `${pageHeader('Stay in the Loop', 'Notifications', 'Choose which updates you would like to receive.')}<section class="customer-card">${rows.map(([key, title, copy]) => `<div class="setting-row"><div><strong>${title}</strong><small>${copy}</small></div><label class="customer-switch" aria-label="${title}"><input type="checkbox" data-notification-setting="${key}" ${preferences[key] ? 'checked' : ''}><span></span></label></div>`).join('')}</section>`;
  }

  function renderSettings() {
    const preferences = currentAccount.preferences.privacy;
    return `${pageHeader('Account Controls', 'Settings', 'Manage privacy preferences and your FoodTrekNow account.')}
      <section class="customer-card"><h2 class="customer-section-title">Privacy Settings</h2>
        <div class="setting-row"><div><strong>Personalized Offers</strong><small>Use your saved favorites to tailor food truck suggestions.</small></div><label class="customer-switch"><input type="checkbox" data-privacy-setting="personalizedOffers" ${preferences.personalizedOffers ? 'checked' : ''}><span></span></label></div>
        <div class="setting-row"><div><strong>Activity History</strong><small>Keep order activity available for one-tap reordering.</small></div><label class="customer-switch"><input type="checkbox" data-privacy-setting="activityHistory" ${preferences.activityHistory ? 'checked' : ''}><span></span></label></div>
      </section>
      <section class="customer-card danger-zone" style="margin-top:18px"><h2>Delete Account</h2><p class="muted">Permanently remove this local customer profile, addresses, favorites, payment preferences, and order history. This cannot be undone.</p><button class="customer-small-button danger" data-customer-action="delete-account" type="button">Delete My Account</button></section>`;
  }

  function openModal(html) {
    modalContent.innerHTML = html;
    accountModal.classList.remove('hidden');
  }

  function closeModal() {
    accountModal.classList.add('hidden');
    modalContent.innerHTML = '';
  }

  function addressModal(address = null) {
    openModal(`<p class="eyebrow">Saved Location</p><h2 id="customerModalTitle">${address ? 'Edit' : 'Add'} Address</h2>
      <form id="customerAddressForm"><input id="addressId" type="hidden" value="${address?.id || ''}">
        <div class="customer-modal-form-grid">
          <div><label for="addressLabel">Label</label><select id="addressLabel" class="customer-select"><option ${address?.label === 'Home' ? 'selected' : ''}>Home</option><option ${address?.label === 'Work' ? 'selected' : ''}>Work</option><option ${address?.label === 'Other' ? 'selected' : ''}>Other</option></select></div>
          <div><label for="addressRecipient">Recipient</label><input id="addressRecipient" class="customer-input" value="${escapeHtml(address?.recipient || `${currentAccount.firstName} ${currentAccount.lastName}`)}" required></div>
          <div class="full"><label for="addressStreet">Street Address</label><input id="addressStreet" class="customer-input" value="${escapeHtml(address?.street || '')}" required></div>
          <div><label for="addressUnit">Apartment / Suite</label><input id="addressUnit" class="customer-input" value="${escapeHtml(address?.unit || '')}"></div>
          <div><label for="addressCity">City</label><input id="addressCity" class="customer-input" value="${escapeHtml(address?.city || '')}" required></div>
          <div><label for="addressState">State</label><input id="addressState" class="customer-input" maxlength="2" value="${escapeHtml(address?.state || '')}" required></div>
          <div><label for="addressZip">ZIP Code</label><input id="addressZip" class="customer-input" inputmode="numeric" maxlength="10" value="${escapeHtml(address?.zip || '')}" required></div>
          <div class="full"><label for="addressNotes">Delivery Notes</label><textarea id="addressNotes" class="customer-textarea" rows="2">${escapeHtml(address?.notes || '')}</textarea></div>
          <div class="full"><label class="customer-check-row"><input id="addressDefault" type="checkbox" ${address?.isDefault ? 'checked' : ''}> Make this my default address</label></div>
        </div><p id="addressMessage" class="form-message"></p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Save Address</button></div>
      </form>`);
  }

  function locationModal() {
    const saved = currentAccount.preferredLocation || {};
    openModal(`<p class="eyebrow">Preferred Area</p><h2 id="customerModalTitle">Change Location</h2><p class="muted">Choose how FoodTrekNow should find trucks and events near you.</p>
      <form id="customerLocationForm">
        <div class="location-choice-grid" role="group" aria-label="Location method">
          <button class="location-choice ${!saved.method || saved.method === 'current' ? 'active' : ''}" data-location-method="current" type="button"><span>⌖</span><strong>Use Current Location</strong><small>Location access placeholder</small></button>
          <button class="location-choice ${saved.method === 'city' ? 'active' : ''}" data-location-method="city" type="button"><span>🏙️</span><strong>Search by City</strong><small>Enter a city name</small></button>
          <button class="location-choice ${saved.method === 'zip' ? 'active' : ''}" data-location-method="zip" type="button"><span>#</span><strong>Search by ZIP Code</strong><small>Enter a postal code</small></button>
        </div>
        <input id="customerLocationMethod" type="hidden" value="${escapeHtml(saved.method || 'current')}">
        <div id="locationCityField" class="${saved.method === 'city' ? '' : 'hidden-view'}"><label for="customerLocationCity">City</label><input id="customerLocationCity" class="customer-input" value="${escapeHtml(saved.city || '')}" placeholder="Raleigh, NC"></div>
        <div id="locationZipField" class="${saved.method === 'zip' ? '' : 'hidden-view'}"><label for="customerLocationZip">ZIP Code</label><input id="customerLocationZip" class="customer-input" inputmode="numeric" maxlength="10" value="${escapeHtml(saved.zip || '')}" placeholder="27601"></div>
        <p id="customerLocationMessage" class="customer-success-message">${saved.method === 'current' ? 'Current location selected. GPS connection is prepared for a future phase.' : ''}</p>
        <div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Save Preferred Location</button></div>
      </form>`);
  }

  function paymentModal() {
    openModal(`<p class="eyebrow">UI-only Payment Preference</p><h2 id="customerModalTitle">Add Payment Method</h2><p class="muted">Only the card brand, last four digits, name, and expiration are stored locally.</p>
      <form id="customerPaymentForm"><label for="paymentName">Name on Card</label><input id="paymentName" class="customer-input" required maxlength="80"><label for="paymentNumber">Card Number</label><input id="paymentNumber" class="customer-input" inputmode="numeric" autocomplete="off" required minlength="13" maxlength="19" placeholder="4242 4242 4242 4242"><div class="customer-form-grid"><div><label for="paymentExpiry">Expiration</label><input id="paymentExpiry" class="customer-input" required maxlength="5" placeholder="MM/YY"></div><div><label for="paymentCvv">Security Code</label><input id="paymentCvv" class="customer-input" inputmode="numeric" autocomplete="off" required maxlength="4" placeholder="CVV"></div></div><label class="customer-check-row" style="margin-top:16px"><input id="paymentDefault" type="checkbox"> Make this my default payment method</label><p id="paymentMessage" class="form-message"></p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Save Method</button></div></form>`);
  }

  function passwordModal() {
    openModal(`<p class="eyebrow">Security</p><h2 id="customerModalTitle">Change Password</h2><form id="customerPasswordForm"><label for="currentCustomerPassword">Current Password</label><input id="currentCustomerPassword" class="customer-input" type="password" required autocomplete="current-password"><label for="nextCustomerPassword">New Password</label><input id="nextCustomerPassword" class="customer-input" type="password" minlength="8" required autocomplete="new-password"><label for="confirmCustomerPassword">Confirm New Password</label><input id="confirmCustomerPassword" class="customer-input" type="password" minlength="8" required autocomplete="new-password"><p id="passwordChangeMessage" class="form-message"></p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Update Password</button></div></form>`);
  }

  function orderModal(order, receiptOnly = false) {
    if (!order) return;
    const itemLines = order.items.map(item => `<div class="receipt-line"><span>${item.qty} × ${escapeHtml(item.name)}</span><strong>${customerMoney(item.qty * item.price)}</strong></div>`).join('');
    openModal(`<div class="customer-receipt"><div class="receipt-brand"><p class="eyebrow">${receiptOnly ? 'Receipt' : 'Order Details'}</p><h2 id="customerModalTitle">${escapeHtml(order.truckName)}</h2><p>Order ${escapeHtml(order.id)} · ${formatDate(order.createdAt)}</p><span class="status-pill ${order.status === 'completed' ? 'past' : ''}">${escapeHtml(order.statusLabel)}</span></div><h3>Items</h3>${itemLines}<div class="receipt-line"><span>Subtotal</span><strong>${customerMoney(order.subtotal)}</strong></div><div class="receipt-line"><span>Tax</span><strong>${customerMoney(order.tax)}</strong></div><div class="receipt-line receipt-total"><strong>Total</strong><strong>${customerMoney(order.total)}</strong></div><p class="muted">${receiptOnly ? 'Paid · Customer receipt view' : 'Pickup status updates appear in your account and notification preferences.'}</p>${order.status === 'completed' ? `<button class="primary-button full" data-reorder="${escapeHtml(order.id)}" type="button">Reorder This Meal</button>` : ''}</div>`);
  }

  function deleteAccountModal() {
    openModal(`<p class="eyebrow">Permanent Action</p><h2 id="customerModalTitle">Delete your account?</h2><p>This permanently removes all locally saved customer data. Type <strong>DELETE</strong> to confirm.</p><form id="customerDeleteForm"><label for="deleteAccountConfirm">Confirmation</label><input id="deleteAccountConfirm" class="customer-input" autocomplete="off" required placeholder="Type DELETE"><p id="deleteAccountMessage" class="form-message"></p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="customer-small-button danger" type="submit">Permanently Delete Account</button></div></form>`);
  }

  document.getElementById('openCustomerPortalButton').addEventListener('click', () => {
    const session = readSession();
    const account = session ? repository.findById(session.accountId) : null;
    if (account) openCustomerAccount(account);
    else showCustomerAuth();
  });
  document.getElementById('backToVendorButton').addEventListener('click', showVendorLogin);
  document.getElementById('showCustomerSignInButton').addEventListener('click', () => showCustomerAuth('signin'));
  document.getElementById('showCreateAccountButton').addEventListener('click', () => showCustomerAuth('create'));
  document.getElementById('guestCheckoutButton').addEventListener('click', () => showCustomerAuth('guest'));
  document.querySelectorAll('[data-auth-back]').forEach(button => button.addEventListener('click', () => showCustomerAuth()));
  document.querySelectorAll('[data-show-signin]').forEach(button => button.addEventListener('click', () => showCustomerAuth('signin')));
  document.querySelectorAll('[data-show-create]').forEach(button => button.addEventListener('click', () => showCustomerAuth('create')));
  document.getElementById('showForgotPasswordButton').addEventListener('click', () => showCustomerAuth('forgot'));
  document.querySelectorAll('[data-info-message]').forEach(button => button.addEventListener('click', () => alert(button.dataset.infoMessage)));

  document.getElementById('customerCreateForm').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('customerCreateMessage');
    const password = document.getElementById('createPassword').value;
    const confirm = document.getElementById('createConfirmPassword').value;
    const input = {
      firstName: document.getElementById('createFirstName').value.trim(),
      lastName: document.getElementById('createLastName').value.trim(),
      mobile: document.getElementById('createMobile').value.trim(),
      email: document.getElementById('createEmail').value.trim(),
      password
    };
    if (!input.firstName || !input.lastName || normalizePhone(input.mobile).length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      message.textContent = 'Enter your name, a valid mobile number, and a valid email address.';
      return;
    }
    if (password.length < 8) {
      message.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirm) {
      message.textContent = 'Passwords do not match.';
      return;
    }
    if (!document.getElementById('createAcceptTerms').checked) {
      message.textContent = 'Accept the Terms of Service and Privacy Policy to continue.';
      return;
    }
    try {
      const account = await CustomerAuthService.signUp(input);
      saveSession(account.id, true);
      event.target.reset();
      openCustomerAccount(account);
      customerToast('Account created. Welcome to FoodTrekNow!');
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('customerSignInForm').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('customerSignInMessage');
    try {
      const account = await CustomerAuthService.signIn(document.getElementById('customerSignInIdentifier').value, document.getElementById('customerSignInPassword').value);
      saveSession(account.id, document.getElementById('customerRememberMe').checked);
      event.target.reset();
      message.textContent = '';
      openCustomerAccount(account);
      customerToast('Signed in successfully.');
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('customerForgotForm').addEventListener('submit', event => {
    event.preventDefault();
    const identifier = document.getElementById('customerForgotIdentifier').value.trim();
    document.getElementById('customerForgotMessage').textContent = identifier ? 'Reset instructions placeholder ready. Supabase will deliver email or SMS in a future phase.' : '';
  });

  document.getElementById('customerSignOutButton').addEventListener('click', () => {
    clearSession();
    currentAccount = null;
    showCustomerAuth('signin');
  });
  document.getElementById('customerMenuButton').addEventListener('click', event => {
    const sidebar = document.querySelector('.customer-sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('customerAccountNav').addEventListener('click', event => {
    const button = event.target.closest('[data-customer-page]');
    if (button) renderCustomerPage(button.dataset.customerPage);
  });
  document.getElementById('customerBottomNav').addEventListener('click', event => {
    const pageButton = event.target.closest('[data-bottom-page]');
    if (pageButton) {
      renderCustomerPage(pageButton.dataset.bottomPage);
      return;
    }
    const targetButton = event.target.closest('[data-bottom-target]');
    if (!targetButton) return;
    const target = targetButton.dataset.bottomTarget;
    if (target === 'cart') {
      customerToast('Your cart stays available while you browse truck menus.');
      return;
    }
    renderCustomerPage('overview');
    setTimeout(() => document.getElementById(target === 'events' ? 'customerHomeEvents' : 'customerHomeExplore')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  });
  document.getElementById('dismissVerificationButton').addEventListener('click', () => {
    currentAccount.verificationDismissed = true;
    persistCurrentAccount();
    document.getElementById('customerVerificationBanner').classList.add('hidden-view');
  });
  document.getElementById('closeCustomerAccountModal').addEventListener('click', closeModal);
  accountModal.addEventListener('click', event => { if (event.target === accountModal) closeModal(); });

  accountContent.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-customer-action]');
    if (actionButton) {
      const actions = {
        'view-favorites': () => renderCustomerPage('favorites'),
        'view-orders': () => renderCustomerPage('orders'),
        'view-addresses': () => renderCustomerPage('addresses'),
        'view-payments': () => renderCustomerPage('payments'),
        'change-location': locationModal,
        'add-address': () => addressModal(),
        'add-payment': paymentModal,
        'change-password': passwordModal,
        'delete-account': deleteAccountModal
      };
      actions[actionButton.dataset.customerAction]?.();
      return;
    }
    const addressEdit = event.target.closest('[data-edit-address]');
    if (addressEdit) return addressModal(currentAccount.addresses.find(address => address.id === addressEdit.dataset.editAddress));
    const addressDelete = event.target.closest('[data-delete-address]');
    if (addressDelete && confirm('Delete this saved address?')) {
      currentAccount.addresses = currentAccount.addresses.filter(address => address.id !== addressDelete.dataset.deleteAddress);
      persistCurrentAccount();
      renderCustomerPage('addresses');
      customerToast('Address deleted.');
      return;
    }
    const truckFavorite = event.target.closest('[data-toggle-truck-favorite]');
    if (truckFavorite) {
      const id = truckFavorite.dataset.toggleTruckFavorite;
      const saved = currentAccount.favoriteTrucks.includes(id);
      currentAccount.favoriteTrucks = saved ? currentAccount.favoriteTrucks.filter(item => item !== id) : [...currentAccount.favoriteTrucks, id];
      persistCurrentAccount();
      renderCustomerPage(currentPage);
      customerToast(saved ? 'Truck removed from favorites.' : 'Truck saved to favorites.');
      return;
    }
    const homePage = event.target.closest('[data-home-page]');
    if (homePage) {
      renderCustomerPage(homePage.dataset.homePage);
      return;
    }
    const homeTarget = event.target.closest('[data-home-target]');
    if (homeTarget) {
      const target = homeTarget.dataset.homeTarget;
      const sectionId = target === 'events' || target === 'all-events' ? 'customerHomeEvents' : 'customerHomeExplore';
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target === 'order') customerToast('Choose a favorite truck to start your order.');
      if (target === 'all-events') customerToast('More local events are coming soon.');
      return;
    }
    const homeEvent = event.target.closest('[data-home-event]');
    if (homeEvent) {
      const eventItem = EVENTS.find(item => item.id === homeEvent.dataset.homeEvent);
      if (eventItem) customerToast(`${eventItem.name} · ${eventItem.time}`);
      return;
    }
    const orderFavorite = event.target.closest('[data-toggle-order-favorite]');
    if (orderFavorite) return toggleFavoriteOrder(orderFavorite.dataset.toggleOrderFavorite);
    const reorder = event.target.closest('[data-reorder]');
    if (reorder) return reorderMeal(reorder.dataset.reorder);
    const orderDetails = event.target.closest('[data-order-details]');
    if (orderDetails) return orderModal(currentAccount.orders.find(order => order.id === orderDetails.dataset.orderDetails));
    const receipt = event.target.closest('[data-receipt]');
    if (receipt) return orderModal(currentAccount.orders.find(order => order.id === receipt.dataset.receipt), true);
    const orderFilter = event.target.closest('[data-order-filter]');
    if (orderFilter) {
      orderHistoryFilter = orderFilter.dataset.orderFilter;
      renderCustomerPage('orders');
      return;
    }
    const defaultPayment = event.target.closest('[data-default-payment]');
    if (defaultPayment) {
      currentAccount.paymentMethods.forEach(method => { method.isDefault = method.id === defaultPayment.dataset.defaultPayment; });
      persistCurrentAccount();
      renderCustomerPage('payments');
      customerToast('Default payment method updated.');
      return;
    }
    const deletePayment = event.target.closest('[data-delete-payment]');
    if (deletePayment && confirm('Delete this saved payment method?')) {
      const removed = currentAccount.paymentMethods.find(method => method.id === deletePayment.dataset.deletePayment);
      currentAccount.paymentMethods = currentAccount.paymentMethods.filter(method => method.id !== deletePayment.dataset.deletePayment);
      if (removed?.isDefault && currentAccount.paymentMethods[0]) currentAccount.paymentMethods[0].isDefault = true;
      persistCurrentAccount();
      renderCustomerPage('payments');
      customerToast('Payment method deleted.');
    }
  });

  function toggleFavoriteOrder(orderId) {
    const saved = currentAccount.favoriteOrders.includes(orderId);
    currentAccount.favoriteOrders = saved ? currentAccount.favoriteOrders.filter(id => id !== orderId) : [...currentAccount.favoriteOrders, orderId];
    persistCurrentAccount();
    renderCustomerPage(currentPage);
    customerToast(saved ? 'Order removed from favorites.' : 'Order saved to favorites.');
  }

  function reorderMeal(orderId) {
    const source = currentAccount.orders.find(order => order.id === orderId);
    if (!source) return;
    const copy = {
      ...source,
      id: `FTN-${String(Date.now()).slice(-6)}`,
      status: 'new',
      statusLabel: 'Order Received',
      createdAt: Date.now(),
      items: source.items.map(item => ({ ...item }))
    };
    currentAccount.orders.unshift(copy);
    persistCurrentAccount();
    closeModal();
    orderHistoryFilter = 'current';
    renderCustomerPage('orders');
    customerToast('Meal reordered and added to current orders.');
  }

  accountContent.addEventListener('change', event => {
    if (event.target.matches('[data-notification-setting]')) {
      currentAccount.preferences.notifications[event.target.dataset.notificationSetting] = event.target.checked;
      persistCurrentAccount();
      customerToast('Notification preference saved.');
    }
    if (event.target.matches('[data-privacy-setting]')) {
      currentAccount.preferences.privacy[event.target.dataset.privacySetting] = event.target.checked;
      persistCurrentAccount();
      customerToast('Privacy preference saved.');
    }
    if (event.target.id === 'customerProfilePhoto') {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
        customerToast('Choose an image under 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        currentAccount.photo = String(reader.result || '');
        persistCurrentAccount();
        renderCustomerShell();
        renderCustomerPage('profile');
        customerToast('Profile photo updated.');
      };
      reader.readAsDataURL(file);
    }
  });

  accountContent.addEventListener('submit', async event => {
    if (event.target.id === 'customerHomeSearch') {
      event.preventDefault();
      const input = document.getElementById('customerHomeSearchInput');
      const results = document.getElementById('customerHomeSearchResults');
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '';
        input.focus();
        return;
      }
      const truckMatches = TRUCKS.filter(truck => `${truck.name} ${truck.cuisine} ${truck.status}`.toLowerCase().includes(query));
      const menuMatches = defaultMenu.filter(item => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query));
      const eventMatches = EVENTS.filter(item => `${item.name} ${item.location} ${item.detail}`.toLowerCase().includes(query));
      const total = truckMatches.length + menuMatches.length + eventMatches.length;
      results.innerHTML = `<div class="home-search-result-card"><div><strong>${total ? `${total} result${total === 1 ? '' : 's'} for “${escapeHtml(input.value.trim())}”` : `No matches for “${escapeHtml(input.value.trim())}”`}</strong><p>${total ? [
        truckMatches.length ? `${truckMatches.length} truck${truckMatches.length === 1 ? '' : 's'}` : '',
        menuMatches.length ? `${menuMatches.length} menu item${menuMatches.length === 1 ? '' : 's'}` : '',
        eventMatches.length ? `${eventMatches.length} event${eventMatches.length === 1 ? '' : 's'}` : ''
      ].filter(Boolean).join(' · ') : 'Try a truck name, menu item, cuisine, city event, or “tacos”.'}</p></div><button data-home-target="${eventMatches.length && !truckMatches.length ? 'events' : 'explore'}" type="button">${total ? 'View matches' : 'Browse nearby'}</button></div>`;
      return;
    }
    if (event.target.id !== 'customerProfileForm') return;
    event.preventDefault();
    const updates = {
      firstName: document.getElementById('profileFirstName').value.trim(),
      lastName: document.getElementById('profileLastName').value.trim(),
      preferredName: document.getElementById('profilePreferredName').value.trim(),
      mobile: document.getElementById('profileMobile').value.trim(),
      email: document.getElementById('profileEmail').value.trim().toLowerCase()
    };
    const message = document.getElementById('customerProfileMessage');
    if (!updates.firstName || !updates.lastName || normalizePhone(updates.mobile).length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      message.textContent = 'Enter a valid name, mobile number, and email address.';
      return;
    }
    const duplicate = repository.getAll().find(account => account.id !== currentAccount.id && (account.email.toLowerCase() === updates.email || normalizePhone(account.mobile) === normalizePhone(updates.mobile)));
    if (duplicate) {
      message.textContent = 'That email or mobile number is already in use.';
      return;
    }
    currentAccount = await CustomerAuthService.updateProfile(currentAccount.id, updates);
    renderCustomerShell();
    renderCustomerPage('profile');
    customerToast('Profile saved.');
  });

  modalContent.addEventListener('click', event => {
    if (event.target.closest('[data-close-customer-modal]')) closeModal();
    const locationChoice = event.target.closest('[data-location-method]');
    if (locationChoice) {
      const method = locationChoice.dataset.locationMethod;
      document.getElementById('customerLocationMethod').value = method;
      modalContent.querySelectorAll('.location-choice').forEach(button => button.classList.toggle('active', button.dataset.locationMethod === method));
      document.getElementById('locationCityField').classList.toggle('hidden-view', method !== 'city');
      document.getElementById('locationZipField').classList.toggle('hidden-view', method !== 'zip');
      document.getElementById('customerLocationMessage').textContent = method === 'current' ? 'Current location selected. GPS connection is prepared for a future phase.' : '';
    }
    const reorder = event.target.closest('[data-reorder]');
    if (reorder) reorderMeal(reorder.dataset.reorder);
  });

  modalContent.addEventListener('submit', async event => {
    event.preventDefault();
    if (event.target.id === 'customerAddressForm') {
      const id = document.getElementById('addressId').value || uid('address');
      const isDefault = document.getElementById('addressDefault').checked || currentAccount.addresses.length === 0;
      const address = {
        id,
        label: document.getElementById('addressLabel').value,
        recipient: document.getElementById('addressRecipient').value.trim(),
        street: document.getElementById('addressStreet').value.trim(),
        unit: document.getElementById('addressUnit').value.trim(),
        city: document.getElementById('addressCity').value.trim(),
        state: document.getElementById('addressState').value.trim().toUpperCase(),
        zip: document.getElementById('addressZip').value.trim(),
        notes: document.getElementById('addressNotes').value.trim(),
        isDefault
      };
      if (!address.recipient || !address.street || !address.city || !address.state || !address.zip) {
        document.getElementById('addressMessage').textContent = 'Complete all required address fields.';
        return;
      }
      if (isDefault) currentAccount.addresses.forEach(item => { item.isDefault = false; });
      const index = currentAccount.addresses.findIndex(item => item.id === id);
      if (index >= 0) currentAccount.addresses[index] = address;
      else currentAccount.addresses.push(address);
      persistCurrentAccount();
      closeModal();
      renderCustomerPage('addresses');
      customerToast('Address saved.');
    }
    if (event.target.id === 'customerLocationForm') {
      const method = document.getElementById('customerLocationMethod').value;
      const city = document.getElementById('customerLocationCity').value.trim();
      const zip = document.getElementById('customerLocationZip').value.trim();
      const message = document.getElementById('customerLocationMessage');
      if (method === 'city' && !city) {
        message.textContent = 'Enter a city to save this location.';
        return;
      }
      if (method === 'zip' && !/^\d{5}(?:-\d{4})?$/.test(zip)) {
        message.textContent = 'Enter a valid 5-digit ZIP code.';
        return;
      }
      currentAccount.preferredLocation = method === 'city'
        ? { method, city }
        : method === 'zip'
          ? { method, zip }
          : { method: 'current', label: 'Current Location' };
      persistCurrentAccount();
      closeModal();
      renderCustomerPage('overview');
      customerToast('Preferred location saved.');
    }
    if (event.target.id === 'customerPaymentForm') {
      const number = document.getElementById('paymentNumber').value.replace(/\D/g, '');
      const expiry = document.getElementById('paymentExpiry').value.trim();
      if (number.length < 13 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) || document.getElementById('paymentCvv').value.replace(/\D/g, '').length < 3) {
        document.getElementById('paymentMessage').textContent = 'Enter valid prototype card details and an MM/YY expiration.';
        return;
      }
      const isDefault = document.getElementById('paymentDefault').checked || currentAccount.paymentMethods.length === 0;
      if (isDefault) currentAccount.paymentMethods.forEach(method => { method.isDefault = false; });
      const brand = number.startsWith('4') ? 'Visa' : number.startsWith('5') ? 'Mastercard' : number.startsWith('3') ? 'Amex' : 'Card';
      currentAccount.paymentMethods.push({ id: uid('payment'), brand, last4: number.slice(-4), name: document.getElementById('paymentName').value.trim(), expiry, isDefault });
      persistCurrentAccount();
      closeModal();
      renderCustomerPage('payments');
      customerToast('Payment method saved.');
    }
    if (event.target.id === 'customerPasswordForm') {
      const currentPassword = document.getElementById('currentCustomerPassword').value;
      const nextPassword = document.getElementById('nextCustomerPassword').value;
      const confirmPassword = document.getElementById('confirmCustomerPassword').value;
      const message = document.getElementById('passwordChangeMessage');
      if (nextPassword.length < 8) {
        message.textContent = 'New password must be at least 8 characters.';
        return;
      }
      if (nextPassword !== confirmPassword) {
        message.textContent = 'New passwords do not match.';
        return;
      }
      try {
        currentAccount = await CustomerAuthService.changePassword(currentAccount.id, currentPassword, nextPassword);
        closeModal();
        customerToast('Password updated.');
      } catch (error) {
        message.textContent = error.message;
      }
    }
    if (event.target.id === 'customerDeleteForm') {
      if (document.getElementById('deleteAccountConfirm').value !== 'DELETE') {
        document.getElementById('deleteAccountMessage').textContent = 'Type DELETE exactly to confirm.';
        return;
      }
      await CustomerAuthService.deleteAccount(currentAccount.id);
      clearSession();
      currentAccount = null;
      closeModal();
      showCustomerAuth();
    }
  });

  const session = readSession();
  if (session && localStorage.getItem('ftnVendorLoggedIn') !== 'true') {
    const account = repository.findById(session.accountId);
    if (account) openCustomerAccount(account);
    else clearSession();
  }
})();
