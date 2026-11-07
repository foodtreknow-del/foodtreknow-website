Warning: truncated output (original token count: 43614)
Total output lines: 1675

(function exposeOpportunityMarketplace() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const testPaymentMode = window.FoodTrekNowBuildConfig?.paymentMode === 'test';
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const clean = value => String(value || '').trim();
  const asArray = value => Array.isArray(value) ? value : [];
  const relatedOne = value => Array.isArray(value) ? value[0] || null : value || null;
  const sameInstant = (left, right) => {
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();
    return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
  };
  const safeImageUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const MARKETPLACE_ERROR = 'The location marketplace database update has not been installed yet.';
  const state = {
    vendor: { context: null, opportunities: [], applications: [], bookings: [], favorites: [], routes: [], messages: [], reviews: [], notifications: [], tab: 'discover', view: 'list', location: null, filters: {} },
    host: { profile: null, locations: [], opportunities: [], applications: [], bookings: [], messages: [], reviews: [], notifications: [], stripe: null, tab: 'dashboard', editingOpportunityId: null },
    activeRole: null,
    currentUserId: null,
    selectedOpportunity: null,
    selectedApplication: null
  };

  function friendly(error) {
    const message = clean(error?.message);
    if (/relation .* does not exist|schema cache|could not find the function/i.test(message)) return new Error(MARKETPLACE_ERROR);
    if (/duplicate key|unique constraint/i.test(message)) return new Error('You already applied for this event. Open Applications or Messages to continue the conversation.');
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

  async function optionalPaymentQuery(builder) {
    const { data, error } = await builder;
    if (error && /host_stripe_connect_accounts|event_fee_payments|schema cache|does not exist/i.test(clean(error.message))) return [];
    if (error) throw friendly(error);
    return data || [];
  }

  async function edge(name, body = {}) {
    if (!client?.functions?.invoke) throw new Error('The secure payment connection is unavailable.');
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) throw new Error(data?.error || error.message || 'The secure payment request failed.');
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  function dateTime(value) {
    if (!value) return 'Not specified';
    return new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function weekdayLabel(value) {
    if (!value) return 'Choose a date to see the day of the week.';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Choose a valid date.';
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function syncHostOpportunityDateLabels(form = document.getElementById('hostOpportunityForm')) {
    if (!form) return;
    form.querySelectorAll('[data-weekday-target]').forEach(input => {
      const output = form.querySelector(`#${input.dataset.weekdayTarget}`);
      if (output) output.textContent = weekdayLabel(input.value);
    });
    const frequency = form.elements.frequency?.value || 'none';
    const recurrence = form.querySelector('.recurrence-fields');
    if (recurrence) recurrence.dataset.oneDay = String(frequency === 'none');
    if (form.elements.recurrenceEnds) form.elements.recurrenceEnds.disabled = frequency === 'none';
    form.querySelectorAll('input[name="day"]').forEach(input => { input.disabled = frequency === 'none'; });
  }

  function applicationStatusLabel(status) {
    return ({ pending: 'Pending', approved: 'Approved', declined: 'Declined', waitlisted: 'Waitlisted', withdrawn: 'Withdrawn', cancelled: 'Cancelled' })[status] || String(status || 'Unknown').replaceAll('_', ' ');
  }

  function calendarDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function bookingCalendarDetails(booking) {
    const opportunity = booking?.opportunities || {};
    const location = opportunity.host_locations || {};
    const startValue = opportunity.arrival_time || opportunity.starts_at;
    const eventStart = new Date(opportunity.starts_at);
    const end = new Date(opportunity.ends_at);
    if (Number.isNaN(new Date(startValue).getTime()) || Number.isNaN(end.getTime())) throw new Error('This booking does not have valid calendar dates yet.');
    const address = [location.address_line1, location.city, location.state, location.postal_code].filter(Boolean).join(', ');
    const title = `${booking.trucks?.name || 'Food Truck'} — ${opportunity.title || 'FoodTrekNow Booking'}`;
    const notes = [
      `FoodTrekNow booking reference: ${booking.id}`,
      opportunity.arrival_time ? `Vendor arrival: ${dateTime(opportunity.arrival_time)}` : '',
      !Number.isNaN(eventStart.getTime()) ? `Event starts: ${dateTime(opportunity.starts_at)}` : '',
      opportunity.parking_instructions ? `Parking: ${opportunity.parking_instructions}` : '',
      opportunity.setup_instructions ? `Setup: ${opportunity.setup_instructions}` : '',
      'Manage this booking at https://www.foodtreknow.com/'
    ].filter(Boolean);
    return { title, start: new Date(startValue), end, address: address || location.name || '', description: notes.join('\n') };
  }

  function calendarChoiceModal(booking) {
    const details = bookingCalendarDetails(booking);
    return `<p class="eyebrow">Approved Booking</p><h2 id="customerModalTitle">Add to Calendar</h2><p><strong>${escapeHtml(details.title)}</strong></p><p>${escapeHtml(dateTime(details.start))} through ${escapeHtml(dateTime(details.end))}</p><p>${escapeHtml(details.address || 'Host location')}</p><div class="calendar-choice-grid"><button class="primary-button" data-booking-calendar-provider="google" data-booking-id="${escapeHtml(booking.id)}" type="button">Google Calendar</button><button class="secondary-button" data-booking-calendar-provider="outlook" data-booking-id="${escapeHtml(booking.id)}" type="button">Outlook Calendar</button><button class="secondary-button" data-booking-calendar-provider="device" data-booking-id="${escapeHtml(booking.id)}" type="button">Apple / Device Calendar</button><button class="secondary-button" data-booking-calendar-provider="ics" data-booking-id="${escapeHtml(booking.id)}" type="button">Download .ics File</button></div><p class="estimate-disclaimer">This adds the current booking details to your chosen calendar. If the Host later changes or cancels the event, update or remove the saved calendar entry when FoodTrekNow notifies you.</p>`;
  }

  function calendarUrl(provider, details) {
    if (provider === 'google') {
      const query = new URLSearchParams({ action: 'TEMPLATE', text: details.title, dates: `${calendarDate(details.start)}/${calendarDate(details.end)}`, details: details.description, location: details.address });
      return `https://calendar.google.com/calendar/render?${query}`;
    }
    if (provider === 'outlook') {
      const query = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: details.title, startdt: details.start.toISOString(), enddt: details.end.toISOString(), body: details.description, location: details.address });
      return `https://outlook.live.com/calendar/0/deeplink/compose?${query}`;
    }
    return '';
  }

  function icsEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function downloadBookingCalendar(booking) {
    const details = bookingCalendarDetails(booking);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FoodTrekNow//Vendor Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:booking-${icsEscape(booking.id)}@foodtreknow.com`, `DTSTAMP:${calendarDate(new Date())}`,
      `DTSTART:${calendarDate(details.start)}`, `DTEND:${calendarDate(details.end)}`, `SUMMARY:${icsEscape(details.title)}`,
      `DESCRIPTION:${icsEscape(details.description)}`, `LOCATION:${icsEscape(details.address)}`, 'URL:https://www.foodtreknow.com/',
      'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${details.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'foodtreknow-booking'}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  function activeVendorOpportunities() {
    const now = Date.now();
    return state.vendor.opportunities.filter(item => (!item.status || item.status === 'published') && new Date(item.ends_at).getTime() > now);
  }

  function vendorBookingIsActive(booking) {
    return booking.status === 'confirmed' && new Date(booking.opportunities?.ends_at).getTime() > Date.now();
  }

  function vendorBookingStatus(booking) {
    if (booking.status === 'confirmed' && !vendorBookingIsActive(booking)) return 'Completed';
    return String(booking.status || 'Unknown').replaceAll('_', ' ');
  }

  function filteredOpportunities(todayOnly = false) {
    const filters = state.vendor.filters;
    let items = activeVendorOpportunities().filter(item => !todayOnly || sameLocalDay(item.starts_at));
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
    state.currentUserId = context.user.id;
    const vendorId = context.vendor.id;
    const [opportunities, applications, bookings, favorites, routes, notifications] = await Promise.all([
      rpc('list_marketplace_opportunities'),
      query(client.from('opportunity_applications').select('*, opportunities(title, starts_at, ends_at, location_id, host_locations(name, city, state)), trucks(name)').eq('vendor_profile_id', vendorId).order('applied_at', { ascending: false })),
      query(client.from('opportunity_bookings').select('*, opportunities(title, opportunity_type, starts_at, ends_at, arrival_time, parking_instructions, setup_instructions, flat_vendor_fee, sales_percentage, refundable_deposit, site_map_image_url, vendor_zone_name, vendor_entrance, customer_map_enabled, event_logistics_notes, placement_strategy, host_locations(name, address_line1, city, state, postal_code, latitude, longitude)), trucks(name)').eq('vendor_profile_id', vendorId).order('confirmed_at', { ascending: false })),
      query(client.from('opportunity_favorites').select('opportunity_id').eq('vendor_profile_id', vendorId)),
      query(client.from('vendor_routes').select('*, vendor_route_stops(*, opportunity_bookings(*, opportunities(title, starts_at, ends_at, flat_vendor_fee, sales_percentage, expected_customers, trucks_requested, host_locations(name, city, state, latitude, longitude))))').eq('vendor_profile_id', vendorId)),
      query(client.from('marketplace_notifications').select('*').eq('profile_id', context.user.id).order('created_at', { ascending: false }).limit(50))
    ]);
    state.vendor.opportunities = opportunities;
    state.vendor.applications = applications;
    const bookingIds = bookings.map(item => item.id);
    const eventPayments = bookingIds.length ? await optionalPaymentQuery(client.from('event_fee_payments').select('*').in('booking_id', bookingIds)) : [];
    state.vendor.bookings = bookings.map(booking => ({ ...booking, event_fee_payments: eventPayments.find(payment => payment.booking_id === booking.id) || null }));
    state.vendor.favorites = favorites.map(item => item.opportunity_id);
    state.vendor.routes = routes;
    state.vendor.notifications = notifications;
    const applicationIds = applications.map(item => item.id);
    state.vendor.messages = applicationIds.length ? await query(client.from('opportunity_messages').select('*').in('application_id', applicationIds).order('created_at')) : [];
    state.vendor.reviews = bookingIds.length ? await query(client.from('opportunity_reviews').select('*').in('booking_id', bookingIds).order('created_at', { ascending: false })) : [];
  }

  async function loadHostData() {
    if (!client) throw new Error('The secure marketplace connection is unavailable.');
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) throw new Error('Sign in to create and manage host opportunities.');
    state.currentUserId = user.id;
    const profiles = await query(client.from('location_hosts').select('*').eq('owner_id', user.id).limit(1));
    state.host.profile = profiles[0] || null;
    if (!state.host.profile || state.host.profile.verification_status !== 'verified') {
      state.host.locations = [];
      state.host.opportunities = [];
      state.host.applications = [];
      state.host.bookings = [];
      state.host.messages = [];
      state.host.reviews = [];
      state.host.notifications = [];
      state.host.stripe = null;
      throw new Error('Administrator approval is required before this account can use the Host Portal. Open Customer Portal and select Become a Host to view your application.');
    }
    const hostId = state.host.profile.id;
    const [locations, opportunities, notifications, stripeAccounts] = await Promise.all([
      query(client.from('host_locations').select('*').eq('host_id', hostId).order('created_at')),
      query(client.from('opportunities').select('*, opportunity_recurrence_rules(*)').eq('host_id', hostId).order('starts_at', { ascending: false })),
      query(client.from('marketplace_notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(50)),
      optionalPaymentQuery(client.from('host_stripe_connect_accounts').select('*').eq('host_id', hostId).limit(1))
    ]);
    state.host.locations = locations;
    state.host.opportunities = opportunities;
    state.host.notifications = notifications;
    state.host.stripe = stripeAccounts[0] || null;
    const ids = opportunities.map(item => item.id);
    if (!ids.length) {
      state.host.applications = [];
      state.host.bookings = [];
      state.host.messages = [];
      state.host.reviews = [];
      return;
    }
    const [applications, bookings, reviews] = await Promise.all([
      query(client.from('opportunity_applications').select('*, trucks(id, name, cuisine), opportunities(title, starts_at, ends_at, archived_at, host_locations(name, city, state))').in('opportunity_id', ids).order('applied_at', { ascending: false })),
      query(client.from('opportunity_bookings').select('*, trucks(id, name, cuisine), opportunities(title, starts_at, ends_at, archived_at, flat_vendor_fee, sales_percentage, refundable_deposit, site_map_image_url, vendor_zone_name, vendor_entrance, customer_map_enabled, event_logistics_notes, placement_strategy, host_locations(name, address_line1, city, state, postal_code, latitude, longitude))').in('opportunity_id', ids).order('confirmed_at', { ascending: false })),
      query(client.from('opportunity_reviews').select('*').in('opportunity_id', ids).order('created_at', { ascending: false }))
    ]);
    state.host.applications = applications;
    const hostBookingIds = bookings.map(item => item.id);
    const eventPayments = hostBookingIds.length ? await optionalPaymentQuery(client.from('event_fee_payments').select('*').in('booking_id', hostBookingIds)) : [];
    state.host.bookings = bookings.map(booking => ({ ...booking, event_fee_payments: eventPayments.find(payment => payment.booking_id === booking.id) || null }));
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

  function vendorApplicationFor(opportunityId) {
    return state.vendor.applications.find(application => String(application.opportunity_id) === String(opportunityId)) || null;
  }

  function vendorOpportunityAction(item, application, secondary = false) {
    if (application) {
      return `<button class="${secondary ? 'secondary-button' : 'primary-button'}" data-open-vendor-application="${escapeHtml(application.id)}" type="button">View ${escapeHtml(applicationStatusLabel(application.status))} Application</button>`;
    }
    return `<button class="${secondary ? 'secondary-button' : 'primary-button'}" data-marketplace-apply="${escapeHtml(item.id)}" type="button">${item.booking_mode === 'instant' ? 'Book Now' : 'Request Spot'}</button>`;
  }

  function opportunityCard(item) {
    const distance = opportunityDistance(item);
    const estimate = profitability(item, distance);
    const saved = state.vendor.favorites.includes(item.id);
    const application = vendorApplicationFor(item.id);
    const photo = safeImageUrl(asArray(item.location?.photos)[0]);
    return `<article class="opportunity-card opportunity-card-clickable" data-opportunity-card="${item.id}" aria-label="View ${escapeHtml(item.title)} opportunity">${photo ? `<img class="opportunity-card-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(item.location?.name)}">` : ''}
      <div class="opportunity-card-top"><div>${availabilityBadge(item)}${application ? `<span class="marketplace-badge application-status">${escapeHtml(applicationStatusLabel(application.status))} application</span>` : ''}${!Number(item.flat_vendor_fee) && !Number(item.sales_percentage) ? '<span class="marketplace-badge no-fee">No Fee</span>' : ''}${Number(item.minimum_sales_guarantee) ? '<span class="marketplace-badge guarantee">Guaranteed Minimum</span>' : ''}</div><button class="opportunity-favorite ${saved ? 'saved' : ''}" data-marketplace-favorite="${item.id}" type="button" aria-label="${saved ? 'Remove saved opportunity' : 'Save opportunity'}">${saved ? '♥' : '♡'}</button></div>
      <p class="eyebrow">${escapeHtml(item.event_type.replaceAll('_', ' '))}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="opportunity-location">📍 ${escapeHtml(item.location?.name)} · ${escapeHtml(item.location?.address_line1)}, ${escapeHtml(item.location?.city)}, ${escapeHtml(item.location?.state)}</p>
      <div class="opportunity-card-grid"><span><small>Date & hours</small><strong>${escapeHtml(dateTime(item.starts_at))}</strong><small>to ${escapeHtml(new Date(item.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</small></span><span><small>Distance</small><strong>${distance === null ? 'Enable location' : `${distance.toFixed(1)} miles`}</strong></span><span><small>Expected customers</small><strong>${Number(item.expected_customers).toLocaleString()}</strong></span><span><small>Truck spaces</small><strong>${capacityLeft(item)} of ${item.trucks_requested} open</strong><small>${item.trucks_booked} already booked</small></span><span><small>Vendor cost</small><strong>${escapeHtml(feeLabel(item))}</strong><small>${Number(item.minimum_sales_guarantee) ? `${money(item.minimum_sales_guarantee)} minimum guarantee` : 'No minimum guarantee'}</small></span><span><small>Host rating</small><strong>${Number(item.host?.average_rating || 0).toFixed(1)} ★</strong><small>${Number(item.host?.rating_count || 0)} review${Number(item.host?.rating_count || 0) === 1 ? '' : 's'}</small></span><span><small>Profitability</small><strong class="score-${estimate.label.toLowerCase().replace(' ', '-')}">${estimate.score}/100 · ${estimate.label}</strong></span></div>
      <div class="opportunity-amenities"><span>${item.electricity_available ? '⚡ Power' : 'No power'}</span><span>${item.water_available ? '💧 Water' : 'No water'}</span><span>${escapeHtml(asArray(item.cuisine_preferences).join(', ') || 'All cuisines')}</span></div>
      <p class="opportunity-instructions"><strong>Parking/setup:</strong> ${escapeHtml(item.parking_instructions || item.setup_instructions || 'View details for host instructions.')}</p>
      <div class="opportunity-card-actions"><button class="secondary-button" data-marketplace-view="${item.id}" type="button">View Opportunity</button>${vendorOpportunityAction(item, application)}</div>
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
      <label>Event type<select name="eventType"><option value="">All types</option>${['location','lunch','dinner','community','private_event','festival','market','sports','other'].map(value => `<option value="${value}"${selected('eventType', value)}>${value.replaceAll('_', ' ')}</option>`).join('')}</select></label>
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
    const unreadTabs = new Set(['applications', 'messages', 'bookings']);
    return `<div class="marketplace-tabs" role="tablist">${tabs.map(([key, label]) => { const unread = key === 'notifications' ? state.vendor.notifications.filter(item => !item.is_read).length : unreadTabs.has(key) ? unreadVendorMessages(null, key) : 0; const showsUnread = unreadTabs.has(key) || key === 'notifications'; return `<button class="${state.vendor.tab === key ? 'active' : ''}" data-vendor-marketplace-tab="${key}" type="button"${showsUnread ? ` aria-label="${label}, ${unread} unread ${key === 'notifications' ? 'alert' : 'message'}${unread === 1 ? '' : 's'}"` : ''}>${label}${showsUnread ? `<span class="marketplace-unread-badge" aria-hidden="true">${unread}</span>` : ''}</button>`; }).join('')}</div>`;
  }

  async function loadVendorOpportunityDetail(opportunityId) {
    const active = state.vendor.opportunities.find(item => String(item.id) === String(opportunityId));
    if (active) return active;
    const rows = await query(client.from('opportunities')
      .select('*, opportunity_recurrence_rules(*), host_locations(*)')
      .eq('id', opportunityId)
      .limit(1));
    const opportunity = rows[0];
    if (!opportunity) return null;
    return {
      ...opportunity,
      location: relatedOne(opportunity.host_locations),
      recurrence: relatedOne(opportunity.opportunity_recurrence_rules),
      trucks_booked: state.vendor.bookings.filter(booking => String(booking.opportunity_id) === String(opportunity.id) && booking.status === 'confirmed').length,
      host: null
    };
  }

  function unreadVendorMessages(applicationId, section) {
    const field = { applications: 'vendor_applications_read_at', messages: 'vendor_messages_read_at', bookings: 'vendor_bookings_read_at' }[section];
    if (!field) return 0;
    return state.vendor.messages.filter(message => (!applicationId || message.application_id === applicationId) && message.sender_role === 'host' && !message[field]).length;
  }

  function vendorUnreadButton(applicationId, section, unread) {
    if (!unread) return '';
    const label = `${unread} unread message${unread === 1 ? '' : 's'}`;
    return `<button class="marketplace-unread-badge marketplace-unread-button" data-marketplace-message="${escapeHtml(applicationId)}" data-message-section="${escapeHtml(section)}" type="button" aria-label="Open and read ${label}">${unread}</button>`;
  }

  function applicationsMarkup() {
    if (!state.vendor.applications.length) return empty('📨', 'No applications yet', 'Request a spot and your application status will appear here.');
    return `<div class="marketplace-record-list">${state.vendor.applications.map(item => { const unread = unreadVendorMessages(item.id, 'applications'); return `<article data-vendor-application-record="${escapeHtml(item.id)}" class="${unread ? 'marketplace-record-unread' : ''}"><div><span class="status-pill ${item.status}">${escapeHtml(applicationStatusLabel(item.status))}</span><div class="marketplace-record-title"><h3>${escapeHtml(item.opportunities?.title || 'Opportunity')}</h3>${vendorUnreadButton(item.id, 'applications', unread)}</div><p>${escapeHtml(item.opportunities?.host_locations?.name || '')} · ${escapeHtml(dateTime(item.opportunities?.starts_at))}</p>${item.host_response ? `<small>Host response: ${escapeHtml(item.host_response)}</small>` : item.status === 'declined' ? '<small>You may still message the Host with questions about this decision.</small>' : ''}</div><button class="secondary-button" data-marketplace-message="${item.id}" data-message-section="applications" type="button">${unread ? `Read ${unread} New Message${unread === 1 ? '' : 's'}` : 'Reply to Host'}</button></article>`; }).join('')}</div>`;
  }

  function eventPaymentSummary(booking, role) {
    const payment = relatedOne(booking.event_fee_payments);
    const percentage = Number(payment?.sales_percentage ?? booking.opportunities?.sales_percentage ?? 0);
    const percentageNote = percentage > 0 ? `<small>${percentage}% of sales is settled separately after the event.</small>` : '';
    const postedPrepayment = Number(booking.opportunities?.flat_vendor_fee || 0) + Number(booking.opportunities?.refundable_deposit || 0);
    if (!payment && postedPrepayment > 0) return `<span class="status-pill pending">Payment setup pending</span><small>The event fee payment record is being prepared.</small>${percentageNote}`;
    if (!payment) return `${percentageNote}<span class="status-pill paid">No pre-event payment required</span>`;
    const amount = money(Number(payment.amount_due_cents) / 100);
    if (payment.status === 'paid') {
      const paidLabel = payment.is_test_payment ? `Test Paid - No Charge (${amount})` : `Paid ${amount}`;
      return `<span class="status-pill paid">${paidLabel}</span>${payment.is_test_payment ? '<small>This verifies the host-fee workflow without transferring money.</small>' : ''}${percentageNote}<div class="stacked-actions">${payment.receipt_url ? `<a class="secondary-button marketplace-link-button" href="${escapeHtml(payment.receipt_url)}" target="_blank" rel="noopener">View Receipt</a>` : ''}${role === 'host' && !payment.is_test_payment ? `<button class="danger-button" data-event-fee-refund="${payment.id}" type="button">Refund Full Payment</button>` : ''}</div>`;
    }
    if (payment.status === 'refunded') return `<span class="status-pill refunded">Refunded ${amount}</span>${percentageNote}`;
    if (payment.status === 'refund_pending') return `<span class="status-pill pending">Refund pending</span>${percentageNote}`;
    if (role === 'vendor') return `<span class="status-pill pending">${testPaymentMode ? 'Test payment' : 'Payment'} due ${amount}</span><small>Includes ${money(Number(payment.flat_fee_cents) / 100)} event fee and ${money(Number(payment.refundable_deposit_cents) / 100)} refundable deposit.</small>${percentageNote}<button class="primary-button" data-event-fee-pay="${booking.id}" type="button">${testPaymentMode ? 'Place Test Payment - No Charge' : 'Pay Event Fee'}</button>`;
    return `<span class="status-pill pending">Awaiting ${testPaymentMode ? 'test payment ' : ''}${amount}</span><small>${testPaymentMode ? 'The approved food truck can complete a no-charge test payment from its Bookings tab.' : 'The approved food truck pays from its Bookings tab.'}</small>${percentageNote}`;
  }

  function localDateTimeValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function bookingHasMapPosition(booking) {
    return Number.isFinite(Number(booking?.map_x)) && Number.isFinite(Number(booking?.map_y));
  }

  function eventSpaceMap(opportunity, bookings, options = {}) {
    const mapImage = safeImageUrl(opportunity?.site_map_image_url);
    const positioned = bookings.filter(bookingHasMapPosition);
    const mapStyle = mapImage ? ` style="background-image:linear-gradient(rgba(10,22,36,.18),rgba(10,22,36,.18)),url('${escapeHtml(mapImage)}')"` : '';
    const pins = positioned.map(booking => {
      const selected = String(options.highlightBookingId || '') === String(booking.id) ? ' selected' : '';
      const label = booking.space_code || booking.trucks?.name || 'Truck';
      return `<button class="event-space-pin${selected}" style="left:${Number(booking.map_x)}%;top:${Number(booking.map_y)}%" data-event-space-booking="${escapeHtml(booking.id)}" type="button" aria-label="${escapeHtml(label)}: ${escapeHtml(booking.trucks?.name || 'Food truck')}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(booking.trucks?.name || '')}</small></button>`;
    }).join('');
    return `<div class="event-space-map${mapImage ? ' has-image' : ''}"${mapStyle}><div class="event-space-map-grid" aria-hidden="true"></div><span class="event-map-entrance">Entrance<br>${escapeHtml(opportunity?.vendor_entrance || 'Set entrance')}</span>${pins || '<p class="event-map-empty">Assign spaces manually or use Smart Placement to position approved trucks.</p>'}</div>`;
  }

  function vendorSpaceSummary(booking) {
    const opportunity = booking.opportunities || {};
    if (!booking.space_code && !booking.space_label && !opportunity.vendor_zone_name) return '<p class="event-space-pending">The Host has not assigned an exact vendor space yet.</p>';
    const arrival = booking.arrival_window_start
      ? `${dateTime(booking.arrival_window_start)}${booking.arrival_window_end ? `–${new Date(booking.arrival_window_end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
      : 'Not specified';
    return `<section class="vendor-space-summary"><div><small>Assigned space</small><strong>${escapeHtml(booking.space_code || 'Assigned')}</strong><span>${escapeHtml(booking.space_label || opportunity.vendor_zone_name || '')}</span></div><dl><div><dt>Vendor zone</dt><dd>${escapeHtml(opportunity.vendor_zone_name || 'Not specified')}</dd></div><div><dt>Vendor entrance</dt><dd>${escapeHtml(opportunity.vendor_entrance || 'Not specified')}</dd></div><div><dt>Arrival window</dt><dd>${escapeHtml(arrival)}</dd></div><div><dt>Electricity</dt><dd>${escapeHtml(booking.electrical_access || 'None assigned')}</dd></div><div><dt>Water</dt><dd>${escapeHtml(booking.water_access || 'None assigned')}</dd></div><div><dt>Generator</dt><dd>${booking.generator_permitted ? 'Permitted' : 'Not permitted'}</dd></div></dl>${opportunity.event_logistics_notes ? `<p>${escapeHtml(opportunity.event_logistics_notes)}</p>` : ''}</section>`;
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
    const conversations = state.vendor.applications.map(item => {
      const thread = conversationItems(item, state.vendor.messages.filter(message => message.application_id === item.id));
      const last = thread.at(-1);
      return { item, thread, last, unread: unreadVendorMessages(item.id, 'messages'), updatedAt: new Date(last?.created_at || item.applied_at || 0).getTime() };
    }).sort((a, b) => Number(Boolean(b.unread)) - Number(Boolean(a.unread)) || b.updatedAt - a.updatedAt);
    return `<div class="marketplace-record-list">${conversations.map(({ item, thread, last, unread }) => `<article class="marketplace-conversation-card ${unread ? 'marketplace-record-unread' : ''}" data-vendor-conversation-card="${escapeHtml(item.id)}" data-message-section="messages" role="button" tabindex="0" aria-label="Open full conversation for ${escapeHtml(item.opportunities?.title || 'opportunity')}"><div><div class="marketplace-conversation-status"><span class="status-pill ${item.status}">${escapeHtml(applicationStatusLabel(item.status))}</span>${unread ? '<strong class="marketplace-new-label">NEW</strong>' : ''}</div><div class="marketplace-record-title"><h3>${escapeHtml(item.opportunities?.title || 'Opportunity')}</h3>${vendorUnreadButton(item.id, 'messages', unread)}</div><p>${escapeHtml(item.opportunities?.host_locations?.name || 'Host location')}</p><small>${thread.length} message${thread.length === 1 ? '' : 's'} in this event conversation</small><p class="marketplace-message-preview">${last ? escapeHtml(last.body) : 'No messages yet. Ask the Host a question about this event.'}</p><small>Click anywhere on this event to view the complete conversation.</small></div><button class="primary-button" data-marketplace-message="${item.id}" data-message-section="messages" type="button">${unread ? `Read ${unread} New Message${unread === 1 ? '' : 's'}` : thread.length ? 'Open Full Conversation' : 'Start Conversation'}</button></article>`).join('')}</div>`;
  }

  function routeStopForBooking(bookingId) {
    return state.vendor.routes.flatMap(route => asArray(route.vendor_route_stops))
      .find(stop => String(stop.booking_id) === String(bookingId)) || null;
  }

  function bookingsMarkup() {
    if (!state.vendor.bookings.length) return empty('📅', 'No confirmed bookings', 'Approved and instant bookings will appear here.');
    const active = state.vendor.bookings.filter(vendorBookingIsActive);
    const completed = state.vendor.bookings.filter(item => !vendorBookingIsActive(item));
    const records = items => `<div class="marketplace-record-list">${items.map(item => { const ended = new Date(item.opportunities?.ends_at) < new Date(); const reviewed = state.vendor.reviews.some(review => review.booking_id === item.id); const unread = item.application_id ? unreadVendorMessages(item.application_id, 'bookings') : 0; const routeStop = routeStopForBooking(item.id); const displayStatus = vendorBookingStatus(item); return `<article class="${unread ? 'marketplace-record-unread' : ''}"><div><span class="status-pill ${displayStatus.toLowerCase().replaceAll(' ', '_')}">${escapeHtml(displayStatus)}</span><div class="marketplace-record-title"><h3>${escapeHtml(item.opportunities?.title || 'Booking')}</h3>${vendorUnreadButton(item.application_id, 'bookings', unread)}</div><p>${escapeHtml(item.opportunities?.host_locations?.name || '')} · ${escapeHtml(dateTime(item.opportunities?.starts_at))}</p><small>${escapeHtml(item.opportunities?.setup_instructions || 'Setup instructions will appear here.')}</small>${vendorSpaceSummary(item)}${eventPaymentSummary(item, 'vendor')}</div><div class="stacked-actions"><button class="secondary-button" data-vendor-booking-opportunity="${escapeHtml(item.opportunity_id)}" type="button">View Opportunity</button>${bookingHasMapPosition(item) ? `<button class="primary-button" data-vendor-space-map="${escapeHtml(item.id)}" type="button">View Assigned Space</button>` : ''}${item.application_id ? `<button class="primary-button" data-marketplace-message="${item.application_id}" data-message-section="bookings" type="button">${unread ? `Read ${unread} New Message${unread === 1 ? '' : 's'}` : 'Messages'}</button>` : ''}${vendorBookingIsActive(item) ? `<button class="secondary-button" data-booking-calendar="${item.id}" type="button">Add to Calendar</button><button class="secondary-button" data-booking-contact="${item.id}" type="button">Contact Details</button><button class="secondary-button" data-vendor-check-in="${item.id}" data-check-in-status="${item.check_in_status === 'not_arrived' ? 'arrived' : item.check_in_status === 'arrived' ? 'checked_in' : 'departed'}" type="button">${item.check_in_status === 'not_arrived' ? 'I Have Arrived' : item.check_in_status === 'arrived' ? 'Check In' : item.check_in_status === 'checked_in' ? 'Mark Departed' : 'Departed'}</button>` : ''}<a class="secondary-button marketplace-link-button" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.opportunities?.host_locations?.address_line1, item.opportunities?.host_locations?.city, item.opportunities?.host_locations?.state, item.opportunities?.host_locations?.postal_code].filter(Boolean).join(', '))}">Navigate to Event</a>${vendorBookingIsActive(item) && item.opportunities?.opportunity_type === 'recurring' ? `<button class="primary-button" ${routeStop ? `data-edit-route-booking="${item.id}"` : `data-route-booking="${item.id}"`} type="button">${routeStop ? 'Edit Weekly Route' : 'Add to Weekly Route'}</button>` : ''}${vendorBookingIsActive(item) ? `<button class="danger-button" data-cancel-vendor-booking="${item.id}" type="button">Cancel Booking</button>` : ''}${ended && !reviewed ? `<button class="secondary-button" data-review-booking="${item.id}" type="button">Leave Review</button>` : ''}</div></article>`; }).join('')}</div>`;
    return `<div class="marketplace-results-bar"><div><strong>${active.length} active booking${active.length === 1 ? '' : 's'}</strong><small>Finished and cancelled events do not count as active.</small></div></div><section class="marketplace-booking-section"><h3>Active Bookings</h3>${active.length ? records(active) : empty('✅', 'No active bookings', 'Completed and cancelled bookings are kept below for your records.')}</section>${completed.length ? `<section class="marketplace-booking-section marketplace-booking-history"><h3>Completed & Cancelled</h3>${records(completed)}</section>` : ''}`;
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
    return `<section class="route-summary-grid"><article><small>Estimated weekly sales</small><strong>${money(projected)}</strong></article><article><small>Total vendor fees</small><strong>${money(fees)}</strong></article><article><small>Round-trip mileage</small><strong>${state.vendor.location ? `${routeMiles.toFixed(1)} mi` : 'Enable location'}</strong></article><article><small>Estimated travel cost</small><strong>${state.vendor.location ? money(travelCost) : 'Not calculated'}</strong></article><article><small>Operating hours</small><strong>${hours.toFixed(1)}</strong></article><article><small>Estimated weekly profit</small><strong>${money(Math.max(0, projected - fees - projected * 0.3 - hours * 45 - travelCost))}</strong></article></section>${stops.length ? `<div class="weekly-route">${days.map((day, index) => `<section><strong>${day}</strong>${stops.filter(stop => stop.day_of_week === index).map(stop => `<div><span><b>${escapeHtml(stop.opportunity_bookings?.opportunities?.title)}</b><small>${escapeHtml(stop.opportunity_bookings?.opportunities?.host_locations?.name || '')}</small></span><span class="route-stop-actions"><button class="secondary-button" data-edit-route-booking="${escapeHtml(stop.booking_id)}" type="button">Change Day</button><button class="danger-button" data-remove-route-booking="${escapeHtml(stop.booking_id)}" type="button">Remove</button></span></div>`).join('') || '<small>Open</small>'}</section>`).join('')}</div><p class="estimate-disclaimer">Host date, time, and location edits automatically refresh here. Cancelling a booking removes it from this in-app route. External calendar entries may require a new calendar import.</p>` : empty('🛣️', 'Your weekly route is empty', 'Add confirmed recurring bookings to build a dependable weekly schedule.')}`;
  }

  function notificationsMarkup(items) {
    if (!items.length) return empty('🔔', 'No marketplace alerts yet', 'Nearby opportunities, decisions, reminders, and host messages will appear here.');
    return `<div class="marketplace-notifications">${items.map(item => `<article class="${item.is_read ? '' : 'unread'}"><button class="marketplace-notification-link" data-vendor-alert-opportunity="${escapeHtml(item.opportunity_id || '')}" data-vendor-alert-application="${escapeHtml(item.application_id || '')}" data-marketplace-notification-id="${escapeHtml(item.id)}" type="button"><span class="marketplace-notification-icon">${item.kind === 'message' ? '💬' : item.kind === 'booking' ? '✅' : item.kind === 'payment' ? '💳' : '📣'}</span><span class="marketplace-notification-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span><small>${escapeHtml(dateTime(item.created_at))}</small><b>View opportunity details →</b></span></button></article>`).join('')}</div><button class="secondary-button" data-marketplace-read-all type="button">Mark All Read</button>`;
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
    const activeCount = activeVendorOpportunities().length;
    const activeBookingCount = state.vendor.bookings.filter(vendorBookingIsActive).length;
    root.innerHTML = `<section class="marketplace-hero"><div><p class="eyebrow">Location Opportunity Marketplace</p><h2>Where can your truck go and make money?</h2><p>Compare customers, fees, competition, distance, and estimated profit before committing.</p></div><div class="marketplace-hero-stats"><button class="marketplace-hero-stat" data-vendor-marketplace-tab="discover" data-marketplace-show-available type="button" aria-label="View ${activeCount} active opportunities"><strong>${activeCount}</strong><span>active opportunities</span><small>Includes opportunities you already requested; completed events are removed</small></button><button class="marketplace-hero-stat" data-vendor-marketplace-tab="bookings" type="button" aria-label="View ${activeBookingCount} active bookings"><strong>${activeBookingCount}</strong><span>active bookings</span><small>Click to view bookings</small></button></div></section>${vendorTabs()}<section class="marketplace-panel">${vendorContent()}</section>`;
  }

  async function renderVendor() {
    const root = document.getElementById('vendorOpportunityMarketplace');
    if (!root) return;
    state.activeRole = 'vendor';
    root.innerHTML = '<div class="marketplace-loading">Finding profitable opportunities…</div>';
    try {
      await loadVendorData();
      const paymentResult = await handleEventFeeReturn();
      if (paymentResult) await loadVendorData();
      renderVendorRoot();
      if (paymentResult === 'success') toast('Event payment confirmed. Your receipt is available in Bookings.');
      if (paymentResult === 'cancelled') toast('Event payment was not completed. You can return to Bookings when ready.');
    }
    catch (error) { root.innerHTML = `<div class="marketplace-error"><strong>Marketplace unavailable</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" data-marketplace-retry-vendor type="button">Try Again</button></div>`; }
  }

  function hostShellMarkup() {
    return `<div id="hostOpportunityMarketplace" class="host-marketplace"><div class="marketplace-loading">Loading host opportunities…</div></div>`;
  }

  function hostActiveOpportunities() {
    return state.host.opportunities.filter(item => !item.archived_at);
  }

  function hostArchivedOpportunities() {
    return state.host.opportunities.filter(item => item.archived_at);
  }

  function hostApplicationIsActive(application) {
    return !application.archived_at && !application.opportuni…13614 tokens truncated…vent conversation<textarea name="body" required maxlength="1000" rows="3" placeholder="Type your reply here…"></textarea></label><button class="primary-button" type="submit">Send Reply</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function contactModal(contact) {
    const contactLink = (kind, value, label) => value ? `<a class="secondary-button marketplace-link-button" href="${kind}:${encodeURIComponent(value)}">${label}</a>` : '<span class="contact-unavailable">Not provided</span>';
    return `<p class="eyebrow">Confirmed Booking</p><h2 id="customerModalTitle">Contact Details</h2><p>These details are private to the Host and food truck assigned to this confirmed booking.</p><div class="opportunity-detail-grid"><span><small>Host</small><strong>${escapeHtml(contact.host_business_name || contact.host_name || 'Host')}</strong><p>${escapeHtml(contact.host_name || '')}</p><p>${escapeHtml(contact.host_email || 'Email not provided')}</p><p>${escapeHtml(contact.host_phone || 'Phone not provided')}</p><div class="stacked-actions">${contactLink('mailto', contact.host_email, 'Email Host')}${contactLink('tel', contact.host_phone, 'Call Host')}</div></span><span><small>Food Truck</small><strong>${escapeHtml(contact.truck_name || 'Food Truck')}</strong><p>${escapeHtml(contact.truck_email || 'Email not provided')}</p><p>${escapeHtml(contact.truck_phone || 'Phone not provided')}</p><div class="stacked-actions">${contactLink('mailto', contact.truck_email, 'Email Food Truck')}${contactLink('tel', contact.truck_phone, 'Call Food Truck')}</div></span></div>`;
  }

  function reviewModal(bookingId) {
    return `<p class="eyebrow">Post-Opportunity Review</p><h2 id="customerModalTitle">Share your experience</h2><p>Reviews help vendors and hosts make better booking decisions. Keep feedback factual and professional.</p><form id="opportunityReviewForm" data-booking-id="${bookingId}" class="marketplace-form"><label>Overall rating<select name="rating" required><option value="5">5 - Excellent</option><option value="4">4 - Very good</option><option value="3">3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></label><label>Communication<select name="communication"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Accuracy of information<select name="accuracy"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Ease of setup / arrival<select name="setup"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Comments<textarea name="comment" maxlength="1200" rows="4"></textarea></label><button class="primary-button" type="submit">Submit Review</button><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function cancelHostBookingModal(booking) {
    const payment = relatedOne(booking?.event_fee_payments);
    const paid = payment?.status === 'paid';
    const paymentNote = paid
      ? `<p class="event-fee-guidance"><strong>${money(Number(payment.amount_due_cents) / 100)} will be refunded automatically through Stripe</strong> before the booking is cancelled.</p>`
      : payment?.status === 'checkout_open'
        ? '<p class="event-fee-guidance">The food truck currently has Stripe Checkout open. For payment safety, cancellation becomes available after that short session expires.</p>'
        : '<p class="event-fee-guidance">No completed event payment needs to be refunded.</p>';
    return `<form id="cancelHostBookingForm" data-booking-id="${escapeHtml(booking.id)}" class="marketplace-form"><p class="eyebrow">Approved Food Truck</p><h2 id="customerModalTitle">Cancel ${escapeHtml(booking.trucks?.name || 'this food truck')}?</h2><p>This removes the truck from <strong>${escapeHtml(booking.opportunities?.title || 'the opportunity')}</strong>, reopens the truck space when appropriate, and notifies the vendor.</p>${paymentNote}<label>Reason for cancellation<textarea name="reason" required minlength="3" maxlength="500" rows="4" placeholder="Example: We have not received a response after several follow-up messages."></textarea></label><div class="stacked-actions"><button class="secondary-button" data-close-customer-modal type="button">Keep Food Truck</button><button class="danger-button" type="submit" ${payment?.status === 'checkout_open' ? 'disabled title="Wait for the active Stripe Checkout session to expire"' : ''}>Cancel Food Truck${paid ? ' & Refund' : ''}</button></div><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function vendorRouteStopModal(booking, stop) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = Number(stop?.day_of_week ?? new Date(booking.opportunities?.starts_at).getDay());
    return `<form id="vendorRouteStopForm" data-booking-id="${escapeHtml(booking.id)}" class="marketplace-form"><p class="eyebrow">Weekly Route</p><h2 id="customerModalTitle">${stop ? 'Edit' : 'Add'} ${escapeHtml(booking.opportunities?.title || 'booking')}</h2><p>Choose the weekday where this recurring stop belongs. Host changes to the event’s date, time, or location will automatically appear in your in-app schedule.</p><label>Route day<select name="day">${days.map((day, index) => `<option value="${index}"${index === selectedDay ? ' selected' : ''}>${day}</option>`).join('')}</select></label><div class="stacked-actions"><button class="secondary-button" data-close-customer-modal type="button">Close</button><button class="primary-button" type="submit">Save Route Day</button>${stop ? `<button class="danger-button" data-remove-route-booking="${escapeHtml(booking.id)}" type="button">Remove from Weekly Route</button>` : ''}</div><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function cancelVendorBookingModal(booking) {
    const payment = relatedOne(booking?.event_fee_payments);
    const paymentNote = payment?.status === 'paid'
      ? '<p class="event-fee-guidance"><strong>This does not automatically refund a paid event fee.</strong> The Host’s posted cancellation policy applies. Use the event conversation to request any eligible refund.</p>'
      : payment?.status === 'checkout_open' || payment?.status === 'refund_pending'
        ? '<p class="event-fee-guidance"><strong>A payment or refund is still processing.</strong> Finish that process before cancelling.</p>'
        : '<p class="event-fee-guidance">Cancelling removes this booking from your in-app schedule and notifies the Host.</p>';
    const processing = ['checkout_open', 'refund_pending'].includes(payment?.status);
    return `<form id="cancelVendorBookingForm" data-booking-id="${escapeHtml(booking.id)}" class="marketplace-form"><p class="eyebrow">Vendor Schedule</p><h2 id="customerModalTitle">Cancel ${escapeHtml(booking.opportunities?.title || 'this booking')}?</h2>${paymentNote}<label>Reason for cancellation<textarea name="reason" required minlength="3" maxlength="500" rows="4" placeholder="Tell the Host why your food truck cannot attend."></textarea></label><div class="stacked-actions"><button class="secondary-button" data-close-customer-modal type="button">Keep Booking</button><button class="danger-button" type="submit"${processing ? ' disabled title="Wait for payment processing to finish"' : ''}>Cancel Booking</button></div><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  function cancelHostOpportunityModal(opportunity) {
    const applications = state.host.applications.filter(item => item.opportunity_id === opportunity.id && ['pending', 'waitlisted', 'approved'].includes(item.status));
    const bookings = state.host.bookings.filter(item => item.opportunity_id === opportunity.id && item.status === 'confirmed');
    const payments = bookings.map(item => relatedOne(item.event_fee_payments)).filter(Boolean);
    const paid = payments.filter(item => item.status === 'paid');
    const checkoutOpen = payments.some(item => item.status === 'checkout_open');
    const refundTotal = paid.reduce((sum, item) => sum + Number(item.amount_due_cents || 0), 0) / 100;
    const paymentNote = checkoutOpen
      ? '<p class="event-fee-guidance"><strong>A food truck currently has Stripe Checkout open.</strong> For payment safety, try again after that short payment session expires.</p>'
      : paid.length
        ? `<p class="event-fee-guidance"><strong>${money(refundTotal)} across ${paid.length} paid event payment${paid.length === 1 ? '' : 's'} will be refunded automatically through Stripe</strong> before the event is cancelled.</p>`
        : '<p class="event-fee-guidance">No completed event payments need to be refunded.</p>';
    return `<form id="cancelHostOpportunityForm" data-opportunity-id="${escapeHtml(opportunity.id)}" class="marketplace-form"><p class="eyebrow">Posted Opportunity</p><h2 id="customerModalTitle">Cancel ${escapeHtml(opportunity.title)}?</h2><p>This cancels the entire event, not just one food truck. <strong>${applications.length} connected food truck${applications.length === 1 ? '' : 's'}</strong> will receive your reason as an unread message and cancellation notification. Approved bookings will be cancelled and the event will move to Archive.</p>${paymentNote}<label>Why is this event being cancelled?<textarea name="reason" required minlength="3" maxlength="600" rows="5" placeholder="Example: The venue is no longer available due to an unexpected closure."></textarea><small>This message will be sent to every connected food truck.</small></label><div class="stacked-actions"><button class="secondary-button" data-close-customer-modal type="button">Keep Opportunity</button><button class="danger-button" type="submit" ${checkoutOpen ? 'disabled title="Wait for the active Stripe Checkout session to expire"' : ''}>Cancel Entire Event${paid.length ? ' & Refund Payments' : ''}</button></div><p class="form-message" data-marketplace-form-message></p></form>`;
  }

  async function act(button, task, success) {
    const formMessage = button.closest('form')?.querySelector('[data-marketplace-form-message]');
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    if (formMessage) { formMessage.textContent = 'Saving your changes…'; formMessage.classList.remove('success'); }
    try {
      await task();
      if (formMessage?.isConnected) { formMessage.textContent = success; formMessage.classList.add('success'); }
      toast(success);
    }
    catch (error) {
      const message = error?.message || 'The request could not be completed.';
      if (formMessage) { formMessage.textContent = message; formMessage.classList.remove('success'); }
      toast(message, true);
    }
    finally { if (button.isConnected) { button.disabled = false; button.textContent = originalLabel; } }
  }

  function toast(message, error = false) {
    const target = document.getElementById('toast') || document.getElementById('customerToast');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
    target.classList.add('show');
    setTimeout(() => target.classList.remove('show'), 3600);
  }

  function trustedStripeUrl(value, checkout = false) {
    const destination = new URL(value);
    const validHost = checkout
      ? destination.hostname === 'checkout.stripe.com' || destination.hostname.endsWith('.checkout.stripe.com')
      : destination.hostname === 'stripe.com' || destination.hostname.endsWith('.stripe.com');
    if (destination.protocol !== 'https:' || !validHost) throw new Error('Stripe returned an invalid secure address.');
    return destination.toString();
  }

  async function handleEventFeeReturn() {
    const pageUrl = new URL(window.location.href);
    const result = pageUrl.searchParams.get('event_fee');
    if (!['success', 'cancelled'].includes(result)) return '';
    const sessionId = pageUrl.searchParams.get('session_id');
    pageUrl.searchParams.delete('event_fee'); pageUrl.searchParams.delete('session_id'); pageUrl.searchParams.delete('booking_id');
    window.history.replaceState({}, '', pageUrl.toString());
    state.vendor.tab = 'bookings';
    if (result === 'success') {
      if (!sessionId) throw new Error('Stripe did not return an event payment confirmation.');
      await edge('stripe-event-fee-checkout-complete', { sessionId });
    }
    return result;
  }

  async function startHostStripeOnboarding(button = null) {
    if (button) button.disabled = true;
    try {
      const data = await edge('stripe-host-connect-start');
      window.location.assign(trustedStripeUrl(data.onboardingUrl));
    } catch (error) {
      const message = document.querySelector('[data-host-stripe-message]');
      if (message) message.textContent = error.message;
      else toast(error.message, true);
      if (button) button.disabled = false;
    }
  }

  async function refreshHostStripeStatus(button = null) {
    if (button) button.disabled = true;
    try {
      state.host.stripe = await edge('stripe-host-connect-status');
      renderHostRoot();
      toast(state.host.stripe.status === 'active' ? 'Host Stripe account is ready.' : 'Stripe status updated.');
      return state.host.stripe;
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  document.addEventListener('click', async event => {
    if (event.target.closest('[data-close-marketplace-conversation]')) {
      document.getElementById('customerAccountModal')?.classList.add('hidden');
      document.getElementById('marketplaceModal')?.classList.add('hidden');
      return;
    }
    const vendorTab = event.target.closest('[data-vendor-marketplace-tab]');
    if (vendorTab) {
      state.vendor.tab = vendorTab.dataset.vendorMarketplaceTab;
      renderVendorRoot();
      if (vendorTab.hasAttribute('data-marketplace-show-available')) document.querySelector('.marketplace-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const hostTab = event.target.closest('[data-host-marketplace-tab]');
    if (hostTab) { state.host.tab = hostTab.dataset.hostMarketplaceTab; if (state.host.tab === 'post') state.host.editingOpportunityId = null; renderHostRoot(); return; }
    if (event.target.closest('[data-marketplace-retry-vendor]')) { renderVendor(); return; }
    if (event.target.closest('[data-marketplace-retry-host]')) { mountHost(); return; }
    const hostStripeConnect = event.target.closest('[data-host-stripe-connect]');
    if (hostStripeConnect && state.host.stripe?.status !== 'active') { await startHostStripeOnboarding(hostStripeConnect); return; }
    const hostStripeRefresh = event.target.closest('[data-host-stripe-refresh]');
    if (hostStripeRefresh) { await act(hostStripeRefresh, () => refreshHostStripeStatus(), 'Stripe status refreshed.'); return; }
    const viewMode = event.target.closest('[data-marketplace-view-mode]');
    if (viewMode) { state.vendor.view = viewMode.dataset.marketplaceViewMode; renderVendorRoot(); return; }
    if (event.target.closest('[data-marketplace-clear-filters]')) { state.vendor.filters = {}; renderVendorRoot(); return; }
    const view = event.target.closest('[data-marketplace-view]');
    if (view) { const item = state.vendor.opportunities.find(opportunity => opportunity.id === view.dataset.marketplaceView); if (item) openMarketplaceModal(opportunityModal(item)); return; }
    const vendorAlert = event.target.closest('[data-vendor-alert-opportunity]');
    if (vendorAlert) {
      vendorAlert.disabled = true;
      try {
        const opportunityId = vendorAlert.dataset.vendorAlertOpportunity;
        const applicationId = vendorAlert.dataset.vendorAlertApplication;
        const notificationId = vendorAlert.dataset.marketplaceNotificationId;
        const item = opportunityId ? await loadVendorOpportunityDetail(opportunityId) : null;
        if (notificationId) {
          await rpc('mark_marketplace_notifications_read', { p_notification_ids: [notificationId] });
          const notification = state.vendor.notifications.find(entry => String(entry.id) === String(notificationId));
          if (notification) notification.is_read = true;
        }
        renderVendorRoot();
        if (item) {
          openMarketplaceModal(opportunityModal(item));
        } else if (applicationId) {
          state.vendor.tab = 'applications';
          renderVendorRoot();
          document.querySelector(`[data-vendor-application-record="${CSS.escape(applicationId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast('This opportunity is no longer available. Its application record is shown instead.');
        } else {
          toast('This opportunity is no longer available.', true);
        }
      } catch (error) {
        vendorAlert.disabled = false;
        toast(error.message || 'The opportunity details could not be opened.', true);
      }
      return;
    }
    const vendorBookingOpportunity = event.target.closest('[data-vendor-booking-opportunity]');
    if (vendorBookingOpportunity) {
      await act(vendorBookingOpportunity, async () => {
        const item = await loadVendorOpportunityDetail(vendorBookingOpportunity.dataset.vendorBookingOpportunity);
        if (!item) throw new Error('This opportunity is no longer available.');
        openMarketplaceModal(opportunityModal(item));
      }, 'Opportunity details opened.');
      return;
    }
    const openVendorApplication = event.target.closest('[data-open-vendor-application]');
    if (openVendorApplication) {
      state.vendor.tab = 'applications';
      document.getElementById('customerAccountModal')?.classList.add('hidden');
      document.getElementById('marketplaceModal')?.classList.add('hidden');
      renderVendorRoot();
      document.querySelector(`[data-vendor-application-record="${openVendorApplication.dataset.openVendorApplication}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const hostTruckProfile = event.target.closest('[data-host-truck-profile]');
    if (hostTruckProfile) {
      await act(hostTruckProfile, async () => {
        if (window.FoodTrekNowCustomerPortal?.openTruckStorefrontFromHost) {
          await window.FoodTrekNowCustomerPortal.openTruckStorefrontFromHost(hostTruckProfile.dataset.hostTruckProfile);
          return;
        }
        const profile = await rpc('get_marketplace_truck_profile', { p_truck_id: hostTruckProfile.dataset.hostTruckProfile });
        openMarketplaceModal(truckProfileModal(profile));
      }, 'Customer storefront opened.');
      return;
    }
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
    const vendorSpaceMapButton = event.target.closest('[data-vendor-space-map]');
    if (vendorSpaceMapButton) {
      const booking = state.vendor.bookings.find(item => item.id === vendorSpaceMapButton.dataset.vendorSpaceMap);
      if (!booking) return;
      const eventBookings = state.vendor.bookings.filter(item => item.opportunity_id === booking.opportunity_id && item.status === 'confirmed');
      openMarketplaceModal(`<p class="eyebrow">Navigate to Vendor Space</p><h2 id="customerModalTitle">${escapeHtml(booking.opportunities?.title || 'Event Map')}</h2>${vendorSpaceSummary(booking)}${eventSpaceMap(booking.opportunities, eventBookings, { highlightBookingId: booking.id })}<p class="estimate-disclaimer">Your assigned pin is highlighted. Use Navigate to Event for turn-by-turn directions to the venue, then follow the event entrance and space instructions shown above.</p>`);
      return;
    }
    const vendorCheckIn = event.target.closest('[data-vendor-check-in]');
    if (vendorCheckIn) {
      if (vendorCheckIn.textContent.trim() === 'Departed') return;
      await act(vendorCheckIn, async () => {
        await rpc('vendor_event_check_in', { p_booking_id: vendorCheckIn.dataset.vendorCheckIn, p_status: vendorCheckIn.dataset.checkInStatus });
        await loadVendorData(); renderVendorRoot();
      }, 'Your event arrival status was sent to the Host.');
      return;
    }
    if (event.target.closest('[data-marketplace-location]')) {
      if (!navigator.geolocation) { toast('Location is not supported on this device.', true); return; }
      navigator.geolocation.getCurrentPosition(position => { state.vendor.location = { latitude: position.coords.latitude, longitude: position.coords.longitude }; renderVendorRoot(); toast('Distances updated using your current location.'); }, error => toast(error.message || 'Location permission was not granted.', true), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); return;
    }
    const cancelHostBooking = event.target.closest('[data-cancel-host-booking]');
    if (cancelHostBooking) {
      const booking = state.host.bookings.find(item => item.id === cancelHostBooking.dataset.cancelHostBooking);
      if (booking) openMarketplaceModal(cancelHostBookingModal(booking));
      return;
    }
    const cancelHostOpportunity = event.target.closest('[data-cancel-host-opportunity]');
    if (cancelHostOpportunity) {
      const opportunity = state.host.opportunities.find(item => item.id === cancelHostOpportunity.dataset.cancelHostOpportunity);
      if (opportunity) openMarketplaceModal(cancelHostOpportunityModal(opportunity));
      return;
    }
    const archiveOpportunity = event.target.closest('[data-archive-host-opportunity]');
    if (archiveOpportunity) {
      if (!window.confirm('Archive this completed or cancelled event? Its applications and messages will remain available in Archive.')) return;
      await act(archiveOpportunity, async () => {
        await rpc('archive_host_opportunity', { p_opportunity_id: archiveOpportunity.dataset.archiveHostOpportunity });
        await loadHostData();
        state.host.tab = 'archive';
        renderHostRoot();
      }, 'Event moved to Archive.');
      return;
    }
    const restoreOpportunity = event.target.closest('[data-restore-host-opportunity]');
    if (restoreOpportunity) {
      await act(restoreOpportunity, async () => {
        await rpc('restore_host_opportunity_archive', { p_opportunity_id: restoreOpportunity.dataset.restoreHostOpportunity });
        await loadHostData();
        state.host.tab = 'opportunities';
        renderHostRoot();
      }, 'Event removed from Archive.');
      return;
    }
    const archiveApplication = event.target.closest('[data-archive-host-application]');
    if (archiveApplication) {
      if (!window.confirm('Archive this unapproved application? Its event conversation will remain available.')) return;
      await act(archiveApplication, async () => {
        await rpc('archive_host_application', { p_application_id: archiveApplication.dataset.archiveHostApplication });
        await loadHostData();
        state.host.tab = 'applications';
        renderHostRoot();
      }, 'Application moved to Archive.');
      return;
    }
    const restoreApplication = event.target.closest('[data-restore-host-application]');
    if (restoreApplication) {
      await act(restoreApplication, async () => {
        await rpc('restore_host_application_archive', { p_application_id: restoreApplication.dataset.restoreHostApplication });
        await loadHostData();
        state.host.tab = 'applications';
        renderHostRoot();
      }, 'Application restored.');
      return;
    }
    const decision = event.target.closest('[data-host-decision]');
    if (decision) { await act(decision, async () => { await rpc('decide_opportunity_application', { p_application_id: decision.dataset.applicationId, p_decision: decision.dataset.hostDecision, p_host_response: '' }); await loadHostData(); if (decision.dataset.hostDecision === 'approved') state.host.tab = 'bookings'; renderHostRoot(); }, decision.dataset.hostDecision === 'approved' ? 'Food truck approved and moved to Approved Food Trucks.' : `Application ${decision.dataset.hostDecision}.`); return; }
    const smartPlace = event.target.closest('[data-smart-place-event]');
    if (smartPlace) {
      const opportunity = state.host.opportunities.find(item => item.id === smartPlace.dataset.smartPlaceEvent);
      const bookings = state.host.bookings.filter(item => item.opportunity_id === opportunity?.id && item.status === 'confirmed');
      if (!opportunity || !bookings.length) return;
      if (!window.confirm(`Create evenly distributed starting positions for ${bookings.length} approved food truck${bookings.length === 1 ? '' : 's'}? You can fine-tune every position afterward.`)) return;
      await act(smartPlace, async () => {
        const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(bookings.length))));
        const rows = Math.ceil(bookings.length / columns);
        for (let index = 0; index < bookings.length; index += 1) {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const mapX = columns === 1 ? 50 : 15 + column * (70 / (columns - 1));
          const mapY = rows === 1 ? 50 : 20 + row * (60 / (rows - 1));
          const booking = bookings[index];
          await rpc('assign_vendor_space', { p_booking_id: booking.id, p_space_code: booking.space_code || `FT-${String(index + 1).padStart(2, '0')}`, p_space_label: booking.space_label || booking.trucks?.cuisine || '', p_map_x: Number(mapX.toFixed(1)), p_map_y: Number(mapY.toFixed(1)), p_arrival_window_start: booking.arrival_window_start, p_arrival_window_end: booking.arrival_window_end, p_electrical_access: booking.electrical_access || '', p_water_access: booking.water_access || '', p_generator_permitted: Boolean(booking.generator_permitted) });
        }
        await rpc('save_event_logistics', { p_opportunity_id: opportunity.id, p_site_map_image_url: opportunity.site_map_image_url || '', p_vendor_zone_name: opportunity.vendor_zone_name || '', p_vendor_entrance: opportunity.vendor_entrance || '', p_customer_map_enabled: Boolean(opportunity.customer_map_enabled), p_event_logistics_notes: opportunity.event_logistics_notes || '', p_placement_strategy: 'smart' });
        await loadHostData(); state.host.tab = 'logistics'; renderHostRoot();
      }, 'Smart Placement created. Review and fine-tune the assigned spaces.');
      return;
    }
    const conversationCard = event.target.closest('[data-vendor-conversation-card]');
    if (conversationCard && !event.target.closest('button, a, input, select, textarea, label')) {
      conversationCard.querySelector('[data-marketplace-message]')?.click();
      return;
    }
    const message = event.target.closest('[data-marketplace-message]');
    if (message) {
      state.selectedApplication = message.dataset.marketplaceMessage;
      openMarketplaceModal(messageModal(state.selectedApplication));
      try {
        if (state.activeRole === 'vendor') {
          const section = message.dataset.messageSection || (['applications', 'messages', 'bookings'].includes(state.vendor.tab) ? state.vendor.tab : 'messages');
          await rpc('mark_vendor_opportunity_section_read', { p_application_id: state.selectedApplication, p_section: section });
          const field = { applications: 'vendor_applications_read_at', messages: 'vendor_messages_read_at', bookings: 'vendor_bookings_read_at' }[section];
          state.vendor.messages.forEach(item => { if (item.application_id === state.selectedApplication && item.sender_role === 'host') item[field] = item[field] || new Date().toISOString(); });
          renderVendorRoot();
        } else {
          await rpc('mark_opportunity_messages_read', { p_application_id: state.selectedApplication });
          state.host.messages.forEach(item => { if (item.application_id === state.selectedApplication && item.sender_role === 'vendor') item.read_at = item.read_at || new Date().toISOString(); });
          state.host.applications.forEach(item => { if (item.id === state.selectedApplication && clean(item.vendor_message)) item.host_application_read_at = item.host_application_read_at || new Date().toISOString(); });
          renderHostRoot();
        }
      } catch (error) { toast(`Messages opened, but the unread count could not be updated: ${error.message}`, true); }
      return;
    }
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
    const calendar = event.target.closest('[data-booking-calendar]');
    if (calendar) {
      const booking = state.vendor.bookings.find(item => item.id === calendar.dataset.bookingCalendar);
      if (booking) {
        try { openMarketplaceModal(calendarChoiceModal(booking)); }
        catch (error) { toast(error.message, true); }
      }
      return;
    }
    const calendarProvider = event.target.closest('[data-booking-calendar-provider]');
    if (calendarProvider) {
      const booking = state.vendor.bookings.find(item => item.id === calendarProvider.dataset.bookingId);
      if (!booking) return;
      try {
        const provider = calendarProvider.dataset.bookingCalendarProvider;
        if (provider === 'device' || provider === 'ics') {
          downloadBookingCalendar(booking);
          toast('Calendar file downloaded. Open it to add the booking to your device calendar.');
        } else {
          const url = calendarUrl(provider, bookingCalendarDetails(booking));
          if (!url) throw new Error('That calendar option is unavailable.');
          window.open(url, '_blank', 'noopener');
        }
      } catch (error) { toast(error.message, true); }
      return;
    }
    const payEventFee = event.target.closest('[data-event-fee-pay]');
    if (payEventFee) {
      await act(payEventFee, async () => {
        if (testPaymentMode) {
          await edge('test-event-fee-checkout-start', { bookingId: payEventFee.dataset.eventFeePay });
          await loadVendorData(); renderVendorRoot();
          return;
        }
        const data = await edge('stripe-event-fee-checkout-start', { bookingId: payEventFee.dataset.eventFeePay });
        window.location.assign(trustedStripeUrl(data.checkoutUrl, true));
      }, testPaymentMode ? 'Test payment completed - no money was charged.' : 'Opening secure Stripe Checkout…');
      return;
    }
    const refundEventFee = event.target.closest('[data-event-fee-refund]');
    if (refundEventFee) {
      if (!window.confirm('Refund the full event fee and refundable deposit? This action cannot be undone.')) return;
      await act(refundEventFee, async () => {
        await edge('stripe-event-fee-refund', { paymentId: refundEventFee.dataset.eventFeeRefund, confirmed: true });
        await loadHostData(); renderHostRoot();
      }, 'The full event payment refund was submitted to Stripe.');
      return;
    }
    const review = event.target.closest('[data-review-booking]');
    if (review) { openMarketplaceModal(reviewModal(review.dataset.reviewBooking)); return; }
    const editRoute = event.target.closest('[data-edit-route-booking]');
    if (editRoute) {
      const booking = state.vendor.bookings.find(item => String(item.id) === String(editRoute.dataset.editRouteBooking));
      if (booking) openMarketplaceModal(vendorRouteStopModal(booking, routeStopForBooking(booking.id)));
      return;
    }
    const removeRoute = event.target.closest('[data-remove-route-booking]');
    if (removeRoute) {
      await act(removeRoute, async () => {
        await rpc('remove_booking_from_weekly_route', { p_booking_id: removeRoute.dataset.removeRouteBooking });
        await loadVendorData();
        state.vendor.tab = 'route';
        document.getElementById('customerAccountModal')?.classList.add('hidden');
        document.getElementById('marketplaceModal')?.classList.add('hidden');
        renderVendorRoot();
      }, 'Booking removed from your weekly route.');
      return;
    }
    const cancelVendorBooking = event.target.closest('[data-cancel-vendor-booking]');
    if (cancelVendorBooking) {
      const booking = state.vendor.bookings.find(item => String(item.id) === String(cancelVendorBooking.dataset.cancelVendorBooking));
      if (booking) openMarketplaceModal(cancelVendorBookingModal(booking));
      return;
    }
    const route = event.target.closest('[data-route-booking]');
    if (route) {
      const booking = state.vendor.bookings.find(item => item.id === route.dataset.routeBooking);
      if (booking) openMarketplaceModal(vendorRouteStopModal(booking, null));
      return;
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
      const location = state.host.locations.find(entry => entry.id === item.location_id) || {};
      state.host.editingOpportunityId = item.id; state.host.tab = 'post'; renderHostRoot(); const form = document.getElementById('hostOpportunityForm'); if (!form) return;
      const localInput = value => value ? new Date(value).toISOString().slice(0, 16) : '';
      const recurrence = relatedOne(item.opportunity_recurrence_rules) || item.recurrence;
      const values = { opportunityId: item.id, locationName: location.name, locationType: location.location_type, locationAddress1: location.address_line1, locationAddress2: location.address_line2, locationCity: location.city, locationState: location.state, locationPostalCode: location.postal_code, locationLatitude: location.latitude, locationLongitude: location.longitude, title: item.title, description: item.description, opportunityType: item.opportunity_type, eventType: item.event_type, bookingMode: item.booking_mode, startsAt: localInput(item.starts_at), endsAt: localInput(item.ends_at), arrivalTime: localInput(item.arrival_time), expectedCustomers: item.expected_customers, trucksRequested: item.trucks_requested, cuisines: asArray(item.cuisine_preferences).join(', '), indoorOutdoor: item.indoor_outdoor, flatFee: item.flat_vendor_fee, percentageFee: item.sales_percentage, minimumGuarantee: item.minimum_sales_guarantee, deposit: item.refundable_deposit, parking: item.parking_instructions, setup: item.setup_instructions, requirements: item.special_requirements, cancellation: item.cancellation_policy, frequency: recurrence?.frequency || 'none', recurrenceEnds: recurrence?.recurrence_ends_on || '' };
      Object.entries(values).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; }); form.elements.electricity.checked = item.electricity_available; form.elements.water.checked = item.water_available; form.querySelectorAll('input[name="day"]').forEach(input => { input.checked = asArray(recurrence?.days_of_week).includes(Number(input.value)); }); syncHostOpportunityDateLabels(form); form.scrollIntoView({ behavior: 'smooth' }); return;
    }
    if (event.target.closest('[data-close-marketplace-modal]')) document.getElementById('marketplaceModal')?.classList.add('hidden');
  });

  document.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const card = event.target.closest('[data-vendor-conversation-card]');
    if (!card || event.target !== card) return;
    event.preventDefault();
    card.querySelector('[data-marketplace-message]')?.click();
  });

  let activeNativePickerInput = null;

  function closeNativeDateTimePicker() {
    activeNativePickerInput?.blur?.();
    activeNativePickerInput = null;
    document.getElementById('nativeDateTimePickerClose')?.remove();
  }

  document.addEventListener('focusin', event => {
    if (!event.target.matches?.('input[type="date"], input[type="time"], input[type="datetime-local"]')) return;
    activeNativePickerInput = event.target;
    let close = document.getElementById('nativeDateTimePickerClose');
    if (!close) {
      close = document.createElement('button');
      close.id = 'nativeDateTimePickerClose';
      close.className = 'native-picker-close';
      close.type = 'button';
      close.dataset.closeNativePicker = '';
      close.setAttribute('aria-label', 'Close date or time selector');
      close.textContent = '×';
      document.body.appendChild(close);
    }
  });

  document.addEventListener('focusout', event => {
    if (event.target !== activeNativePickerInput) return;
    window.setTimeout?.(() => {
      if (document.activeElement?.id !== 'nativeDateTimePickerClose' && document.activeElement !== activeNativePickerInput) closeNativeDateTimePicker();
    }, 0);
  });

  document.addEventListener('change', event => {
    if (event.target.matches?.('#hostOpportunityForm [data-weekday-target]')) syncHostOpportunityDateLabels(event.target.form);
    if (event.target.matches?.('#hostOpportunityForm [name="frequency"]')) {
      if (event.target.form.elements.opportunityType) event.target.form.elements.opportunityType.value = event.target.value === 'none' ? 'one_time' : 'recurring';
      syncHostOpportunityDateLabels(event.target.form);
    }
    if (event.target.matches?.('#hostOpportunityForm [name="opportunityType"]')) {
      const form = event.target.form;
      if (event.target.value === 'one_time') form.elements.frequency.value = 'none';
      else if (form.elements.frequency.value === 'none') form.elements.frequency.value = 'weekly';
      syncHostOpportunityDateLabels(form);
    }
    if (event.target === activeNativePickerInput) closeNativeDateTimePicker();
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-native-picker]')) closeNativeDateTimePicker();
  });

  document.addEventListener('submit', async event => {
    if (event.target.id === 'marketplaceFilters') {
      event.preventDefault(); const form = new FormData(event.target); state.vendor.filters = Object.fromEntries(form.entries()); ['noFee', 'power', 'water'].forEach(key => state.vendor.filters[key] = event.target.elements[key].checked); renderVendorRoot(); return;
    }
    if (event.target.matches('.event-logistics-form')) {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      await act(button, async () => {
        await rpc('save_event_logistics', { p_opportunity_id: form.dataset.opportunityId, p_site_map_image_url: data.get('siteMapImageUrl'), p_vendor_zone_name: data.get('vendorZoneName'), p_vendor_entrance: data.get('vendorEntrance'), p_customer_map_enabled: form.elements.customerMapEnabled.checked, p_event_logistics_notes: data.get('eventLogisticsNotes'), p_placement_strategy: data.get('placementStrategy') });
        await loadHostData(); state.host.tab = 'logistics'; renderHostRoot();
      }, 'Event map and logistics instructions saved.');
      return;
    }
    if (event.target.matches('.vendor-space-assignment-form')) {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      await act(button, async () => {
        await rpc('assign_vendor_space', { p_booking_id: form.dataset.bookingId, p_space_code: data.get('spaceCode'), p_space_label: data.get('spaceLabel'), p_map_x: Number(data.get('mapX')), p_map_y: Number(data.get('mapY')), p_arrival_window_start: data.get('arrivalStart') ? new Date(data.get('arrivalStart')).toISOString() : null, p_arrival_window_end: data.get('arrivalEnd') ? new Date(data.get('arrivalEnd')).toISOString() : null, p_electrical_access: data.get('electricalAccess'), p_water_access: data.get('waterAccess'), p_generator_permitted: form.elements.generatorPermitted.checked });
        await loadHostData(); state.host.tab = 'logistics'; renderHostRoot();
      }, 'Vendor space assigned and the food truck was notified.');
      return;
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
      const opportunityId = data.get('opportunityId') || state.host.editingOpportunityId || null;
      const editing = Boolean(opportunityId);
      const existingOpportunity = editing ? state.host.opportunities.find(item => String(item.id) === String(opportunityId)) : null;
      const termsLocked = editing && state.host.bookings.some(booking => String(booking.opportunity_id) === String(opportunityId));
      const financialTerms = {
        flatFee: termsLocked ? Number(existingOpportunity?.flat_vendor_fee || 0) : Number(data.get('flatFee') || 0),
        percentageFee: termsLocked ? Number(existingOpportunity?.sales_percentage || 0) : Number(data.get('percentageFee') || 0),
        minimumGuarantee: termsLocked ? Number(existingOpportunity?.minimum_sales_guarantee || 0) : Number(data.get('minimumGuarantee') || 0),
        deposit: termsLocked ? Number(existingOpportunity?.refundable_deposit || 0) : Number(data.get('deposit') || 0)
      };
      const expected = {
        title: clean(data.get('title')),
        description: clean(data.get('description')),
        startsAt: new Date(data.get('startsAt')).toISOString(),
        endsAt: new Date(data.get('endsAt')).toISOString(),
        locationName: clean(data.get('locationName')),
        locationAddress1: clean(data.get('locationAddress1')),
        locationCity: clean(data.get('locationCity')),
        locationState: clean(data.get('locationState')),
        locationPostalCode: clean(data.get('locationPostalCode'))
      };
      if (!testPaymentMode && financialTerms.flatFee + financialTerms.deposit > 0 && state.host.stripe?.status !== 'active') {
        toast('Connect and activate the Host Stripe account under Payments before publishing an opportunity with a fee or deposit.', true);
        state.host.tab = 'payments'; renderHostRoot(); return;
      }
      await act(button, async () => {
        const result = await rpc('publish_opportunity_with_location', {
          p_opportunity_id: opportunityId,
          p_location_name: data.get('locationName'),
          p_location_type: data.get('locationType'),
          p_location_address_line1: data.get('locationAddress1'),
          p_location_address_line2: data.get('locationAddress2'),
          p_location_city: data.get('locationCity'),
          p_location_state: data.get('locationState'),
          p_location_postal_code: data.get('locationPostalCode'),
          p_location_latitude: data.get('locationLatitude') || null,
          p_location_longitude: data.get('locationLongitude') || null,
          p_title: data.get('title'), p_description: data.get('description'),
          p_opportunity_type: data.get('frequency') === 'none' ? 'one_time' : data.get('opportunityType'), p_event_type: data.get('eventType'),
          p_booking_mode: data.get('bookingMode'), p_starts_at: expected.startsAt,
          p_ends_at: expected.endsAt, p_expected_customers: Number(data.get('expectedCustomers')),
          p_trucks_requested: Number(data.get('trucksRequested')),
          p_cuisine_preferences: clean(data.get('cuisines')).split(',').map(value => value.trim()).filter(Boolean),
          p_indoor_outdoor: data.get('indoorOutdoor'), p_flat_vendor_fee: financialTerms.flatFee,
          p_sales_percentage: financialTerms.percentageFee, p_minimum_sales_guarantee: financialTerms.minimumGuarantee,
          p_refundable_deposit: financialTerms.deposit, p_electricity_available: form.elements.electricity.checked,
          p_water_available: form.elements.water.checked,
          p_arrival_time: data.get('arrivalTime') ? new Date(data.get('arrivalTime')).toISOString() : null,
          p_parking_instructions: data.get('parking'), p_setup_instructions: data.get('setup'),
          p_special_requirements: data.get('requirements'), p_cancellation_policy: data.get('cancellation'),
          p_recurrence: data.get('opportunityType') === 'recurring' && data.get('frequency') !== 'none' ? { frequency: data.get('frequency'), interval_count: 1, days_of_week: days, recurrence_ends_on: data.get('recurrenceEnds') || null } : null
        });
        const saved = relatedOne(result);
        if (!saved?.id || (editing && String(saved.id) !== String(opportunityId))) throw new Error('The opportunity update could not be confirmed. Please try again.');
        await loadHostData();
        const reloaded = state.host.opportunities.find(item => String(item.id) === String(saved.id));
        const reloadedLocation = reloaded ? state.host.locations.find(item => String(item.id) === String(reloaded.location_id)) : null;
        const verified = reloaded && reloadedLocation
          && clean(reloaded.title) === expected.title
          && clean(reloaded.description) === expected.description
          && sameInstant(reloaded.starts_at, expected.startsAt)
          && sameInstant(reloaded.ends_at, expected.endsAt)
          && clean(reloadedLocation.name) === expected.locationName
          && clean(reloadedLocation.address_line1) === expected.locationAddress1
          && clean(reloadedLocation.city) === expected.locationCity
          && clean(reloadedLocation.state) === expected.locationState
          && clean(reloadedLocation.postal_code) === expected.locationPostalCode;
        if (!verified) throw new Error('The edited event was not returned with the new information. Your edit page remains open so you can try again.');
        state.host.editingOpportunityId = null; state.host.tab = 'opportunities'; renderHostRoot(); window.FoodTrekNowKeepHostPortal?.();
      }, editing ? 'Changes saved. Connected food trucks were notified.' : 'Opportunity published successfully.'); return;
    }
    if (event.target.id === 'opportunityMessageForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      await act(button, async () => { await rpc('send_opportunity_message', { p_application_id: event.target.dataset.applicationId, p_body: data.get('body') }); event.target.reset(); if (state.activeRole === 'vendor') await loadVendorData(); else await loadHostData(); openMarketplaceModal(messageModal(event.target.dataset.applicationId)); }, 'Reply sent.'); return;
    }
    if (event.target.id === 'vendorRouteStopForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      await act(button, async () => {
        await rpc('add_booking_to_weekly_route', { p_booking_id: event.target.dataset.bookingId, p_day_of_week: Number(data.get('day')) });
        await loadVendorData();
        state.vendor.tab = 'route';
        document.getElementById('customerAccountModal')?.classList.add('hidden');
        document.getElementById('marketplaceModal')?.classList.add('hidden');
        renderVendorRoot();
      }, 'Weekly route day saved.'); return;
    }
    if (event.target.id === 'cancelVendorBookingForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      await act(button, async () => {
        await rpc('cancel_vendor_opportunity_booking', { p_booking_id: event.target.dataset.bookingId, p_reason: data.get('reason') });
        await loadVendorData();
        state.vendor.tab = 'bookings';
        document.getElementById('customerAccountModal')?.classList.add('hidden');
        document.getElementById('marketplaceModal')?.classList.add('hidden');
        renderVendorRoot();
      }, 'Booking cancelled, removed from your schedule, and the Host was notified.'); return;
    }
    if (event.target.id === 'cancelHostBookingForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      const booking = state.host.bookings.find(item => item.id === event.target.dataset.bookingId);
      if (!booking) { toast('The approved booking could not be found.', true); return; }
      await act(button, async () => {
        const payment = relatedOne(booking.event_fee_payments);
        if (payment?.status === 'paid') await edge('stripe-event-fee-refund', { paymentId: payment.id, confirmed: true });
        await rpc('cancel_host_opportunity_booking', { p_booking_id: booking.id, p_reason: data.get('reason') });
        await loadHostData();
        document.getElementById('customerAccountModal')?.classList.add('hidden');
        document.getElementById('marketplaceModal')?.classList.add('hidden');
        renderHostRoot();
      }, 'Food truck booking cancelled and vendor notified.'); return;
    }
    if (event.target.id === 'cancelHostOpportunityForm') {
      event.preventDefault(); const button = event.target.querySelector('button[type="submit"]'); const data = new FormData(event.target);
      const opportunity = state.host.opportunities.find(item => item.id === event.target.dataset.opportunityId);
      if (!opportunity) { toast('The posted opportunity could not be found.', true); return; }
      await act(button, async () => {
        const bookings = state.host.bookings.filter(item => item.opportunity_id === opportunity.id && item.status === 'confirmed');
        const paidPayments = bookings.map(item => relatedOne(item.event_fee_payments)).filter(payment => payment?.status === 'paid');
        for (const payment of paidPayments) {
          await edge('stripe-event-fee-refund', { paymentId: payment.id, confirmed: true });
        }
        await rpc('cancel_host_opportunity', { p_opportunity_id: opportunity.id, p_reason: data.get('reason') });
        await loadHostData();
        state.host.editingOpportunityId = null;
        state.host.tab = 'archive';
        document.getElementById('customerAccountModal')?.classList.add('hidden');
        document.getElementById('marketplaceModal')?.classList.add('hidden');
        renderHostRoot();
      }, 'Event cancelled. Connected food trucks were notified and the event was archived.'); return;
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
        if (state.activeRole === 'vendor') refreshVisibleVendorPortal();
        if (state.activeRole === 'host') refreshVisibleHostPortal();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunity_applications' }, () => {
        if (state.activeRole === 'vendor') refreshVisibleVendorPortal();
        if (state.activeRole === 'host') refreshVisibleHostPortal();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'opportunity_messages' }, async payload => {
        if (state.activeRole === 'vendor') await loadVendorData();
        if (state.activeRole === 'host') await loadHostData();
        const openForm = document.getElementById('opportunityMessageForm');
        if (openForm?.dataset.applicationId === payload.new.application_id) openMarketplaceModal(messageModal(payload.new.application_id));
        else if (state.activeRole === 'vendor') renderVendorRoot();
        else if (state.activeRole === 'host' && !document.querySelector('#hostOpportunityMarketplace form')) renderHostRoot();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunity_bookings' }, () => {
        if (state.activeRole === 'vendor') refreshVisibleVendorPortal();
        if (state.activeRole === 'host') refreshVisibleHostPortal();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_notifications' }, () => {
        if (state.activeRole === 'vendor') refreshVisibleVendorPortal();
        if (state.activeRole === 'host') refreshVisibleHostPortal();
      })
      .subscribe();
  }

  let vendorRefreshPromise = null;

  async function refreshVisibleVendorPortal() {
    if (state.activeRole !== 'vendor' || document.hidden || !document.getElementById('vendorOpportunityMarketplace')) return;
    if (vendorRefreshPromise) return vendorRefreshPromise;
    vendorRefreshPromise = (async () => {
      try { await loadVendorData(); renderVendorRoot(); } catch { /* Realtime or the next refresh will retry. */ }
    })();
    try { await vendorRefreshPromise; } finally { vendorRefreshPromise = null; }
  }

  async function refreshVisibleHostPortal() {
    if (state.activeRole !== 'host' || document.hidden || !document.getElementById('hostOpportunityMarketplace')) return;
    if (document.querySelector('#hostOpportunityMarketplace form')) return;
    try { await loadHostData(); renderHostRoot(); } catch { /* Realtime or the next refresh will retry. */ }
  }

  window.addEventListener?.('focus', refreshVisibleHostPortal);
  window.addEventListener?.('focus', refreshVisibleVendorPortal);
  window.setInterval?.(refreshVisibleHostPortal, 15000);
  window.setInterval?.(refreshVisibleVendorPortal, 10000);

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
