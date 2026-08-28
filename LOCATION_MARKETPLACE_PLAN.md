# FoodTrekNow Location & Event Opportunity Marketplace

## Existing architecture reused

- **Application:** responsive HTML/CSS/JavaScript application packaged for web, Android, and iOS with Capacitor.
- **Authentication:** Supabase Auth with one `profiles` identity per person. No duplicate host or organizer login system is introduced.
- **Vendor ownership:** approved vendors continue to use `vendor_profiles`, `trucks`, and the existing vendor authentication boundary.
- **Customer/host access:** a signed-in profile can create one host profile from the existing customer account shell.
- **Database:** PostgreSQL/Supabase migrations, foreign keys, Row Level Security, protected `security definer` RPCs, and Realtime.
- **Messaging and notifications:** the existing order-specific communication architecture remains unchanged; marketplace communication uses parallel opportunity-specific tables and the same participant-only security pattern.
- **Location:** the existing foreground browser/native GPS permission workflow is reused. Vendor live location is never copied into a personal profile.
- **UI:** existing navigation, cards, buttons, modals, responsive breakpoints, typography, colors, and mobile shells are reused.

## Phase 1 database migration

`202608280001_location_marketplace_phase1.sql` adds:

- `location_hosts`
- `host_locations`
- `opportunities`
- `opportunity_recurrence_rules`
- `opportunity_applications`
- `opportunity_bookings`
- `opportunity_favorites`
- `vendor_routes`
- `vendor_route_stops`
- `opportunity_messages`
- `marketplace_notifications`
- `opportunity_reviews`

Every table references the existing `profiles`, `vendor_profiles`, or `trucks` tables where appropriate. No new user table is created.

## Phase 1 screens

### Vendor

- Find Locations
- Open Spots Today
- Map/List View
- Filters and sorting
- Opportunity detail and transparent fee estimate
- Applications
- Confirmed bookings and navigation
- Weekly recurring route
- Marketplace alerts
- Opportunity conversations
- Post-opportunity reviews

### Host

- Host account setup
- Host dashboard
- Host locations
- One-time/recurring opportunity posting
- Application review (approve, decline, waitlist)
- Confirmed visits
- Vendor conversations
- Reviews

## New UI components

- Opportunity cards and badges
- Responsive marketplace filters
- Coordinate-based opportunity map and pins
- Profitability score explanation
- Fee and cost estimate table
- Application/booking status records
- Weekly route summary and schedule
- Host profile/location/opportunity forms
- Marketplace message thread
- Review form
- Marketplace notification feed

## Protected APIs / database functions

- `upsert_location_host`
- `save_host_location`
- `publish_opportunity`
- `list_marketplace_opportunities`
- `apply_to_opportunity`
- `decide_opportunity_application`
- `toggle_opportunity_favorite`
- `add_booking_to_weekly_route`
- `send_opportunity_message`
- `submit_opportunity_review`
- `mark_marketplace_notifications_read`

Backend functions validate ownership, dates, capacity, fees, booking mode, message length, and review eligibility. The browser does not receive direct write permission to marketplace tables.

## Map and location services

Phase 1 uses:

- Device/browser foreground geolocation for vendor distance calculations.
- Host-supplied latitude/longitude stored in Supabase.
- A lightweight coordinate map that does not require or expose an API key.
- Google Maps universal navigation URLs for turn-by-turn directions.

Phase 3 satellite maps, geocoding, address autocomplete, site outlines, and event layout editing will require a selected production map provider. Credentials must be provided through deployment environment variables and never committed. A final provider should be selected based on expected monthly map loads, geocoding volume, satellite imagery requirements, and mobile SDK support.

## Security and RLS

- Host contact/profile rows are owner/admin readable.
- Published opportunity details are readable only by authenticated users.
- Applications and bookings are readable only by the participating vendor, owning host, or administrator.
- Messages are readable only by the application participants.
- Notifications are readable only by their recipient.
- Reviews require a real booking and an ended opportunity.
- State changes are performed through protected RPCs; tables grant authenticated users read access only.
- Nearby alerts use an active, non-stale vendor truck location and do not expose that GPS record to hosts.
- Individual vendor sales and compliance documents are not part of Phase 1 and are not exposed.

## Dependencies

Phase 1 adds no third-party JavaScript dependency. It uses the existing Supabase client, browser/native geolocation, Capacitor build, and design system.

## Environment variables / keys

No new key is required for Phase 1.

Future satellite/geocoding work will require environment variables similar to:

- `MAP_PROVIDER_PUBLIC_TOKEN` for public tile rendering, restricted by domain and application ID.
- `MAP_PROVIDER_SECRET_TOKEN` only for server-side geocoding or protected uploads, stored in Supabase/Vercel secrets.

Exact names will be finalized when the map provider is selected. No secret will be placed in browser source.

## Phased implementation

1. **Location Marketplace:** host accounts/locations, postings, discovery, map/list, today openings, filters, applications, approvals, bookings, recurring routes, notifications, messaging, and reviews.
2. **Events:** event-specific organizer workflow, attendance capacity guidance, cuisine mix, fees, waitlist, and event messaging.
3. **Event Maps:** satellite/site-plan input, layout editor, numbered truck spaces, assignments, navigation, and placement scoring.
4. **Profitability:** vendor-reported private results, expense inputs, anonymized performance history, and space performance.
5. **Intelligent Recommendations:** placement optimization, truck-count guidance, cuisine demand, weekly route optimization, and predictive recommendations.

## Phase 1 deployment sequence

1. Apply the Phase 1 SQL migration in Supabase.
2. Verify the migration reports success.
3. Deploy the web/mobile source.
4. Create a signed-in host profile and location.
5. Publish a test opportunity clearly identified as a test.
6. Request/book it from an approved vendor account.
7. Verify approval, booking, messaging, route, notification, and review permissions using separate browsers.
