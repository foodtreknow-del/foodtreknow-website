# FoodTrekNow Vendor Platform v0.4.0

## Connected Vendor and Customer Order Workflow

- Connected vendor order actions to the matching customer order tracker through the existing local persistence model
- Accepting an order now advances the customer status to Preparing
- Marking an order ready now advances the customer status to Ready for Pickup
- Confirming pickup now marks the customer order Picked Up and moves it into Past Orders
- Activated Order Again/Reorder for past meals, including newer numeric order IDs
- Added same-tab and cross-tab customer refresh handling plus full lifecycle regression coverage
- Hardened vendor actions and pickup confirmation for numeric and prefixed order IDs

## Vendor Sales Reports

- Replaced the Reports placeholder with date-filtered sales analytics
- Added net sales, gross sales, refunds, order count, average order value, and items sold KPIs
- Added revenue trends, order status, top-selling items, payment method, and transaction detail views
- Added printable reporting and CSV export without changing persisted order data
- Added responsive layouts and automated calculation, range, refund, and export tests

## Vendor Settings

- Replaced the Settings placeholder with persisted truck profile and contact details
- Added optional truck logo/photo, address, cuisine, and customer-facing description fields
- Added order availability, prep time, minimum order, tax, and pickup instruction controls
- Added seven-day business hours with per-day open and closed states
- Added accepted payment method and vendor notification preferences
- Synchronized saved vendor availability, identity, and order sound with existing portal controls
- Prepared a replaceable local settings boundary for future Supabase vendor profiles
- Added responsive layouts, validation, persistence tests, and rendered desktop/mobile verification

## Phase 3.1 - Customer Home Experience Polish

- Added a time-aware customer greeting and locally persisted preferred location selection
- Added unified customer search across trucks, menu items, cuisines, and events
- Added polished primary action cards, active-order and hungry states, event cards, favorite truck cards, recent orders, saved addresses, saved payment methods, and notification summaries
- Added a fixed mobile navigation bar for Home, Explore, Events, Cart, and Profile
- Preserved the vendor portal, customer account system, customer menu, cart and checkout pathways, order tracking, and browser-local persistence
- Prepared customer preference data for a future Supabase adapter without adding backend services

Added:
- Category add, rename, delete, and drag-to-reorder
- Menu item add, edit, delete, photo upload, and drag-to-reorder
- Available and Sold Out states only
- Featured item control
- Customer menu preview
- Sold Out items remain visible with disabled ordering
- Menu statistics for total, available, sold out, and categories
- Local browser persistence

## Phase 3 - Customer Account System

Added:
- Customer home screen with sign in, account creation, and guest checkout
- Local customer authentication with email or mobile sign in, remembered sessions, password changes, and sign out
- Supabase-ready authentication service boundary with a replaceable local adapter
- Customer profile editing, preferred name, and optional profile photo
- Home, work, and other saved address management
- Favorite food trucks and favorite order management
- Current and past order history, live status views, order details, receipts, and one-tap reordering
- UI-only saved payment method management with default selection
- Order, promotion, favorite truck, and push notification preferences
- Privacy preferences and confirmed permanent account deletion
- Responsive customer account layouts for desktop, tablet, and mobile
- Automated customer account persistence and authentication tests

Not included:
- Supabase connectivity
- Loyalty points or rewards
