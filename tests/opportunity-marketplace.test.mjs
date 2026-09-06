import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Phase 1 marketplace extends existing identities with protected opportunity entities', async () => {
  const migration = await read('supabase/migrations/202608280001_location_marketplace_phase1.sql');
  for (const table of [
    'location_hosts', 'host_locations', 'opportunities', 'opportunity_recurrence_rules',
    'opportunity_applications', 'opportunity_bookings', 'opportunity_favorites', 'vendor_routes',
    'vendor_route_stops', 'opportunity_messages', 'marketplace_notifications', 'opportunity_reviews'
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /references public\.profiles\(id\)/);
  assert.match(migration, /references public\.vendor_profiles\(id\)/);
  assert.match(migration, /references public\.trucks\(id\)/);
  assert.doesNotMatch(migration, /create table[^;]+(?:users|accounts)\s*\(/i);
});

test('all marketplace state changes use authenticated security-definer RPCs', async () => {
  const migration = await read('supabase/migrations/202608280001_location_marketplace_phase1.sql');
  for (const fn of [
    'upsert_location_host', 'save_host_location', 'publish_opportunity', 'apply_to_opportunity',
    'decide_opportunity_application', 'toggle_opportunity_favorite', 'add_booking_to_weekly_route',
    'send_opportunity_message', 'submit_opportunity_review', 'mark_marketplace_notifications_read'
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`));
  }
  assert.match(migration, /security definer set search_path = public/g);
  assert.match(migration, /if auth\.uid\(\) is null then raise exception 'Sign in to create a host account'/);
  assert.match(migration, /Only the vendor and host can message/);
  assert.match(migration, /Reviews are available after the opportunity ends/);
  assert.match(migration, /case when p_action = 'book' then 'A food truck booked your opportunity' else 'New food truck application' end/);
});

test('vendor and dedicated host portals load the modular responsive marketplace', async () => {
  const [html, app, customer, marketplace, styles, worker] = await Promise.all([
    read('index.html'), read('js/app.js'), read('js/customer-account.js'),
    read('js/opportunity-marketplace.js'), read('css/opportunity-marketplace.css'), read('service-worker.js')
  ]);
  assert.match(html, /data-page="opportunities">Find Locations/);
  assert.match(html, /id="vendorOpportunityMarketplace"/);
  assert.match(html, /id="openHostPortalButton"/);
  assert.match(html, /id="hostPortalView"/);
  assert.match(html, /id="hostOpportunityMarketplace"/);
  assert.doesNotMatch(html, /data-customer-page="hostOpportunities"/);
  assert.match(html, /js\/opportunity-marketplace\.js\?v=host-edit-3/);
  assert.ok(html.indexOf('js/opportunity-marketplace.js') < html.indexOf('js/app.js'));
  assert.ok(html.indexOf('js/opportunity-marketplace.js') < html.indexOf('js/customer-account.js'));
  assert.match(app, /FoodTrekNowOpportunityMarketplace\?\.renderVendor/);
  assert.match(customer, /FoodTrekNowOpportunityMarketplace\?\.mountHost/);
  assert.match(customer, /ftnPortalDestinationV1/);
  assert.match(customer, /function openHostPortal/);
  for (const label of ['Open Spots Today', 'Weekly Route', 'Request Spot', 'Book Now', 'Use My Location', 'Publish Opportunity', 'Approve', 'Waitlist', 'Decline', 'Send Reply']) {
    assert.match(marketplace, new RegExp(label));
  }
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(worker, /css\/opportunity-marketplace\.css/);
  assert.match(worker, /js\/opportunity-marketplace\.js/);
  assert.match(marketplace, /Round-trip mileage/);
  assert.match(marketplace, /Estimated travel cost/);
  assert.match(marketplace, /trucks\(id, name, cuisine\)/);
  assert.doesNotMatch(marketplace, /trucks\([^)]*business_phone/);
  assert.match(marketplace, /\['messages', 'Messages'\]/);
  assert.match(marketplace, /function vendorMessagesMarkup\(\)/);
  assert.match(marketplace, /Reply to this event conversation/);
  assert.match(marketplace, /Messages in this thread apply only to this event/);
  assert.match(marketplace, /table: 'opportunity_messages'/);
  assert.match(marketplace, /modal\.parentElement !== document\.body/);
  assert.match(marketplace, /document\.body\.appendChild\(modal\)/);
  assert.match(marketplace, /data-marketplace-show-available/);
  assert.match(marketplace, /Click to view/);
  assert.match(marketplace, /opportunityCardTarget/);
  assert.match(styles, /opportunity-card-clickable/);
  assert.match(marketplace, /appliedOpportunityIds\.has\(item\.id\)/);
  assert.match(marketplace, /Reply to Host/);
  assert.match(marketplace, /You may still message the Host with questions about this decision/);
  assert.match(marketplace, /Open Applications or Messages to continue the conversation/);
});

test('Hosts can inspect applicant customer-facing truck menus and ratings without private account data', async () => {
  const [migration, marketplace, styles, html, worker] = await Promise.all([
    read('supabase/migrations/202609040002_host_applicant_truck_profiles.sql'),
    read('js/opportunity-marketplace.js'),
    read('css/opportunity-marketplace.css'),
    read('index.html'),
    read('service-worker.js')
  ]);
  assert.match(migration, /create or replace function public\.get_marketplace_truck_profile\(p_truck_id uuid\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /a\.truck_id = p_truck_id and h\.owner_id = requester/);
  assert.match(migration, /b\.truck_id = p_truck_id and h\.owner_id = requester/);
  assert.match(migration, /mi\.is_active = true/);
  assert.match(migration, /r\.reviewer_role = 'host'/);
  assert.match(migration, /and not r\.is_reported/);
  assert.match(migration, /revoke all on function public\.get_marketplace_truck_profile\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_marketplace_truck_profile\(uuid\) to authenticated/);
  assert.doesNotMatch(migration, /contact_email|contact_mobile|owner_id',|bank|stripe/i);
  assert.match(marketplace, /data-host-truck-profile/);
  assert.match(marketplace, /get_marketplace_truck_profile/);
  assert.match(marketplace, /Customer-facing food truck profile/);
  assert.match(marketplace, /Public customer menu/);
  assert.match(marketplace, /SOLD OUT/);
  assert.match(marketplace, /Recent Host reviews/);
  assert.match(marketplace, /Private owner, banking, and account information is never shown/);
  assert.match(styles, /marketplace-truck-profile-link/);
  assert.match(styles, /host-truck-menu-grid/);
  assert.match(styles, /@media\(max-width:480px\).*host-truck-facts/);
  assert.match(html, /opportunity-marketplace\.css\?v=host-dashboard-tabs-1/);
  assert.match(worker, /foodtreknow-shell-v32/);
});

test('Host dashboard summary cards open their live result sections', async () => {
  const [marketplace, styles] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('css/opportunity-marketplace.css')
  ]);
  assert.match(marketplace, /data-host-marketplace-tab="opportunities"[^>]+aria-label="View \$\{open\} open opportunities"/);
  assert.match(marketplace, /data-host-marketplace-tab="applications"[^>]+aria-label="View \$\{pending\} pending applications"/);
  assert.match(marketplace, /class="host-summary-card" data-host-marketplace-tab="bookings"/);
  assert.match(marketplace, /aria-label="View \$\{state\.host\.bookings\.filter[\s\S]+approved food trucks"/);
  assert.match(marketplace, /Approved Food Trucks/);
  assert.doesNotMatch(marketplace, /Approved Visits/);
  assert.match(marketplace, /function hostOpportunitiesMarkup\(\)/);
  assert.match(marketplace, /state\.host\.tab === 'opportunities'/);
  assert.match(styles, /host-summary-card:hover/);
});

test('Host opportunity edits retain their record id and confirm the saved update', async () => {
  const marketplace = await read('js/opportunity-marketplace.js');
  assert.match(marketplace, /editingOpportunityId: null/);
  assert.match(marketplace, /state\.host\.editingOpportunityId = item\.id/);
  assert.match(marketplace, /value="\$\{escapeHtml\(state\.host\.editingOpportunityId \|\| ''\)\}"/);
  assert.match(marketplace, /editing \? 'Update Opportunity' : 'Publish Opportunity'/);
  assert.match(marketplace, /submit\.textContent = 'Save Changes'/);
  assert.match(marketplace, /data\.get\('opportunityId'\) \|\| state\.host\.editingOpportunityId \|\| null/);
  assert.match(marketplace, /p_opportunity_id: opportunityId/);
  assert.match(marketplace, /const saved = relatedOne\(result\)/);
  assert.match(marketplace, /String\(saved\.id\) !== String\(opportunityId\)/);
  assert.match(marketplace, /state\.host\.tab = 'opportunities'/);
  assert.match(marketplace, /Changes saved\. Connected food trucks were notified\./);
});

test('saving a Host event edit notifies only vendors connected to that opportunity', async () => {
  const migration = await read('supabase/migrations/202609050005_opportunity_edit_notifications.sql');
  assert.match(migration, /create or replace function public\.notify_vendors_of_opportunity_update\(\)/);
  assert.match(migration, /changed_labels text\[\]/);
  assert.match(migration, /cardinality\(changed_labels\) = 0/);
  assert.match(migration, /insert into public\.opportunity_messages/);
  assert.match(migration, /insert into public\.marketplace_notifications/);
  assert.match(migration, /'Opportunity updated'/);
  assert.match(migration, /a\.status in \('pending', 'waitlisted', 'approved'\)/);
  assert.match(migration, /b\.application_id = a\.id and b\.status = 'confirmed'/);
  assert.match(migration, /after update of[\s\S]+on public\.opportunities/);
  assert.match(migration, /revoke all on function public\.notify_vendors_of_opportunity_update\(\) from public, anon, authenticated/);
});

test('Host event edits remain saved and notify all connected, non-withdrawn vendors', async () => {
  const migration = await read('supabase/migrations/202609050006_opportunity_edit_notification_reliability.sql');
  assert.match(migration, /a\.opportunity_id = new\.id and a\.status <> 'withdrawn'/);
  assert.match(migration, /insert into public\.opportunity_messages/);
  assert.match(migration, /insert into public\.marketplace_notifications/);
  assert.match(migration, /exception when others then/);
  assert.match(migration, /must never roll back the Host's saved event changes/);
  assert.match(migration, /clock_timestamp\(\)/);
});

test('Host truck names open the existing customer storefront with a return path', async () => {
  const [marketplace, customer, html] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('js/customer-account.js'),
    read('index.html')
  ]);
  assert.match(marketplace, /View customer storefront/);
  assert.match(marketplace, /FoodTrekNowCustomerPortal\?\.openTruckStorefrontFromHost/);
  assert.match(marketplace, /FoodTrekNowCustomerPortal\.openTruckStorefrontFromHost/);
  assert.match(customer, /async function openTruckStorefrontFromHost\(truckId\)/);
  assert.match(customer, /await refreshCustomerMarketplace\(true\)/);
  assert.match(customer, /renderCustomerPage\('truckMenu'\)/);
  assert.match(customer, /data-return-host-portal/);
  assert.match(customer, /Back to Host Portal/);
  assert.match(customer, /openHostPortal\(currentAccount\)/);
  const hostBookings = marketplace.slice(marketplace.indexOf('function hostBookingsMarkup'), marketplace.indexOf('function hostPaymentsMarkup'));
  assert.doesNotMatch(hostBookings, /data-booking-contact/);
  assert.match(hostBookings, /data-marketplace-message/);
  assert.match(html, /js\/customer-account\.js\?v=customer-storefront-1/);
});

test('Hosts can securely cancel an unresponsive approved food truck', async () => {
  const [migration, threadMigration, marketplace] = await Promise.all([
    read('supabase/migrations/202609050001_host_booking_cancellations.sql'),
    read('supabase/migrations/202609050002_host_cancellation_thread_messages.sql'),
    read('js/opportunity-marketplace.js')
  ]);
  assert.match(migration, /create or replace function public\.cancel_host_opportunity_booking/);
  assert.match(migration, /h\.owner_id = auth\.uid\(\)/);
  assert.match(migration, /status = 'cancelled_by_host'/);
  assert.match(migration, /delete from public\.vendor_route_stops/);
  assert.match(migration, /status = 'published'/);
  assert.match(migration, /Host cancelled your event booking/);
  assert.match(migration, /Refund the event payment before cancelling/);
  assert.match(migration, /revoke all on function public\.cancel_host_opportunity_booking\(uuid, text\) from public, anon/);
  assert.match(migration, /grant execute on function public\.cancel_host_opportunity_booking\(uuid, text\) to authenticated/);
  assert.match(threadMigration, /create or replace function public\.cancel_host_opportunity_booking/);
  assert.match(threadMigration, /insert into public\.opportunity_messages/);
  assert.match(threadMigration, /The Host cancelled this approved booking\. Reason:/);
  assert.match(threadMigration, /where b\.status = 'cancelled_by_host'/);
  assert.match(threadMigration, /not exists \(/);
  assert.match(threadMigration, /sender_role = 'host'/);
  assert.match(marketplace, /data-cancel-host-booking/);
  assert.match(marketplace, /id="cancelHostBookingForm"/);
  assert.match(marketplace, /Reason for cancellation/);
  assert.match(marketplace, /stripe-event-fee-refund/);
  assert.match(marketplace, /cancel_host_opportunity_booking/);
  assert.match(marketplace, /Food truck booking cancelled and vendor notified/);
});

test('vendor opportunity tabs track and clear unread messages independently by section', async () => {
  const [migration, sectionMigration, marketplace, styles] = await Promise.all([
    read('supabase/migrations/202609050003_vendor_opportunity_unread_messages.sql'),
    read('supabase/migrations/202609050004_independent_vendor_message_views.sql'),
    read('js/opportunity-marketplace.js'),
    read('css/opportunity-marketplace.css')
  ]);
  assert.match(migration, /create or replace function public\.mark_opportunity_messages_read\(p_application_id uuid\)/);
  assert.match(migration, /public\.owns_marketplace_vendor\(selected\.vendor_profile_id\)/);
  assert.match(migration, /public\.host_owns_opportunity\(selected\.opportunity_id\)/);
  assert.match(migration, /sender_role <> reader_role and read_at is null/);
  assert.match(migration, /revoke all on function public\.mark_opportunity_messages_read\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.mark_opportunity_messages_read\(uuid\) to authenticated/);
  for (const field of ['vendor_applications_read_at', 'vendor_messages_read_at', 'vendor_bookings_read_at']) {
    assert.match(sectionMigration, new RegExp(`add column if not exists ${field}`));
    assert.match(marketplace, new RegExp(field));
  }
  assert.match(sectionMigration, /create or replace function public\.mark_vendor_opportunity_section_read/);
  assert.match(sectionMigration, /p_section not in \('applications', 'messages', 'bookings'\)/);
  assert.match(sectionMigration, /Only the food truck can update its unread messages/);
  assert.match(sectionMigration, /grant execute on function public\.mark_vendor_opportunity_section_read\(uuid, text\) to authenticated/);
  assert.match(marketplace, /new Set\(\['applications', 'messages', 'bookings'\]\)/);
  assert.match(marketplace, /class="marketplace-unread-badge"/);
  assert.match(marketplace, /marketplace-record-unread/);
  assert.match(marketplace, /marketplace-record-title/);
  assert.match(marketplace, /aria-label="\$\{unread\} unread message/);
  assert.match(marketplace, /data-message-section="applications"/);
  assert.match(marketplace, /data-message-section="messages"/);
  assert.match(marketplace, /data-message-section="bookings"/);
  assert.match(marketplace, /mark_vendor_opportunity_section_read/);
  assert.match(marketplace, /p_section: section/);
  assert.match(styles, /\.marketplace-unread-badge/);
  assert.match(styles, /article\.marketplace-record-unread/);
});

test('confirmed Hosts and food trucks can securely exchange current contact details', async () => {
  const [migration, marketplace] = await Promise.all([
    read('supabase/migrations/202608300001_marketplace_contact_exchange.sql'),
    read('js/opportunity-marketplace.js')
  ]);
  assert.match(migration, /create or replace function public\.get_marketplace_booking_contacts/);
  assert.match(migration, /b\.status = 'confirmed'/);
  assert.match(migration, /h\.owner_id = auth\.uid\(\)/);
  assert.match(migration, /v\.owner_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on function public\.get_marketplace_booking_contacts\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_marketplace_booking_contacts\(uuid\) to authenticated/);
  assert.match(marketplace, /Host Contact Information/);
  assert.match(marketplace, /Save Contact Information/);
  assert.match(marketplace, /data-booking-contact/);
  assert.match(marketplace, /get_marketplace_booking_contacts/);
  assert.match(marketplace, /These details are private to the Host and food truck assigned to this confirmed booking/);
});

test('profitability scoring explains estimates without guaranteeing revenue', async () => {
  const source = await read('js/opportunity-marketplace.js');
  const window = { FoodTrekNowSupabaseClient: null };
  const context = vm.createContext({ window, document: { addEventListener() {} }, navigator: {}, console, Intl, Date, Math, setTimeout, clearTimeout });
  new vm.Script(source).runInContext(context);
  const service = window.FoodTrekNowOpportunityMarketplace;
  const result = service.profitability({
    expected_customers: 1000,
    trucks_requested: 4,
    flat_vendor_fee: 0,
    sales_percentage: 0,
    minimum_sales_guarantee: 500,
    electricity_available: true,
    water_available: true,
    starts_at: '2026-09-01T15:00:00Z',
    ends_at: '2026-09-01T19:00:00Z',
    host: { average_rating: 4.8 },
    trucks_booked: 1
  }, 8);
  assert.ok(result.score >= 75 && result.score <= 100);
  assert.ok(result.projectedSales > 0);
  assert.ok(result.estimatedProfit < result.projectedSales);
  assert.ok(result.positive.some(reason => /No vendor fee/i.test(reason)));
  assert.match(source, /does not guarantee sales or income/i);
  assert.doesNotMatch(source, /api[_-]?key\s*[:=]\s*['"][^'"]+/i);
});
