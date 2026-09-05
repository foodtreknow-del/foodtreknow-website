(function exposeOpportunityMarketplace() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const clean = value => String(value || '').trim();
  const asArray = value => Array.isArray(value) ? value : [];
  const safeImageUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const MARKETPLACE_ERROR = 'The location marketplace database update has not been installed yet.';
  const state = {
    vendor: { context: null, opportunities: [], applications: [], bookings: [], favorites: [], routes: [], messages: [], reviews: [], notifications: [], tab: 'discover', view: 'list', location: null, filters: {} },
    host: { profile: null, locations: [], opportunities: [], applications: [], bookings: [], messages: [], reviews: [], notifications: [], tab: 'dashboard' },
    activeRole: null,
    selectedOpportunity: null,
    selectedApplication: null
  };

  function friendly(error) {
    const message = clean(error?.message);
    if (/relation .* does not exist|schema cache|could not find the function/i.test(message)) return new Error(MARKETPLACE_ERROR);
    if (/duplicate key|unique constraint/i.test(message)) return new Error('This food truck already requested or booked this opportunity.');
    return new Error(message || 'The marketplace request could not be completed.');
  }

  async function rpc(name, values = {}) {
    if (!client) throw new Error('The secure marketplace connection is unavailable.');
    const { data, error } = await client.rpc(name, values);
    if (error) throw friendly(error);
    return data;
  }

  async function query(builder) {
    const { data, error } = await builder;
    if (error) throw friendly(error);
    return data || [];
  }

  function dateTime(value) {
    if (!value) return 'Not specified';
    return new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function sameLocalDay(value, target = new Date()) {
    const date = new Date(value);
    return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
  }

  function haversineMiles(origin, destination) {
    if (!origin || !Number.isFinite(Number(destination?.latitude)) || !Number.isFinite(Number(destination?.longitude))) return null;
    const radians = degrees => degrees * Math.PI / 180;
    const lat1 = radians(Number(origin.latitude));
    const lat2 = radians(Number(destination.latitude));
    const deltaLat = lat2 - lat1;
    const deltaLon = radians(Number(destination.longitude) - Number(origin.longitude));
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function feeLabel(item) {
    const flat = Number(item.flat_vendor_fee || 0);
    const percent = Number(item.sales_percentage || 0);
    if (!flat && !percent) return 'No vendor fee';
    if (flat && percent) return `${money(flat)} + ${percent}% of sales`;
    if (flat) return `${money(flat)} flat fee`;
    return `${percent}% of sales`;
  }

  function capacityLeft(item) {
    return Math.max(0, Number(item.trucks_requested || 0) - Number(item.trucks_booked || 0));
  }

  function profitability(item, distance = null) {
    const customersPerTruck = Number(item.expected_customers || 0) / Math.max(1, Number(item.trucks_requested || 1));
    const projectedSales = customersPerTruck * 0.45 * 18;
    const percentageFee = projectedSales * Number(item.sales_percentage || 0) / 100;
    const vendorFee = Number(item.flat_vendor_fee || 0) + percentageFee;
    const foodCost = projectedSales * 0.30;
    const durationHours = Math.max(1, (new Date(item.ends_at) - new Date(item.starts_at)) / 3600000);
    const laborCost = Math.max(125, durationHours * 45);
    const travelCost = distance === null ? 0 : distance * 1.25;
    const estimatedProfit = projectedSales - vendorFee - foodCost - laborCost - travelCost;
    let score = 50;
    const positive = [];
    const negative = [];
    if (customersPerTruck >= 250) { score += 18; positive.push(`${Math.round(customersPerTruck)} potential customers per truck`); }
    else if (customersPerTruck >= 120) { score += 10; positive.push('Healthy customer-to-truck ratio'); }
    else { score -= 14; negative.push('Low expected customers per truck'); }
    if (!Number(item.flat_vendor_fee) && !Number(item.sales_percentage)) { score += 12; positive.push('No vendor fee'); }
    else if (vendorFee > projectedSales * 0.2) { score -= 16; negative.push('Fees exceed 20% of projected sales'); }
    if (Number(item.minimum_sales_guarantee) > 0) { score += 12; positive.push(`${money(item.minimum_sales_guarantee)} minimum sales guarantee`); }
    if (item.electricity_available) { score += 3; positive.push('Power available'); }
    if (item.water_available) { score += 2; positive.push('Water available'); }
    if (distance !== null && distance > 40) { score -= 14; negative.push(`${distance.toFixed(1)} miles from your current location`); }
    else if (distance !== null && distance <= 10) { score += 7; positive.push('Short travel distance'); }
    if (Number(item.host?.average_rating || 0) >= 4.5) { score += 6; positive.push('Highly rated host'); }
    if (capacityLeft(item) === 1) negative.push('Only one spot remains');
    score = Math.max(0, Math.min(100, Math.round(score)));
    const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Very Good' : score >= 60 ? 'Good' : score >= 40 ? 'Risky' : 'Poor';
    return { score, label, positive, negative, projectedSales, vendorFee, foodCost, laborCost, travelCost, estimatedProfit };
  }

  function opportunityDistance(item) {
    return haversineMiles(state.vendor.location, item.location);
  }

  function filteredOpportunities(todayOnly = false) {
    const filters = state.vendor.filters;
    let items = state.vendor.opportunities.filter(item => !todayOnly || sameLocalDay(item.starts_at));
    if (filters.date) items = items.filter(item => new Date(item.starts_at).toISOString().slice(0, 10) === filters.date);
    if (filters.startTime) items = items.filter(item => new Date(item.starts_at).toTimeString().slice(0, 5) >= filters.startTime);
    if (filters.endTime) items = items.filter(item => new Date(item.ends_at).toTimeString().slice(0, 5) <= filters.endTime);
    if (filters.cuisine) items = items.filter(item => asArray(item.cuisine_preferences).some(cuisine => cuisine.toLowerCase().includes(filters.cuisine.toLowerCase())));
    if (filters.eventType) items = items.filter(item => item.event_type === filters.eventType);
    if (filters.locationType) items = items.filter(item => item.location?.location_type === filters.locationType);
    if (filters.indoorOutdoor) items = items.filter(item => item.indoor_outdoor === filters.indoorOutdoor || item.indoor_outdoor === 'both');
    if (filters.opportunityType) items = items.filter(item => item.opportunity_type === filters.opportunityType);
    if (filters.noFee) items = items.filter(item => !Number(item.flat_vendor_fee) && !Number(item.sales_percentage));
    if (filters.power) items = items.filter(item => item.electricity_available);
    if (filters.water) items = items.filter(item => item.water_available);
    if (filters.maxFee) items = items.filter(item => Number(item.flat_vendor_fee || 0) <= Number(filters.maxFee));
    if (filters.maxPercentage) items = items.filter(item => Number(item.sales_percentage || 0) <= Number(filters.maxPercentage));
    if (filters.minimumGuarantee) items = items.filter(item => Number(item.minimum_sales_guarantee || 0) >= Number(filters.minimumGuarantee));
    if (filters.maxCompetition) items = items.filter(item => Number(item.trucks_booked || 0) <= Number(filters.maxCompetition));
    if (filters.minAttendance) items = items.filter(item => Number(item.expected_customers || 0) >= Number(filters.minAttendance));
    if (filters.distance && state.vendor.location) items = items.filter(item => {
      const distance = opportunityDistance(item);
      return distance !== null && distance <= Number(filters.distance);
    });
    const sort = filters.sort || (todayOnly ? 'soon' : 'date');
    return items.sort((a, b) => {
      if (sort === 'closest') return (opportunityDistance(a) ?? Infinity) - (opportunityDistance(b) ?? Infinity);
      if (sort === 'profit') return profitability(b, opportunityDistance(b)).score - profitability(a, opportunityDistance(a)).score;
      if (sort === 'crowd') return Number(b.expected_customers) - Number(a.expected_customers);
      if (sort === 'fee') return Number(a.flat_vendor_fee) - Number(b.flat_vendor_fee);
      return new Date(a.starts_at) - new Date(b.starts_at);
    });
  }

  async function loadVendorData() {
    const context = await window.FoodTrekNowVendorAuth?.restore();
    if (!context) throw new Error('Sign in with an approved vendor account to find opportunities.');
    state.vendor.context = context;
    const vendorId = context.vendor.id;
    const [opportunities, applications, bookings, favorites, routes, notifications] = await Promise.all([
      rpc('list_marketplace_opportunities'),
      query(client.from('opportunity_applications').select('*, opportunities(title, starts_at, ends_at, location_id, host_locations(name, city, state)), trucks(name)').eq('vendor_profile_id', vendorId).order('applied_at', { ascending: false })),
      query(client.from('opportunity_bookings').select('*, opportunities(title, opportunity_type, starts_at, ends_at, arrival_time, parking_instructions, setup_instructions, host_locations(name, address_line1, city, state, postal_code, latitude, longitude)), trucks(name)').eq('vendor_profile_id', vendorId).order('confirmed_at', { ascending: false })),
      query(client.from('opportunity_favorites').select('opportunity_id').eq('vendor_profile_id', vendorId)),
      query(client.from('vendor_routes').select('*, vendor_route_stops(*, opportunity_bookings(*, opportunities(title, starts_at, ends_at, flat_vendor_fee, sales_percentage, expected_customers, trucks_requested, host_locations(name, city, state, latitude, longitude))))').eq('vendor_profile_id', vendorId)),
      query(client.from('marketplace_notifications').select('*').eq('profile_id', context.user.id).order('created_at', { ascending: false }).limit(50))
    ]);
    state.vendor.opportunities = opportunities;
    state.vendor.applications = applications;
    state.vendor.bookings = bookings;
    state.vendor.favorites = favorites.map(item => item.opportunity_id);
    state.vendor.routes = routes;
    state.vendor.notifications = notifications;
    const applicationIds = applications.map(item => item.id);
    const bookingIds = bookings.map(item => item.id);
    state.vendor.messages = applicationIds.length ? await query(client.from('opportunity_messages').select('*').in('application_id', applicationIds).order('created_at')) : [];
    state.vendor.reviews = bookingIds.length ? await query(client.from('opportunity_reviews').select('*').in('booking_id', bookingIds).order('created_at', { ascending: false })) : [];
  }

  async function loadHostData() {
    if (!client) throw new Error('The secure marketplace connection is unavailable.');
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) throw new Error('Sign in to create and manage host opportunities.');
    const profiles = await query(client.from('location_hosts').select('*').eq('owner_id', user.id).limit(1));
    state.host.profile = profiles[0] || null;
    if (!state.host.profile) {
      state.host.locations = [];
      state.host.opportunities = [];
      state.host.applications = [];
      state.host.bookings = [];
      state.host.messages = [];
      state.host.reviews = [];
      state.host.notifications = [];
      return;
    }
    const hostId = state.host.profile.id;
    const [locations, opportunities, notifications] = await Promise.all([
      query(client.from('host_locations').select('*').eq('host_id', hostId).order('created_at')),
      query(client.from('opportunities').select('*, opportunity_recurrence_rules(*)').eq('host_id', hostId).order('starts_at', { ascending: false })),
      query(client.from('marketplace_notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(50))
    ]);
    state.host.locations = locations;
    state.host.opportunities = opportunities;
    state.host.notifications = notifications;
    const ids = opportunities.map(item => item.id);
    if (!ids.length) {
      state.host.applications = [];
      state.host.bookings = [];
      state.host.messages = [];
      state.host.reviews = [];
      return;
    }
    const [applications, bookings, reviews] = await Promise.all([
      query(client.from('opportunity_applications').select('*, trucks(name, cuisine), opportunities(title, starts_at, ends_at, host_locations(name, city, state))').in('opportunity_id', ids).order('applied_at', { ascending: false })),
      query(client.from('opportunity_bookings').select('*, trucks(name, cuisine), opportunities(title, starts_at, ends_at)').in('opportunity_id', ids).order('confirmed_at', { ascending: false })),
      query(client.from('opportunity_reviews').select('*').in('opportunity_id', ids).order('created_at', { ascending: false }))
    ]);
    state.host.applications = applications;
    state.host.bookings = bookings;
    state.host.reviews = reviews;
    const applicationIds = applications.map(item => item.id);
    state.host.messages = applicationIds.length ? await query(client.from('opportunity_messages').select('*').in('application_id', applicationIds).order('created_at')) : [];
  }

  function availabilityBadge(item) {
    if (sameLocalDay(item.starts_at)) return '<span class="marketplace-badge today">Available Today</span>';
    if (item.opportunity_type === 'recurring') return '<span class="marketplace-badge recurring">Recurring</span>';
    if (capacityLeft(item) <= 1) return '<span class="marketplace-badge almost-full">Almost Full</span>';
    return '<span class="marketplace-badge upcoming">Upcoming</span>';
  }

  function opportunityCard(item) {
    const distance = opportunityDistance(item);
    const estimate = profitability(item, distance);
    const saved = state.vendor.favorites.includes(item.id);
    const photo = safeImageUrl(asArray(item.location?.photos)[0]);
    return `<article class="opportunity-card opportunity-card-clickable" data-opportunity-card="${item.id}" aria-label="View ${escapeHtml(item.title)} opportunity">${photo ? `<img class="opportunity-card-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(item.location?.name)}">` : ''}
      <div class="opportunity-card-top"><div>${availabilityBadge(item)}${!Number(item.flat_vendor_fee) && !Number(item.sales_percentage) ? '<span class="marketplace-badge no-fee">No Fee</span>' : ''}${Number(item.minimum_sales_guarantee) ? '<span class="marketplace-badge guarantee">Guaranteed Minimum</span>' : ''}</div><button class="opportunity-favorite ${saved ? 'saved' : ''}" data-marketplace-favorite="${item.id}" type="button" aria-label="${saved ? 'Remove saved opportunity' : 'Save opportunity'}">${saved ? '♥' : '♡'}</button></div>
      <p class="eyebrow">${escapeHtml(item.event_type.replaceAll('_', ' '))}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="opportunity-location">📍 ${escapeHtml(item.location?.name)} · ${escapeHtml(item.location?.address_line1)}, ${escapeHtml(item.location?.city)}, ${escapeHtml(item.location?.state)}</p>
      <div class="opportunity-card-grid"><span><small>Date & hours</small><strong>${escapeHtml(dateTime(item.starts_at))}</strong><small>to ${escapeHtml(new Date(item.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</small></span><span><small>Distance</small><strong>${distance === null ? 'Enable location' : `${distance.toFixed(1)} miles`}</strong></span><span><small>Expected customers</small><strong>${Number(item.expected_customers).toLocaleString()}</strong></span><span><small>Truck spaces</small><strong>${capacityLeft(item)} of ${item.trucks_requested} open</strong><small>${item.trucks_booked} already booked</small></span><span><small>Vendor cost</small><strong>${escapeHtml(feeLabel(item))}</strong><small>${Number(item.minimum_sales_guarantee) ? `${money(item.minimum_sales_guarantee)} minimum guarantee` : 'No minimum guarantee'}</small></span><span><small>Host rating</small><strong>${Number(item.host?.average_rating || 0).toFixed(1)} ★</strong><small>${Number(item.host?.rating_count || 0)} review${Number(item.host?.rating_count || 0) === 1 ? '' : 's'}</small></span><span><small>Profitability</small><strong class="score-${estimate.label.toLowerCase().replace(' ', '-')}">${estimate.score}/100 · ${estimate.label}</strong></span></div>
      <div class="opportunity-amenities"><span>${item.electricity_available ? '⚡ Power' : 'No power'}</span><span>${item.water_available ? '💧 Water' : 'No water'}</span><span>${escapeHtml(asArray(item.cuisine_preferences).join(', ') || 'All cuisines')}</span></div>
      <p class="opportunity-instructions"><strong>Parking/setup:</strong> ${escapeHtml(item.parking_instructions || item.setup_instructions || 'View details for host instructions.')}</p>
      <div class="opportunity-card-actions"><button class="secondary-button" data-marketplace-view="${item.id}" type="button">View Opportunity</button><button class="primary-button" data-marketplace-apply="${item.id}" type="button">${item.booking_mode === 'instant' ? 'Book Now' : 'Request Spot'}</button></div>
    </article>`;
  }

  function filterMarkup(todayOnly) {
    const filters = state.vendor.filters;
    const selected = (name, value) => filters[name] === value ? ' selected' : '';
    const checked = name => filters[name] ? ' checked' : '';
    return `<form id="marketplaceFilters" class="marketplace-filters">
      <label>Sort<select name="sort"><option value="${todayOnly ? 'soon' : 'date'}">${todayOnly ? 'Starting Soon' : 'Date'}</option><option value="closest"${selected('sort', 'closest')}>Closest</option><option value="profit"${selected('sort', 'profit')}>Highest Profit Potential</option><option value="crowd"${selected('sort', 'crowd')}>Largest Crowd</option><option value="fee"${selected('sort', 'fee')}>Lowest Fee</option></select></label>
      <label>Distance<select name="distance"><option value="">Any distance</option><option value="10"${selected('distance', '10')}>10 miles</option><option value="25"${selected('distance', '25')}>25 miles</option><option value="50"${selected('distance', '50')}>50 miles</option><option value="100"${selected('distance', '100')}>100 miles</option></select></label>
      <label>Date<input name="date" type="date" value="${escapeHtml(filters.date || '')}"></label><label>Starts after<input name="startTime" type="time" value="${escapeHtml(filters.startTime || '')}"></label><label>Ends before<input name="endTime" type="time" value="${escapeHtml(filters.endTime || '')}"></label><label>Cuisine<input name="cuisine" type="search" value="${escapeHtml(filters.cuisine || '')}" placeholder="BBQ, Mexican..."></label>
      <label>Minimum crowd<input name="minAttendance" type="number" min="0" step="25" value="${escapeHtml(filters.minAttendance || '')}" placeholder="Any"></label><label>Maximum competing trucks<input name="maxCompetition" type="number" min="0" step="1" value="${escapeHtml(filters.maxCompetition || '')}" placeholder="Any"></label><label>Maximum flat fee<input name="maxFee" type="number" min="0" step="10" value="${escapeHtml(filters.maxFee || '')}" placeholder="Any"></label><label>Maximum sales fee %<input name="maxPercentage" type="number" min="0" max="100" step="1" value="${escapeHtml(filters.maxPercentage || '')}" placeholder="Any"></label><label>Minimum guarantee<input name="minimumGuarantee" type="number" min="0" step="25" value="${escapeHtml(filters.minimumGuarantee || '')}" placeholder="Any"></label>
      <label>Event type<select name="eventType"><option value="">All types</option>${['lunch','dinner','community','private_event','festival','market','sports','other'].map(value => `<option value="${value}"${selected('eventType', value)}>${value.replaceAll('_', ' ')}</option>`).join('')}</select></label>
      <label>Location type<select name="locationType"><option value="">All locations</option>${['office','business_park','warehouse','manufacturing','apartments','hoa','church','school','college','hospital','dealership','construction','brewery','sports','pool','government','shopping_center','private_property','other'].map(value => `<option value="${value}"${selected('locationType', value)}>${value.replaceAll('_', ' ')}</option>`).join('')}</select></label>
      <label>Setting<select name="indoorOutdoor"><option value="">Indoor or outdoor</option><option value="indoor"${selected('indoorOutdoor', 'indoor')}>Indoor</option><option value="outdoor"${selected('indoorOutdoor', 'outdoor')}>Outdoor</option></select></label><label>Schedule<select name="opportunityType"><option value="">One-time or recurring</option><option value="one_time"${selected('opportunityType', 'one_time')}>One-time</option><option value="recurring"${selected('opportunityType', 'recurring')}>Recurring</option></select></label>
      <div class="marketplace-filter-checks"><label><input name="noFee" type="checkbox"${checked('noFee')}> No fee</label><label><input name="power" type="checkbox"${checked('power')}> Power</label><label><input name="water" type="checkbox"${checked('water')}> Water</label></div>
      <button class="primary-button" type="submit">Apply Filters</button><button class="secondary-button" data-marketplace-clear-filters type="button">Clear</button>
    </form>`;
  }

  function mapMarkup(items) {
    if (!items.length) return '<div class="opportunity-empty"><span>🗺️</span><h3>No opportunities match these filters</h3><p>Try clearing a filter or checking another date.</p></div>';
    const coordinates = items.filter(item => Number.isFinite(Number(item.location?.latitude)) && Number.isFinite(Number(item.location?.longitude)));
    if (!coordinates.length) return '<div class="opportunity-empty"><span>📍</span><h3>These hosts have not added map coordinates yet</h3><p>Use List View for full address and opportunity details.</p></div>';
    const lats = coordinates.map(item => Number(item.location.latitude));
    const lngs = coordinates.map(item => Number(item.location.longitude));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return `<div class="opportunity-map" aria-label="Opportunity map">${coordinates.map((item, index) => {
      const top = 12 + (1 - (Number(item.location.latitude) - minLat) / Math.max(0.001, maxLat - minLat)) * 72;
      const left = 10 + ((Number(item.location.longitude) - minLng) / Math.max(0.001, maxLng - minLng)) * 78;
      return `<button class="opportunity-map-pin ${sameLocalDay(item.starts_at) ? 'today' : item.opportunity_type === 'recurring' ? 'recurring' : ''}" style="top:${top}%;left:${left}%" data-marketplace-view="${item.id}" type="button" aria-label="${escapeHtml(item.title)}"><span>${index + 1}</span><small>${escapeHtml(item.title)}</small></button>`;
    }).join('')}<div class="opportunity-map-legend"><span><i class="today"></i> Today</span><span><i></i> Upcoming</span><span><i class="recurring"></i> Recurring</span></div></div>`;
  }

  function vendorTabs() {
    const tabs = [['discover', 'Find Locations'], ['today', 'Open Spots Today'], ['applications', 'Applications'], ['messages', 'Messages'], ['bookings', 'Bookings'], ['route', 'Weekly Route'], ['notifications', 'Alerts']];
    return `<div class="marketplace-tabs" role="tablist">${tabs.map(([key, label]) => `<button class="${state.vendor.tab === key ? 'active' : ''}" data-vendor-marketplace-tab="${key}" type="button">${label}</button>`).join('')}</div>`;
  }

  function applicationsMarkup() {
    if (!state.vendor.applications.length) return empty('📨', 'No applications yet', 'Request a spot and your application status will appear here.');
    return `<div class="marketplace-record-list">${state.vendor.applications.map(item => `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.opportunities?.title || 'Opportunity')}</h3><p>${escapeHtml(item.opportunities?.host_locations?.name || '')} · ${escapeHtml(dateTime(item.opportunities?.starts_at))}</p>${item.host_response ? `<small>Host response: ${escapeHtml(item.host_response)}</small>` : ''}</div><button class="secondary-button" data-marketplace-message="${item.id}" type="button">Open Conversation</button></article>`).join('')}</div>`;
  }

  function conversationItems(application, messages) {
    const initial = clean(application?.vendor_message) ? [{
      id: `application-${application.id}`,
      application_id: application.id,
      sender_role: 'vendor',
      body: application.vendor_message,
      created_at: application.applied_at
    }] : [];
    return [...initial, ...messages]
      .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function vendorMessagesMarkup() {
    if (!state.vendor.applications.length) return empty('💬', 'No event conversations', 'Apply for an opportunity to start a conversation with its Host.');
    return `<div class="marketplace-record-list">${state.vendor.applications.map(item => { const thread = conversationItems(item, state.vendor.messages.filter(message => message.application_id === item.id)); const last = thread.at(-1); return `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.opportunities?.title || 'Opportunity')}</h3><p>${escapeHtml(item.opportunities?.host_locations?.name || 'Host location')}</p><small>${last ? escapeHtml(last.body) : 'No messages yet. Ask the Host a question about this event.'}</small></div><button class="primary-button" data-marketplace-message="${item.id}" type="button">${thread.length ? 'Reply' : 'Start Conversation'}</button></article>`; }).join('')}</div>`;
  }

  function bookingsMarkup() {
    if (!state.vendor.bookings.length) return empty('📅', 'No confirmed bookings', 'Approved and instant bookings will appear here.');
    return `<div class="marketplace-record-list">${state.vendor.bookings.map(item => { const ended = new Date(item.opportunities?.ends_at) < new Date(); const reviewed = state.vendor.reviews.some(review => review.booking_id === item.id); return `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status.replaceAll('_', ' '))}</span><h3>${escapeHtml(item.opportunities?.title || 'Booking')}</h3><p>${escapeHtml(item.opportunities?.host_locations?.name || '')} · ${escapeHtml(dateTime(item.opportunities?.starts_at))}</p><small>${escapeHtml(item.opportunities?.setup_instructions || 'Setup instructions will appear here.')}</small></div><div class="stacked-actions">${item.status === 'confirmed' ? `<button class="secondary-button" data-booking-contact="${item.id}" type="button">Contact Details</button>` : ''}<a class="secondary-button marketplace-link-button" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.opportunities?.host_locations?.address_line1, item.opportunities?.host_locations?.city, item.opportunities?.host_locations?.state, item.opportunities?.host_locations?.postal_code].filter(Boolean).join(', '))}">Navigate</a>${item.opportunities?.opportunity_type === 'recurring' ? `<button class="primary-button" data-route-booking="${item.id}" type="button">Add to Weekly Route</button>` : ''}${ended && !reviewed ? `<button class="secondary-button" data-review-booking="${item.id}" type="button">Leave Review</button>` : ''}</div></article>`; }).join('')}</div>`;
  }

  function routeMarkup() {
    const route = state.vendor.routes[0];
    const stops = asArray(route?.vendor_route_stops).sort((a, b) => a.day_of_week - b.day_of_week || a.sort_order - b.sort_order);
    const fees = stops.reduce((sum, stop) => sum + Number(stop.opportunity_bookings?.opportunities?.flat_vendor_fee || 0), 0);
    const hours = stops.reduce((sum, stop) => sum + Math.max(0, (new Date(stop.opportunity_bookings?.opportunities?.ends_at) - new Date(stop.opportunity_bookings?.opportunities?.starts_at)) / 3600000), 0);
    const projected = stops.reduce((sum, stop) => sum + profitability(stop.opportunity_bookings?.opportunities || {}, null).projectedSales, 0);
    const routeMiles = stops.reduce((sum, stop) => {
      const location = stop.opportunity_bookings?.opportunities?.host_locations;
      const oneWay = haversineMiles(state.vendor.location, location);
      return sum + (oneWay === null ? 0 : oneWay * 2);
    }, 0);
    const travelCost = routeMiles * 0.67;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `<section class="route-summary-grid"><article><small>Estimated weekly sales</small><strong>${money(projected)}</strong></article><article><small>Total vendor fees</small><strong>${money(fees)}</strong></article><article><small>Round-trip mileage</small><strong>${state.vendor.location ? `${routeMiles.toFixed(1)} mi` : 'Enable location'}</strong></article><article><small>Estimated travel cost</small><strong>${state.vendor.location ? money(travelCost) : 'Not calculated'}</strong></article><article><small>Operating hours</small><strong>${hours.toFixed(1)}</strong></article><article><small>Estimated weekly profit</small><strong>${money(Math.max(0, projected - fees - projected * 0.3 - hours * 45 - travelCost))}</strong></article></section>${stops.length ? `<div class="weekly-route">${days.map((day, index) => `<section><strong>${day}</strong>${stops.filter(stop => stop.day_of_week === index).map(stop => `<div><span>${escapeHtml(stop.opportunity_bookings?.opportunities?.title)}</span><small>${escapeHtml(stop.opportunity_bookings?.opportunities?.host_locations?.name || '')}</small></div>`).join('') || '<small>Open</small>'}</section>`).join('')}</div><p class="estimate-disclaimer">Mileage is estimated as a round trip from your current location. Travel uses a $0.67-per-mile planning rate. All sales, cost, and profit figures are estimates—not guaranteed income.</p>` : empty('🛣️', 'Your weekly route is empty', 'Add confirmed recurring bookings to build a dependable weekly schedule.')}`;
  }

  function notificationsMarkup(items) {
    if (!items.length) return empty('🔔', 'No marketplace alerts yet', 'Nearby opportunities, decisions, reminders, and host messages will appear here.');
    return `<div class="marketplace-notifications">${items.map(item => `<article class="${item.is_read ? '' : 'unread'}"><span>${item.kind === 'message' ? '💬' : item.kind === 'booking' ? '✅' : '📍'}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${escapeHtml(dateTime(item.created_at))}</small></div></article>`).join('')}</div><button class="secondary-button" data-marketplace-read-all type="button">Mark All Read</button>`;
  }

  function empty(icon, title, copy) {
    return `<div class="opportunity-empty"><span>${icon}</span><h3>${title}</h3><p>${copy}</p></div>`;
  }

  function vendorContent() {
    if (state.vendor.tab === 'applications') return applicationsMarkup();
    if (state.vendor.tab === 'messages') return vendorMessagesMarkup();
    if (state.vendor.tab === 'bookings') return bookingsMarkup();
    if (state.vendor.tab === 'route') return routeMarkup();
    if (state.vendor.tab === 'notifications') return notificationsMarkup(state.vendor.notifications);
    const todayOnly = state.vendor.tab === 'today';
    const items = filteredOpportunities(todayOnly);
    return `${filterMarkup(todayOnly)}<div class="marketplace-results-bar"><div><strong>${items.length} ${todayOnly ? 'open spot' : 'opportunit'}${items.length === 1 ? (todayOnly ? 'y' : 'y') : (todayOnly ? 'ies' : 'ies')}</strong><small>${state.vendor.location ? 'Sorted using your current location' : 'Enable location to calculate distance'}</small></div><div><button class="secondary-button" data-marketplace-location type="button">📍 ${state.vendor.location ? 'Location On' : 'Use My Location'}</button><button class="marketplace-view-toggle ${state.vendor.view === 'list' ? 'active' : ''}" data-marketplace-view-mode="list" type="button">List</button><button class="marketplace-view-toggle ${state.vendor.view === 'map' ? 'active' : ''}" data-marketplace-view-mode="map" type="button">Map</button></div></div>${state.vendor.view === 'map' ? mapMarkup(items) : `<div class="opportunity-grid">${items.length ? items.map(opportunityCard).join('') : empty('🚚', 'No opportunities match', 'Clear filters or check again as hosts post new openings.')}</div>`}`;
  }

  function renderVendorRoot() {
    const root = document.getElementById('vendorOpportunityMarketplace');
    if (!root) return;
    root.innerHTML = `<section class="marketplace-hero"><div><p class="eyebrow">Location Opportunity Marketplace</p><h2>Where can your truck go and make money?</h2><p>Compare customers, fees, competition, distance, and estimated profit before committing.</p></div><button class="marketplace-hero-stat" data-vendor-marketplace-tab="discover" data-marketplace-show-available type="button" aria-label="View ${state.vendor.opportunities.length} available opportunities"><strong>${state.vendor.opportunities.length}</strong><span>available opportunities</span><small>Click to view</small></button></section>${vendorTabs()}<section class="marketplace-panel">${vendorContent()}</section>`;
  }

  async function renderVendor() {
    const root = document.getElementById('vendorOpportunityMarketplace');
    if (!root) return;
    state.activeRole = 'vendor';
    root.innerHTML = '<div class="marketplace-loading">Finding profitable opportunities…</div>';
    try { await loadVendorData(); renderVendorRoot(); }
    catch (error) { root.innerHTML = `<div class="marketplace-error"><strong>Marketplace unavailable</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" data-marketplace-retry-vendor type="button">Try Again</button></div>`; }
  }

  function hostShellMarkup() {
    return `<div id="hostOpportunityMarketplace" class="host-marketplace"><div class="marketplace-loading">Loading host opportunities…</div></div>`;
  }

  function hostTabs() {
    const tabs = [['dashboard', 'Dashboard'], ['locations', 'Locations'], ['post', 'Post Opportunity'], ['applications', 'Applications'], ['bookings', 'Bookings'], ['messages', 'Messages'], ['reviews', 'Reviews'], ['contact', 'Contact']];
    return `<div class="marketplace-tabs host-tabs" role="tablist">${tabs.map(([key, label]) => `<button class="${state.host.tab === key ? 'active' : ''}" data-host-marketplace-tab="${key}" type="button">${label}</button>`).join('')}</div>`;
  }

  function hostProfileForm(profile = null) {
    const selected = value => profile?.host_kind === value ? ' selected' : '';
    const editing = Boolean(profile);
    return `<section class="host-onboarding"><p class="eyebrow">Location Host</p><h2>${editing ? 'Host Contact Information' : 'Create your host account'}</h2><p>${editing ? 'Keep these details current. They are shared only with food trucks after a booking is confirmed.' : 'Businesses, property managers, and organizers can request food trucks without creating a separate login.'}</p><form id="hostProfileForm" class="marketplace-form"><label>Your name<input name="hostName" required maxlength="120" value="${escapeHtml(profile?.host_name || '')}"></label><label>Business or property name<input name="businessName" required maxlength="160" value="${escapeHtml(profile?.business_name || '')}"></label><label>Host type<select name="hostKind" required><option value="business"${selected('business')}>Business</option><option value="property_manager"${selected('property_manager')}>Property manager</option><option value="event_organizer"${selected('event_organizer')}>Event organizer</option><option value="community"${selected('community')}>Community/HOA</option><option value="other"${selected('other')}>Other</option></select></label><label>Contact email<input name="email" type="email" required autocomplete="email" value="${escapeHtml(profile?.contact_email || '')}"></label><label>Contact phone<input name="phone" type="tel" required autocomplete="tel" value="${escapeHtml(profile?.contact_phone || '')}"></label><button class="primary-button" type="submit">${editing ? 'Save Contact Information' : 'Create Host Account'}</button><p class="form-message" data-marketplace-form-message></p></form></section>`;
  }

  function locationForm() {
    return `<form id="hostLocationForm" class="marketplace-form marketplace-form-grid"><input name="locationId" type="hidden"><label>Location name<input name="name" required maxlength="160" placeholder="Bowie Business Park"></label><label>Location type<select name="locationType" required><option value="office">Office</option><option value="business_park">Business park</option><option value="warehouse">Warehouse</option><option value="manufacturing">Manufacturing</option><option value="apartments">Apartment community</option><option value="hoa">HOA</option><option value="church">Church</option><option value="school">School</option><option value="college">College</option><option value="hospital">Hospital</option><option value="dealership">Car dealership</option><option value="construction">Construction site</option><option value="brewery">Brewery</option><option value="sports">Sports facility</option><option value="government">Government facility</option><option value="shopping_center">Shopping center</option><option value="private_property">Private property</option><option value="other">Other</option></select></label><label class="wide">Street address<input name="address1" required maxlength="180"></label><label>Address line 2<input name="address2" maxlength="180"></label><label>City<input name="city" required></label><label>State<input name="state" required maxlength="40"></label><label>ZIP/postal code<input name="postalCode" required maxlength="16"></label><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="0.000001" placeholder="Optional"></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="0.000001" placeholder="Optional"></label><label class="wide">Photo links<input name="photos" type="url" placeholder="https://... (separate multiple links with commas)"><small>Use secure HTTPS image links. Photos help vendors recognize the setup area.</small></label><label class="wide">Parking instructions<textarea name="parking" maxlength="1200"></textarea></label><label class="wide">Setup instructions<textarea name="setup" maxlength="1200"></textarea></label><div class="marketplace-filter-checks wide"><label><input name="electricity" type="checkbox"> Electricity</label><label><input name="water" type="checkbox"> Water</label><label><input name="restrooms" type="checkbox"> Restrooms</label><label><input name="trash" type="checkbox"> Trash disposal</label></div><button class="primary-button" type="submit">Save Location</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function opportunityForm() {
    if (!state.host.locations.length) return empty('📍', 'Add a host location first', 'Opportunities must be connected to a verified address and setup location.');
    return `<form id="hostOpportunityForm" class="marketplace-form marketplace-form-grid"><input name="opportunityId" type="hidden"><label class="wide">Opportunity name<input name="title" required maxlength="180" placeholder="Wednesday Lunch Opening"></label><label>Host location<select name="locationId" required>${state.host.locations.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Opportunity type<select name="opportunityType"><option value="one_time">One time</option><option value="recurring">Recurring</option></select></label><label>Event type<select name="eventType"><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="community">Community</option><option value="private_event">Private event</option><option value="festival">Festival</option><option value="market">Market</option><option value="sports">Sports</option><option value="other">Other</option></select></label><label>Booking method<select name="bookingMode"><option value="request">Host approval required</option><option value="instant">Immediate booking</option></select></label><label>Starts<input name="startsAt" type="datetime-local" required></label><label>Ends<input name="endsAt" type="datetime-local" required></label><label>Arrival time<input name="arrivalTime" type="datetime-local"></label><label>Expected customers<input name="expectedCustomers" type="number" min="1" required></label><label>Trucks requested<input name="trucksRequested" type="number" min="1" max="100" required></label><label>Cuisines requested<input name="cuisines" placeholder="BBQ, Mexican, Caribbean"></label><label>Indoor/outdoor<select name="indoorOutdoor"><option value="outdoor">Outdoor</option><option value="indoor">Indoor</option><option value="both">Both</option></select></label><label>Flat vendor fee<input name="flatFee" type="number" min="0" step="0.01" value="0"></label><label>Percentage of sales<input name="percentageFee" type="number" min="0" max="100" step="0.01" value="0"></label><label>Minimum sales guarantee<input name="minimumGuarantee" type="number" min="0" step="0.01" value="0"></label><label>Refundable deposit<input name="deposit" type="number" min="0" step="0.01" value="0"></label><label class="wide">Description<textarea name="description" maxlength="2000"></textarea></label><label class="wide">Parking instructions<textarea name="parking" maxlength="1200"></textarea></label><label class="wide">Setup instructions<textarea name="setup" maxlength="1200"></textarea></label><label class="wide">Special requirements<textarea name="requirements" maxlength="1200"></textarea></label><label class="wide">Cancellation policy<textarea name="cancellation" maxlength="1200"></textarea></label><div class="marketplace-filter-checks wide"><label><input name="electricity" type="checkbox"> Electricity available</label><label><input name="water" type="checkbox"> Water available</label></div><div class="recurrence-fields wide"><label>Repeat every<select name="frequency"><option value="weekly">Week</option><option value="daily">Day</option><option value="monthly">Month</option></select></label><label>Until<input name="recurrenceEnds" type="date"></label><div class="marketplace-filter-checks"><label><input name="day" value="1" type="checkbox"> Mon</label><label><input name="day" value="2" type="checkbox"> Tue</label><label><input name="day" value="3" type="checkbox"> Wed</label><label><input name="day" value="4" type="checkbox"> Thu</label><label><input name="day" value="5" type="checkbox"> Fri</label><label><input name="day" value="6" type="checkbox"> Sat</label><label><input name="day" value="0" type="checkbox"> Sun</label></div></div><button class="primary-button" type="submit">Publish Opportunity</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function hostDashboard() {
    const open = state.host.opportunities.filter(item => item.status === 'published').length;
    const pending = state.host.applications.filter(item => item.status === 'pending').length;
    return `<section class="host-summary-grid"><article><span>Open Opportunities</span><strong>${open}</strong></article><article><span>Pending Applications</span><strong>${pending}</strong></article><article><span>Approved Visits</span><strong>${state.host.bookings.filter(item => item.status === 'confirmed').length}</strong></article><article><span>Host Rating</span><strong>${Number(state.host.profile.average_rating || 0).toFixed(1)} ★</strong></article></section><div class="host-quick-actions"><button class="primary-button" data-host-marketplace-tab="post" type="button">+ Post Opportunity</button><button class="secondary-button" data-host-marketplace-tab="applications" type="button">Review Applications</button></div><section class="marketplace-record-list">${state.host.opportunities.length ? state.host.opportunities.slice(0, 5).map(item => `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(dateTime(item.starts_at))} · ${Number(item.expected_customers).toLocaleString()} expected customers</p></div><button class="secondary-button" data-edit-opportunity="${item.id}" type="button">Edit</button></article>`).join('') : empty('📣', 'No opportunities posted', 'Create your first one-time or recurring food truck opening.')}</section>`;
  }

  function hostLocationsMarkup() {
    return `<div class="marketplace-split"><section><h3>Saved Locations</h3>${state.host.locations.length ? `<div class="marketplace-record-list">${state.host.locations.map(item => `<article><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.address_line1)}, ${escapeHtml(item.city)}, ${escapeHtml(item.state)} ${escapeHtml(item.postal_code)}</p><small>${item.electricity_available ? 'Power · ' : ''}${item.water_available ? 'Water · ' : ''}${escapeHtml(item.location_type.replaceAll('_', ' '))}</small></div><button class="secondary-button" data-edit-host-location="${item.id}" type="button">Edit</button></article>`).join('')}</div>` : empty('📍', 'No host locations', 'Add the exact property where food trucks will operate.')}</section><section><h3>Add or Edit Location</h3>${locationForm()}</section></div>`;
  }

  function hostApplicationsMarkup() {
    if (!state.host.applications.length) return empty('📨', 'No applications yet', 'Vendor applications will appear after you publish an approval-required opportunity.');
    return `<div class="marketplace-record-list">${state.host.applications.map(item => `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.trucks?.name || 'Food Truck')}</h3><p>${escapeHtml(item.opportunities?.title || 'Opportunity')} · ${escapeHtml(item.trucks?.cuisine || 'Cuisine not listed')}</p><small>${escapeHtml(item.vendor_message || 'No opening message. You can still start this event conversation.')}</small></div><div class="stacked-actions">${['pending', 'waitlisted'].includes(item.status) ? `<button class="primary-button" data-host-decision="approved" data-application-id="${item.id}" type="button">Approve</button><button class="secondary-button" data-host-decision="waitlisted" data-application-id="${item.id}" type="button">Waitlist</button><button class="danger-button" data-host-decision="declined" data-application-id="${item.id}" type="button">Decline</button>` : ''}<button class="secondary-button" data-marketplace-message="${item.id}" type="button">Reply</button></div></article>`).join('')}</div>`;
  }

  function hostBookingsMarkup() {
    if (!state.host.bookings.length) return empty('📅', 'No approved food truck visits', 'Approved and instant bookings will appear here.');
    return `<div class="marketplace-record-list">${state.host.bookings.map(item => { const ended = new Date(item.opportunities?.ends_at) < new Date(); const reviewed = state.host.reviews.some(review => review.booking_id === item.id && review.reviewer_role === 'host'); return `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status.replaceAll('_', ' '))}</span><h3>${escapeHtml(item.trucks?.name || 'Food Truck')}</h3><p>${escapeHtml(item.opportunities?.title || '')} · ${escapeHtml(dateTime(item.opportunities?.starts_at))}</p></div><div class="stacked-actions">${item.status === 'confirmed' ? `<button class="secondary-button" data-booking-contact="${item.id}" type="button">Contact Details</button>` : ''}${item.application_id ? `<button class="secondary-button" data-marketplace-message="${item.application_id}" type="button">Message Vendor</button>` : ''}${ended && !reviewed ? `<button class="primary-button" data-review-booking="${item.id}" type="button">Rate Vendor</button>` : ''}</div></article>`; }).join('')}</div>`;
  }

  function hostMessagesMarkup() {
    if (!state.host.applications.length) return empty('💬', 'No opportunity conversations', 'Messaging opens after a vendor applies or books.');
    return `<div class="marketplace-record-list">${state.host.applications.map(item => { const thread = conversationItems(item, state.host.messages.filter(message => message.application_id === item.id)); const last = thread.at(-1); return `<article><div><span class="status-pill ${item.status}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.opportunities?.title || 'Opportunity')}</h3><p>${escapeHtml(item.trucks?.name || 'Food Truck')}</p><small>${last ? escapeHtml(last.body) : 'No messages yet. Start this event conversation.'}</small></div><button class="primary-button" data-marketplace-message="${item.id}" type="button">${thread.length ? 'Reply' : 'Start Conversation'}</button></article>`; }).join('')}</div>`;
  }

  function hostReviewsMarkup() {
    if (!state.host.reviews.length) return empty('★', 'No reviews yet', 'Completed opportunity ratings will appear here.');
    return `<div class="marketplace-record-list">${state.host.reviews.map(item => `<article><div><strong>${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</strong><p>${escapeHtml(item.comment || 'No written review.')}</p><small>Submitted by ${escapeHtml(item.reviewer_role)}</small></div></article>`).join('')}</div>`;
  }

  function hostContent() {
    if (state.host.tab === 'locations') return hostLocationsMarkup();
    if (state.host.tab === 'post') return `<section><p class="eyebrow">New Opening</p><h2>Post a food truck opportunity</h2><p>All fees and requirements are shown to vendors before they request or book.</p>${opportunityForm()}</section>`;
    if (state.host.tab === 'applications') return hostApplicationsMarkup();
    if (state.host.tab === 'bookings') return hostBookingsMarkup();
    if (state.host.tab === 'messages') return hostMessagesMarkup();
    if (state.host.tab === 'reviews') return hostReviewsMarkup();
    if (state.host.tab === 'contact') return hostProfileForm(state.host.profile);
    return hostDashboard();
  }

  function renderHostRoot() {
    const root = document.getElementById('hostOpportunityMarketplace');
    if (!root) return;
    if (!state.host.profile) { root.innerHTML = hostProfileForm(); return; }
    root.innerHTML = `<section class="marketplace-hero host"><div><p class="eyebrow">Host Opportunity Center</p><h2>${escapeHtml(state.host.profile.business_name)}</h2><p>Request food trucks, review applicants, and manage recurring visits.</p></div><span class="status-pill ${state.host.profile.verification_status}">${escapeHtml(state.host.profile.verification_status)}</span></section>${hostTabs()}<section class="marketplace-panel">${hostContent()}</section>`;
  }

  async function mountHost() {
    const root = document.getElementById('hostOpportunityMarketplace');
    if (!root) return;
    state.activeRole = 'host';
    try { await loadHostData(); renderHostRoot(); }
    catch (error) { root.innerHTML = `<div class="marketplace-error"><strong>Host marketplace unavailable</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" data-marketplace-retry-host type="button">Try Again</button></div>`; }
  }

  function opportunityModal(item) {
    const distance = opportunityDistance(item);
    const estimate = profitability(item, distance);
    return `<p class="eyebrow">Opportunity Details</p><h2 id="customerModalTitle">${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || 'The host has not added a description.')}</p><div class="opportunity-detail-grid"><span><small>Location</small><strong>${escapeHtml(item.location?.name)}</strong><p>${escapeHtml(item.location?.address_line1)}, ${escapeHtml(item.location?.city)}, ${escapeHtml(item.location?.state)} ${escapeHtml(item.location?.postal_code)}</p></span><span><small>Date and time</small><strong>${escapeHtml(dateTime(item.starts_at))}</strong><p>Ends ${escapeHtml(dateTime(item.ends_at))}</p></span><span><small>Expected customers</small><strong>${Number(item.expected_customers).toLocaleString()}</strong></span><span><small>Competition</small><strong>${item.trucks_booked} booked · ${capacityLeft(item)} open</strong></span><span><small>Vendor fee</small><strong>${escapeHtml(feeLabel(item))}</strong></span><span><small>Minimum guarantee</small><strong>${money(item.minimum_sales_guarantee)}</strong></span></div><section class="profitability-detail"><div><span class="profitability-score">${estimate.score}</span><div><p class="eyebrow">Profitability Score</p><h3>${estimate.label}</h3></div></div><div class="profitability-reasons"><section><strong>Positive</strong>${estimate.positive.map(reason => `<p>+ ${escapeHtml(reason)}</p>`).join('') || '<p>No strong positive signals yet.</p>'}</section><section><strong>Watch</strong>${estimate.negative.map(reason => `<p>− ${escapeHtml(reason)}</p>`).join('') || '<p>No major risks identified.</p>'}</section></div><div class="estimate-table"><span>Projected sales <strong>${money(estimate.projectedSales)}</strong></span><span>Vendor fees <strong>−${money(estimate.vendorFee)}</strong></span><span>Estimated food cost <strong>−${money(estimate.foodCost)}</strong></span><span>Estimated labor <strong>−${money(estimate.laborCost)}</strong></span><span>Estimated travel <strong>−${money(estimate.travelCost)}</strong></span><span class="total">Estimated profit <strong>${money(estimate.estimatedProfit)}</strong></span></div><p class="estimate-disclaimer">This is an estimate based on host-provided attendance and planning assumptions. FoodTrekNow does not guarantee sales or income.</p></section><section><h3>Setup and requirements</h3><p><strong>Parking:</strong> ${escapeHtml(item.parking_instructions || 'Not specified')}</p><p><strong>Setup:</strong> ${escapeHtml(item.setup_instructions || 'Not specified')}</p><p><strong>Special requirements:</strong> ${escapeHtml(item.special_requirements || 'None listed')}</p><p><strong>Cancellation:</strong> ${escapeHtml(item.cancellation_policy || 'Ask the host before booking.')}</p></section><div class="opportunity-card-actions"><button class="primary-button" data-marketplace-apply="${item.id}" type="button">${item.booking_mode === 'instant' ? 'Book Now' : 'Request Spot'}</button></div>`;
  }

  function openMarketplaceModal(html) {
    const modal = document.getElementById('customerAccountModal');
    const content = document.getElementById('customerAccountModalContent');
    if (modal && content) {
      if (modal.parentElement !== document.body) document.body.appendChild(modal);
      content.innerHTML = html;
      modal.classList.remove('hidden');
      return;
    }
    let marketplaceModal = document.getElementById('marketplaceModal');
    if (!marketplaceModal) {
      marketplaceModal = document.createElement('div'); marketplaceModal.id = 'marketplaceModal'; marketplaceModal.className = 'modal';
      marketplaceModal.innerHTML = '<div class="modal-card marketplace-modal-card"><button class="modal-close" data-close-marketplace-modal type="button" aria-label="Close">×</button><div data-marketplace-modal-content></div></div>';
      document.body.appendChild(marketplaceModal);
    }
    marketplaceModal.querySelector('[data-marketplace-modal-content]').innerHTML = html;
    marketplaceModal.classList.remove('hidden');
  }

  function messageModal(applicationId) {
    const application = [...state.vendor.applications, ...state.host.applications].find(item => item.id === applicationId);
    const savedMessages = [...state.vendor.messages, ...state.host.messages].filter(item => item.application_id === applicationId);
    const messages = conversationItems(application, savedMessages);
    const counterpart = state.activeRole === 'host'
      ? application?.trucks?.name || 'Food Truck'
      : application?.opportunities?.host_locations?.name || 'Event Host';
    return `<p class="eyebrow">Event Conversation</p><h2 id="customerModalTitle">${escapeHtml(application?.opportunities?.title || 'Opportunity')}</h2><p>Conversation with ${escapeHtml(counterpart)}. Messages in this thread apply only to this event.</p><div class="message-thread marketplace-message-thread">${messages.length ? messages.map(item => `<article class="message-bubble ${item.sender_role === state.activeRole ? 'mine' : 'theirs'}"><strong>${escapeHtml(item.sender_role === 'host' ? 'Host' : 'Food Truck')}</strong><p>${escapeHtml(item.body)}</p><small>${escapeHtml(dateTime(item.created_at))}</small></article>`).join('') : '<p>No messages yet. Start the conversation below.</p>'}</div><form id="opportunityMessageForm" data-application-id="${applicationId}"><label>Reply to this event conversation<textarea name="body" required maxlength="1000" rows="3" placeholder="Type your reply here…"></textarea></label><button class="primary-button" type="submit">Send Reply</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function contactModal(contact) {
    const contactLink = (kind, value, label) => value ? `<a class="secondary-button marketplace-link-button" href="${kind}:${encodeURIComponent(value)}">${label}</a>` : '<span class="contact-unavailable">Not provided</span>';
    return `<p class="eyebrow">Confirmed Booking</p><h2 id="customerModalTitle">Contact Details</h2><p>These details are private to the Host and food truck assigned to this confirmed booking.</p><div class="opportunity-detail-grid"><span><small>Host</small><strong>${escapeHtml(contact.host_business_name || contact.host_name || 'Host')}</strong><p>${escapeHtml(contact.host_name || '')}</p><p>${escapeHtml(contact.host_email || 'Email not provided')}</p><p>${escapeHtml(contact.host_phone || 'Phone not provided')}</p><div class="stacked-actions">${contactLink('mailto', contact.host_email, 'Email Host')}${contactLink('tel', contact.host_phone, 'Call Host')}</div></span><span><small>Food Truck</small><strong>${escapeHtml(contact.truck_name || 'Food Truck')}</strong><p>${escapeHtml(contact.truck_email || 'Email not provided')}</p><p>${escapeHtml(contact.truck_phone || 'Phone not provided')}</p><div class="stacked-actions">${contactLink('mailto', contact.truck_email, 'Email Food Truck')}${contactLink('tel', contact.truck_phone, 'Call Food Truck')}</div></span></div>`;
  }

  function reviewModal(bookingId) {
    return `<p class="eyebrow">Post-Opportunity Review</p><h2 id="customerModalTitle">Share your experience</h2><p>Reviews help vendors and hosts make better booking decisions. Keep feedback factual and professional.</p><form id="opportunityReviewForm" data-booking-id="${bookingId}" class="marketplace-form"><label>Overall rating<select name="rating" required><option value="5">5 - Excellent</option><option value="4">4 - Very good</option><option value="3">3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></label><label>Communication<select name="communication"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Accuracy of information<select name="accuracy"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Ease of setup / arrival<select name="setup"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Comments<textarea name="comment" maxlength="1200" rows="4"></textarea></label><button class="primary-button" type="submit">Submit Review</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  async function act(button, task, success) {
    button.disabled = true;
    try { await task(); toast(success); }
    catch (error) { toast(error.message, true); }
    finally { button.disabled = false; }
  }

  function toast(message, error = false) {
    const target = document.getElementById('toast') || document.getElementById('customerToast');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
    target.classList.add('show');
    setTimeout(() => target.classList.remove('show'), 3600);
  }

  document.addEventListener('click', async event => {
    const vendorTab = event.target.closest('[data-vendor-marketplace-tab]');
    if (vendorTab) {
      state.vendor.tab = vendorTab.dataset.vendorMarketplaceTab;
      renderVendorRoot();
      if (vendorTab.hasAttribute('data-marketplace-show-available')) document.querySelector('.marketplace-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const hostTab = event.target.closest('[data-host-marketplace-tab]');
    if (hostTab) { state.host.tab = hostTab.dataset.hostMarketplaceTab; renderHostRoot(); return; }
    if (event.target.closest('[data-marketplace-retry-vendor]')) { renderVendor(); return; }
    if (event.target.closest('[data-marketplace-retry-host]')) { mountHost(); return; }
    const viewMode = event.target.closest('[data-marketplace-view-mode]');
    if (viewMode) { state.vendor.view = viewMode.dataset.marketplaceViewMode; renderVendorRoot(); return; }
    if (event.target.closest('[data-marketplace-clear-filters]')) { state.vendor.filters = {}; renderVendorRoot(); return; }
    const view = event.target.closest('[data-marketplace-view]');
    if (view) { const item = state.vendor.opportunities.find(opportunity => opportunity.id === view.dataset.marketplaceView); if (item) openMarketplaceModal(opportunityModal(item)); return; }
    const opportunityCardTarget = event.target.closest('[data-opportunity-card]');
    if (opportunityCardTarget && !event.target.closest('button, a, input, select, textarea, label')) {
      const item = state.vendor.opportunities.find(opportunity => opportunity.id === opportunityCardTarget.dataset.opportunityCard);
      if (item) openMarketplaceModal(opportunityModal(item));
      return;
    }
    const favorite = event.target.closest('[data-marketplace-favorite]');
    if (favorite) {
      const id = favorite.dataset.marketplaceFavorite, saved = !state.vendor.favorites.includes(id);
      await act(favorite, async () => { await rpc('toggle_opportunity_favorite', { p_opportunity_id: id, p_saved: saved }); state.vendor.favorites = saved ? [...state.vendor.favorites, id] : state.vendor.favorites.filter(value => value !== id); renderVendorRoot(); }, saved ? 'Opportunity saved.' : 'Opportunity removed.'); return;
    }
    const apply = event.target.closest('[data-marketplace-apply]');
    if (apply) {
      const item = state.vendor.opportunities.find(opportunity => opportunity.id === apply.dataset.marketplaceApply);
      if (!item || !state.vendor.context?.truck?.id) return;
      const message = item.booking_mode === 'request' ? window.prompt('Add a short message for the host (optional):', '') : '';
      if (message === null) return;
      await act(apply, async () => { await rpc('apply_to_opportunity', { p_opportunity_id: item.id, p_truck_id: state.vendor.context.truck.id, p_vendor_message: message, p_action: item.booking_mode === 'instant' ? 'book' : 'request' }); await loadVendorData(); renderVendorRoot(); document.getElementById('customerAccountModal')?.classList.add('hidden'); document.getElementById('marketplaceModal')?.classList.add('hidden'); }, item.booking_mode === 'instant' ? 'Booking confirmed.' : 'Spot requested.'); return;
    }
    if (event.target.closest('[data-marketplace-location]')) {
      if (!navigator.geolocation) { toast('Location is not supported on this device.', true); return; }
      navigator.geolocation.getCurrentPosition(position => { state.vendor.location = { latitude: position.coords.latitude, longitude: position.coords.longitude }; renderVendorRoot(); toast('Distances updated using your current location.'); }, error => toast(error.message || 'Location permission was not granted.', true), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); return;
    }
    const decision = event.target.closest('[data-host-decision]');
    if (decision) { await act(decision, async () => { await rpc('decide_opportunity_application', { p_application_id: decision.dataset.applicationId, p_decision: decision.dataset.hostDecision, p_host_response: '' }); await loadHostData(); renderHostRoot(); }, `Application ${decision.dataset.hostDecision}.`); return; }
    const message = event.target.closest('[data-marketplace-message]');
    if (message) { state.selectedApplication = message.dataset.marketplaceMessage; openMarketplaceModal(messageModal(state.selectedApplication)); return; }
    const contact = event.target.closest('[data-booking-contact]');
    if (contact) {
      contact.disabled = true;
      try {
        const result = await rpc('get_marketplace_booking_contacts', { p_booking_id: contact.dataset.bookingContact });
        const details = asArray(result)[0];
        if (!details) throw new Error('Contact details are not available for this booking.');
        openMarketplaceModal(contactModal(details));
      } catch (error) { toast(error.message, true); }
      finally { contact.disabled = false; }
      return;
    }
    const review = event.target.closest('[data-review-booking]');
    if (review) { openMarketplaceModal(reviewModal(review.dataset.reviewBooking)); return; }
    const route = event.target.closest('[data-route-booking]');
    if (route) {
      const booking = state.vendor.bookings.find(item => item.id === route.dataset.routeBooking);
      const day = booking ? new Date(booking.opportunities?.starts_at).getDay() : 1;
      await act(route, async () => { await rpc('add_booking_to_weekly_route', { p_booking_id: route.dataset.routeBooking, p_day_of_week: day }); await loadVendorData(); state.vendor.tab = 'route'; renderVendorRoot(); }, 'Booking added to your weekly route.'); return;
    }
    if (event.target.closest('[data-marketplace-read-all]')) { await rpc('mark_marketplace_notifications_read'); if (state.vendor.context) { await loadVendorData(); renderVendorRoot(); } else { await loadHostData(); renderHostRoot(); } return; }
    const editLocation = event.target.closest('[data-edit-host-location]');
    if (editLocation) {
      const item = state.host.locations.find(location => location.id === editLocation.dataset.editHostLocation); const form = document.getElementById('hostLocationForm'); if (!item || !form) return;
      const values = { locationId: item.id, name: item.name, locationType: item.location_type, address1: item.address_line1, address2: item.address_line2, city: item.city, state: item.state, postalCode: item.postal_code, latitude: item.latitude, longitude: item.longitude, photos: asArray(item.photos).join(', '), parking: item.parking_instructions, setup: item.setup_instructions };
      Object.entries(values).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
      form.elements.electricity.checked = item.electricity_available; form.elements.water.checked = item.water_available; form.elements.restrooms.checked = item.restrooms_available; form.elements.trash.checked = item.trash_disposal_available; form.scrollIntoView({ behavior: 'smooth' }); return;
    }
    const editOpportunity = event.target.closest('[data-edit-opportunity]');
    if (editOpportunity) {
      const item = state.host.opportunities.find(opportunity => opportunity.id === editOpportunity.dataset.editOpportunity); if (!item) return;
      state.host.tab = 'post'; renderHostRoot(); const form = document.getElementById('hostOpportunityForm'); if (!form) return;
      const localInput = value => value ? new Date(value).toISOString().slice(0, 16) : '';
      const values = { opportunityId: item.id, locationId: item.location_id, title: item.title, description: item.description, opportunityType: item.opportunity_type, eventType: item.event_type, bookingMode: item.booking_mode, startsAt: localInput(item.starts_at), endsAt: localInput(item.ends_at), arrivalTime: localInput(item.arrival_time), expectedCustomers: item.expected_customers, trucksRequested: item.trucks_requested, cuisines: asArray(item.cuisine_preferences).join(', '), indoorOutdoor: item.indoor_outdoor, flatFee: item.flat_vendor_fee, percentageFee: item.sales_percentage, minimumGuarantee: item.minimum_sales_guarantee, deposit: item.refundable_deposit, parking: item.parking_instructions, setup: item.setup_instructions, requirements: item.special_requirements, cancellation: item.cancellation_policy };
      Object.entries(values).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; }); form.elements.electricity.checked = item.electricity_available; form.elements.water.checked = item.water_available; form.scrollIntoView({ behavior: 'smooth' }); return;
    }
    if (event.target.closest('[data-close-marketplace-modal]')) document.getElementById('marketplaceModal')?.classList.add('hidden');
  });

  document.addEventListener('submit', async event => {
    if (event.target.id === 'marketplaceFilters') {
      event.preventDefault(); const form = new FormData(event.target); state.vendor.filters = Object.fromEntries(form.entries()); ['noFee', 'power', 'water'].forEach(key => state.vendor.filters[key] = event.target.elements[key].checked); renderVendorRoot(); return;
    }
    if (event.target.id === 'hostProfileForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      const editing = Boolean(state.host.profile);
      await act(button, async () => { await rpc('upsert_location_host', { p_host_kind: data.get('hostKind'), p_host_name: data.get('hostName'), p_business_name: data.get('businessName'), p_contact_email: data.get('email'), p_contact_phone: data.get('phone') }); await loadHostData(); if (editing) state.host.tab = 'contact'; renderHostRoot(); }, editing ? 'Host contact information saved.' : 'Host account created.'); return;
    }
    if (event.target.id === 'hostLocationForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const form = event.target; const data = new FormData(form);
      await act(button, async () => { await rpc('save_host_location', { p_location_id: data.get('locationId') || null, p_name: data.get('name'), p_location_type: data.get('locationType'), p_address_line1: data.get('address1'), p_address_line2: data.get('address2'), p_city: data.get('city'), p_state: data.get('state'), p_postal_code: data.get('postalCode'), p_latitude: data.get('latitude') || null, p_longitude: data.get('longitude') || null, p_parking_instructions: data.get('parking'), p_setup_instructions: data.get('setup'), p_electricity_available: form.elements.electricity.checked, p_water_available: form.elements.water.checked, p_restrooms_available: form.elements.restrooms.checked, p_trash_disposal_available: form.elements.trash.checked, p_photos: clean(data.get('photos')).split(',').map(value => value.trim()).filter(Boolean) }); await loadHostData(); renderHostRoot(); }, 'Host location saved.'); return;
    }
    if (event.target.id === 'hostOpportunityForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const form = event.target; const data = new FormData(form); const days = [...form.querySelectorAll('input[name="day"]:checked')].map(input => Number(input.value));
      await act(button, async () => { await rpc('publish_opportunity', { p_opportunity_id: data.get('opportunityId') || null, p_location_id: data.get('locationId'), p_title: data.get('title'), p_description: data.get('description'), p_opportunity_type: data.get('opportunityType'), p_event_type: data.get('eventType'), p_booking_mode: data.get('bookingMode'), p_starts_at: new Date(data.get('startsAt')).toISOString(), p_ends_at: new Date(data.get('endsAt')).toISOString(), p_expected_customers: Number(data.get('expectedCustomers')), p_trucks_requested: Number(data.get('trucksRequested')), p_cuisine_preferences: clean(data.get('cuisines')).split(',').map(value => value.trim()).filter(Boolean), p_indoor_outdoor: data.get('indoorOutdoor'), p_flat_vendor_fee: Number(data.get('flatFee') || 0), p_sales_percentage: Number(data.get('percentageFee') || 0), p_minimum_sales_guarantee: Number(data.get('minimumGuarantee') || 0), p_refundable_deposit: Number(data.get('deposit') || 0), p_electricity_available: form.elements.electricity.checked, p_water_available: form.elements.water.checked, p_arrival_time: data.get('arrivalTime') ? new Date(data.get('arrivalTime')).toISOString() : null, p_parking_instructions: data.get('parking'), p_setup_instructions: data.get('setup'), p_special_requirements: data.get('requirements'), p_cancellation_policy: data.get('cancellation'), p_recurrence: data.get('opportunityType') === 'recurring' ? { frequency: data.get('frequency'), interval_count: 1, days_of_week: days, recurrence_ends_on: data.get('recurrenceEnds') || null } : null }); await loadHostData(); state.host.tab = 'dashboard'; renderHostRoot(); }, 'Opportunity published.'); return;
    }
    if (event.target.id === 'opportunityMessageForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      await act(button, async () => { await rpc('send_opportunity_message', { p_application_id: event.target.dataset.applicationId, p_body: data.get('body') }); event.target.reset(); if (state.activeRole === 'vendor') await loadVendorData(); else await loadHostData(); openMarketplaceModal(messageModal(event.target.dataset.applicationId)); }, 'Reply sent.'); return;
    }
    if (event.target.id === 'opportunityReviewForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      await act(button, async () => { await rpc('submit_opportunity_review', { p_booking_id: event.target.dataset.bookingId, p_rating: Number(data.get('rating')), p_communication_rating: Number(data.get('communication')), p_accuracy_rating: Number(data.get('accuracy')), p_setup_rating: Number(data.get('setup')), p_comment: data.get('comment') }); if (state.vendor.context) await loadVendorData(); if (state.host.profile) await loadHostData(); document.getElementById('customerAccountModal')?.classList.add('hidden'); document.getElementById('marketplaceModal')?.classList.add('hidden'); if (state.vendor.context) renderVendorRoot(); else renderHostRoot(); }, 'Review submitted.');
    }
  });

  function subscribe() {
    if (!client?.channel) return;
    client.channel('foodtreknow-opportunity-marketplace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => {
        if (state.activeRole === 'vendor') renderVendor();
        if (state.activeRole === 'host') mountHost();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunity_applications' }, () => {
        if (state.activeRole === 'vendor') renderVendor();
        if (state.activeRole === 'host') mountHost();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'opportunity_messages' }, async payload => {
        if (state.activeRole === 'vendor') await loadVendorData();
        if (state.activeRole === 'host') await loadHostData();
        const openForm = document.getElementById('opportunityMessageForm');
        if (openForm?.dataset.applicationId === payload.new.application_id) openMarketplaceModal(messageModal(payload.new.application_id));
        else if (state.activeRole === 'vendor') renderVendorRoot();
        else if (state.activeRole === 'host') renderHostRoot();
      })
      .subscribe();
  }

  window.FoodTrekNowOpportunityMarketplace = Object.freeze({
    available: Boolean(client),
    renderVendor,
    hostShellMarkup,
    mountHost,
    profitability,
    haversineMiles,
    feeLabel,
    subscribe
  });
  subscribe();
})();
