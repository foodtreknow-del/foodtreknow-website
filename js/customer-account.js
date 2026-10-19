Warning: truncated output (original token count: 72402)
Total output lines: 4127

(() => {
  'use strict';

  const ACCOUNT_STORAGE_KEY = 'ftnCustomerAccountsV1';
  const PERSISTENT_SESSION_KEY = 'ftnCustomerSessionV1';
  const TEMP_SESSION_KEY = 'ftnCustomerSessionTempV1';
  const GUEST_STORAGE_KEY = 'ftnGuestCustomerV1';
  const GUEST_SESSION_KEY = 'ftnGuestSessionActiveV1';
  const MENU_STORAGE_KEY = 'ftnVendorMenuV0400';
  const ORDER_NUMBER_STORAGE_KEY = 'ftnLastOrderNumberV1';
  const TRUCK = {
    id: 'capital-city-eats',
    name: 'Capital City Eats',
    cuisine: 'American favorites · Burgers · Tacos',
    status: 'Open now',
    wait: '15–20 min',
    icon: '🚚',
    latitude: 35.7812,
    longitude: -78.6388,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    opensAt: '10:30 AM',
    closesAt: '8:00 PM',
    pickupMinutes: 15,
    currentEvent: 'Downtown Lunch Stop'
  };

  const TRUCKS = [
    TRUCK,
    { id: 'rolling-ember-bbq', name: 'Rolling Ember BBQ', cuisine: 'Smoked BBQ · Southern', status: 'Open now', wait: '20–25 min', icon: '🔥', latitude: 35.806, longitude: -78.655, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '9:00 PM', pickupMinutes: 20, currentEvent: '' },
    { id: 'taco-luna', name: 'Taco Luna', cuisine: 'Mexican · Street tacos', status: 'Open now', wait: '12–18 min', icon: '🌮', latitude: 35.842, longitude: -78.672, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '12:00 PM', closesAt: '10:00 PM', pickupMinutes: 12, currentEvent: 'Oakwood Night Market' },
    { id: 'triangle-dumpling-co', name: 'Triangle Dumpling Co.', cuisine: 'Asian fusion · Dumplings', status: 'Open now', wait: '18–24 min', icon: '🥟', latitude: 35.92, longitude: -78.78, operatingDays: [1, 2, 3, 4, 5, 6], opensAt: '11:30 AM', closesAt: '8:30 PM', pickupMinutes: 18, currentEvent: '' },
    { id: 'oak-city-sweets', name: 'Oak City Sweets', cuisine: 'Desserts · Coffee', status: 'Open now', wait: '8–12 min', icon: '🧁', latitude: 35.7, longitude: -78.62, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '8:00 AM', closesAt: '6:00 PM', pickupMinutes: 8, currentEvent: 'Moore Square Makers Market' },
    { id: 'carolina-coastal-kitchen', name: 'Carolina Coastal Kitchen', cuisine: 'Seafood · Coastal', status: 'Open now', wait: '22–30 min', icon: '🦐', latitude: 36.05, longitude: -78.85, operatingDays: [0, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '8:00 PM', pickupMinutes: 22, currentEvent: '' },
    { id: 'mama-jos-soul-kitchen', name: "Mama Jo's Soul Kitchen", cuisine: 'Soul Food · Southern classics', status: 'Open now', wait: '18–24 min', icon: '🍗', latitude: 35.755, longitude: -78.71, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '8:00 PM', pickupMinutes: 18, currentEvent: 'Southside Sunday Social' },
    { id: 'kingston-jerk-stop', name: 'Kingston Jerk Stop', cuisine: 'Jamaican · Caribbean', status: 'Open now', wait: '16–22 min', icon: '🇯🇲', latitude: 35.735, longitude: -78.76, operatingDays: [0, 2, 3, 4, 5, 6], opensAt: '11:30 AM', closesAt: '9:00 PM', pickupMinutes: 16, currentEvent: '' },
    { id: 'athena-street-eats', name: 'Athena Street Eats', cuisine: 'Greek · Mediterranean', status: 'Open now', wait: '14–20 min', icon: '🫓', latitude: 35.865, longitude: -78.73, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '10:30 AM', closesAt: '8:30 PM', pickupMinutes: 14, currentEvent: '' },
    { id: 'seoul-on-wheels', name: 'Seoul on Wheels', cuisine: 'Korean · Asian fusion', status: 'Open now', wait: '17–23 min', icon: '🍜', latitude: 35.69, longitude: -78.69, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '9:00 PM', pickupMinutes: 17, currentEvent: 'Warehouse District Pop-Up' },
    { id: 'cupcake-caravan', name: 'Cupcake Caravan', cuisine: 'Cupcakes · Baked treats', status: 'Open now', wait: '7–10 min', icon: '🧁', latitude: 35.88, longitude: -78.58, operatingDays: [0, 2, 3, 4, 5, 6], opensAt: '9:00 AM', closesAt: '7:00 PM', pickupMinutes: 7, currentEvent: '' },
    { id: 'scoop-loop', name: 'Scoop Loop', cuisine: 'Ice Cream · Frozen treats', status: 'Open now', wait: '6–10 min', icon: '🍦', latitude: 35.66, longitude: -78.57, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '12:00 PM', closesAt: '10:00 PM', pickupMinutes: 6, currentEvent: 'Family Fun Day' },
    { id: 'bull-city-burgers', name: 'Bull City Burgers', cuisine: 'Burgers · Hand-cut fries', status: 'Open now', wait: '15–21 min', icon: '🍔', latitude: 35.99, longitude: -78.9, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '10:00 PM', pickupMinutes: 15, currentEvent: '' },
    { id: 'smokehouse-919', name: 'Smokehouse 919', cuisine: 'BBQ · Smokehouse', status: 'Open now', wait: '24–32 min', icon: '🥩', latitude: 36.1, longitude: -78.72, operatingDays: [0, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '8:00 PM', pickupMinutes: 24, currentEvent: '' },
    { id: 'green-route-vegan', name: 'Green Route Vegan', cuisine: 'Vegan · Plant based', status: 'Open now', wait: '13–18 min', icon: '🌱', latitude: 35.62, longitude: -78.8, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '10:00 AM', closesAt: '8:00 PM', pickupMinutes: 13, currentEvent: 'Wellness Market' },
    { id: 'pie-and-pudding', name: 'Pie & Pudding', cuisine: 'Desserts · Pies and puddings', status: 'Open now', wait: '8–12 min', icon: '🥧', latitude: 35.94, longitude: -78.47, operatingDays: [0, 1, 3, 4, 5, 6], opensAt: '10:00 AM', closesAt: '7:00 PM', pickupMinutes: 8, currentEvent: '' },
    { id: 'bayou-bites', name: 'Bayou Bites', cuisine: 'Cajun · Creole seafood', status: 'Open now', wait: '19–26 min', icon: '🦞', latitude: 35.57, longitude: -78.64, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:30 AM', closesAt: '9:00 PM', pickupMinutes: 19, currentEvent: '' },
    { id: 'pasta-passeggiata', name: 'Pasta Passeggiata', cuisine: 'Italian · Fresh pasta', status: 'Open now', wait: '18–25 min', icon: '🍝', latitude: 36.13, longitude: -78.96, operatingDays: [0, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '9:00 PM', pickupMinutes: 18, currentEvent: '' },
    { id: 'curry-in-a-hurry', name: 'Curry in a Hurry', cuisine: 'Indian · Street food', status: 'Open now', wait: '15–22 min', icon: '🍛', latitude: 35.49, longitude: -78.91, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '11:00 AM', closesAt: '9:00 PM', pickupMinutes: 15, currentEvent: 'Global Food Festival' },
    { id: 'breakfast-bus', name: 'The Breakfast Bus', cuisine: 'Breakfast · Brunch', status: 'Open now', wait: '10–16 min', icon: '🍳', latitude: 36.18, longitude: -78.55, operatingDays: [0, 1, 2, 3, 4, 5, 6], opensAt: '7:00 AM', closesAt: '2:00 PM', pickupMinutes: 10, currentEvent: '' }
  ];
  let remoteTruckIds = new Set();
  let remoteEventIds = new Set();
  let marketplaceLoadPromise = null;
  let customerEventLoadPromise = null;
  const NEARBY_RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const EVENTS = [
    { id: 'first-friday', truckId: 'capital-city-eats', date: 'AUG 01', name: 'First Friday Food Truck Rodeo', location: 'City Market Plaza', time: '5:00–9:00 PM', detail: '12 trucks · Live music' },
    { id: 'riverfront-bites', truckId: 'rolling-ember-bbq', date: 'AUG 09', name: 'Riverfront Bites & Beats', location: 'Riverfront Park', time: '3:00–8:00 PM', detail: '8 trucks · Family friendly' },
    { id: 'night-market', truckId: 'taco-luna', date: 'AUG 16', name: 'Downtown Night Market', location: 'Fayetteville Street', time: '6:00–10:00 PM', detail: '16 trucks · Local makers' }
  ];

  const defaultMenu = [
    { id: 1, name: 'Classic Cheeseburger', category: 'Burgers', price: 11.5, description: 'Seasoned beef patty, American cheese, lettuce, tomato, pickles, and house sauce.', available: true, image: '' },
    { id: 2, name: 'Loaded Nachos', category: 'Entrées', price: 12, description: 'Crispy tortilla chips with cheese, seasoned meat, pico de gallo, and crema.', available: true, image: '' },
    { id: 3, name: 'Chicken Tacos', category: 'Tacos', price: 5.25, description: 'Grilled chicken, cabbage slaw, pico de gallo, and lime crema.', available: true, image: '' },
    { id: 4, name: 'Seasoned Fries', category: 'Sides', price: 4.5, description: 'Crispy fries tossed in the truck’s signature seasoning.', available: true, image: '' },
    { id: 5, name: 'Sweet Potato Fries', category: 'Sides', price: 5.5, description: 'Crispy sweet potato fries with dipping sauce.', available: false, image: '' },
    { id: 6, name: 'Fresh Lemonade', category: 'Drinks', price: 4, description: 'Fresh-squeezed lemonade served cold.', available: true, image: '' }
  ];

  const ORDERING_MENU_ITEMS = [
    { id: 'loaded-street-nachos', category: 'Appetizers', name: 'Loaded Street Nachos', description: 'House chips, queso, pico, crema, jalapeños, and seasoned beef.', price: 10.5, calories: 740, available: true, icon: '🧀', featured: true, special: false, popular: true },
    { id: 'crispy-cauliflower-bites', category: 'Appetizers', name: 'Crispy Cauliflower Bites', description: 'Golden cauliflower with smoky ranch and scallions.', price: 8.5, calories: 420, available: true, icon: '🥦', featured: false, special: true, popular: false },
    { id: 'capital-smash-burger', category: 'Entrees', name: 'Capital Smash Burger', description: 'Two crispy beef patties, American cheese, pickles, onions, and Trek sauce.', price: 13.5, calories: 890, available: true, icon: '🍔', featured: true, special: false, popular: true },
    { id: 'firecracker-chicken-tacos', category: 'Entrees', name: 'Firecracker Chicken Tacos', description: 'Three griddled tacos with spicy chicken, slaw, pico, and lime crema.', price: 12.75, calories: 680, available: true, icon: '🌮', featured: true, special: true, popular: true },
    { id: 'smokehouse-bbq-bowl', category: 'Entrees', name: 'Smokehouse BBQ Bowl', description: 'Slow-smoked pork, seasoned rice, street corn, slaw, and barbecue drizzle.', price: 14.25, calories: 820, available: true, icon: '🍲', featured: false, special: false, popular: true },
    { id: 'garden-crunch-wrap', category: 'Entrees', name: 'Garden Crunch Wrap', description: 'Black beans, roasted vegetables, queso, lettuce, and salsa verde.', price: 11.5, calories: 620, available: false, icon: '🌯', featured: false, special: false, popular: false },
    { id: 'nashville-hot-chicken-sandwich', category: 'Entrees', name: 'Nashville Hot Chicken Sandwich', description: 'Crispy hot chicken, pickles, slaw, and comeback sauce on brioche.', price: 13.75, calories: 840, available: true, icon: '🍗', featured: false, special: true, popular: true },
    { id: 'roasted-veggie-grain-bowl', category: 'Entrees', name: 'Roasted Veggie Grain Bowl', description: 'Seasoned grains, roasted vegetables, chickpeas, greens, and herb dressing.', price: 12.5, calories: 590, available: true, icon: '🥗', featured: false, special: false, popular: false },
    { id: 'trek-seasoned-fries', category: 'Sides', name: 'Trek Seasoned Fries', description: 'Crispy skin-on fries tossed with our signature road-trip seasoning.', price: 4.5, calories: 390, available: true, icon: '🍟', featured: false, special: false, popular: true },
    { id: 'street-corn-cup', category: 'Sides', name: 'Street Corn Cup', description: 'Charred corn, cotija, lime crema, chile, and cilantro.', price: 5.25, calories: 310, available: true, icon: '🌽', featured: false, special: true, popular: false },
    { id: 'churro-bites', category: 'Desserts', name: 'Cinnamon Churro Bites', description: 'Warm cinnamon-sugar churros with chocolate dipping sauce.', price: 6.5, calories: 510, available: true, icon: '🍩', featured: true, special: false, popular: true },
    { id: 'banana-pudding-jar', category: 'Desserts', name: 'Banana Pudding Jar', description: 'Vanilla pudding, fresh banana, wafers, and whipped cream.', price: 6, calories: 460, available: true, icon: '🍌', featured: false, special: true, popular: false },
    { id: 'fresh-lemonade', category: 'Drinks', name: 'Fresh-Squeezed Lemonade', description: 'Bright, cold lemonade made fresh throughout the day. One standard size.', price: 4, calories: 180, available: true, icon: '🍋', featured: false, special: false, popular: true },
    { id: 'sweet-tea', category: 'Drinks', name: 'Southern Sweet Tea', description: 'Fresh-brewed black tea served over ice with lemon.', price: 3.5, calories: 150, available: true, icon: '🥤', featured: false, special: false, popular: false },
    { id: 'road-trip-pretzel-bites', category: 'Snacks', name: 'Road Trip Pretzel Bites', description: 'Warm salted pretzel bites with beer cheese dip.', price: 6.5, calories: 430, available: true, icon: '🥨', featured: false, special: false, popular: true },
    { id: 'orange-cream-soda', category: 'Drinks', name: 'Orange Cream Soda', description: 'Sparkling orange soda finished with vanilla cream.', price: 4.5, calories: 210, available: true, icon: '🍊', featured: false, special: false, popular: false },
    { id: 'bottled-spring-water', category: 'Drinks', name: 'Bottled Spring Water', description: 'Cold bottled spring water.', price: 2.5, calories: null, available: true, icon: '💧', featured: false, special: false, popular: false }
  ];
  const VENDOR_MENU_ITEM_MAP = new Map([
    [1, 'capital-smash-burger'],
    [2, 'loaded-street-nachos'],
    [3, 'firecracker-chicken-tacos'],
    [4, 'trek-seasoned-fries'],
    [6, 'fresh-lemonade']
  ]);
  const STANDARD_DRINK_OPTIONS = [
    { name: 'Coca-Cola', description: 'Classic Coca-Cola served ice cold.', price: 3.5, icon: '🥤' },
    { name: 'Diet Coke', description: 'Zero-sugar Diet Coke served ice cold.', price: 3.5, icon: '🥤' },
    { name: 'Sprite', description: 'Crisp lemon-lime soda served ice cold.', price: 3.5, icon: '🥤' },
    { name: 'Bottled Water', description: 'Cold purified bottled water.', price: 2.5, icon: '💧' },
    { name: 'Unsweetened Iced Tea', description: 'Fresh-brewed black tea served over ice with lemon.', price: 3.5, icon: '🧋' }
  ];
  function buildTruckMenu(truckId, items) {
    return items.map(([category, name, description, price, icon, available = true], index) => ({
      id: `${truckId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
      truckId,
      category,
      name,
      description,
      price,
      calories: null,
      available,
      icon,
      featured: index < 2,
      special: index === 1,
      popular: index < 3
    }));
  }

  const TRUCK_MENUS = {
    'rolling-ember-bbq': buildTruckMenu('rolling-ember-bbq', [
      ['Starters', 'Smoked Wings', 'Hickory-smoked wings glazed with tangy Carolina sauce.', 10, '🍗'],
      ['Plates', 'Pulled Pork Plate', 'Twelve-hour pulled pork with two country sides and cornbread.', 16, '🐖'],
      ['Plates', 'Brisket Burnt Ends', 'Caramelized brisket ends with smoky molasses barbecue sauce.', 18, '🥩'],
      ['Sides', 'Smokehouse Mac', 'Creamy three-cheese macaroni with toasted crumbs.', 5, '🧀'],
      ['Drinks', 'Peach Sweet Tea', 'Fresh-brewed sweet tea with ripe peach.', 4, '🍑']
    ]),
    'taco-luna': buildTruckMenu('taco-luna', [
      ['Antojitos', 'Elote Cup', 'Fire-roasted corn, cotija, chile, lime, and crema.', 6, '🌽'],
      ['Tacos', 'Birria Tacos', 'Three crispy beef birria tacos with consommé.', 14, '🌮'],
      ['Tacos', 'Baja Fish Tacos', 'Crispy fish, cabbage, pico, and chipotle crema.', 13, '🐟'],
      ['Bowls', 'Carnitas Rice Bowl', 'Citrus pork, cilantro rice, black beans, and salsa verde.', 13.5, '🍚'],
      ['Drinks', 'Watermelon Agua Fresca', 'Fresh watermelon, lime, and cane sugar.', 4, '🍉']
    ]),
    'triangle-dumpling-co': buildTruckMenu('triangle-dumpling-co', [
      ['Small Plates', 'Scallion Pancakes', 'Crisp layered pancakes with soy ginger dip.', 7, '🥞'],
      ['Dumplings', 'Pork Soup Dumplings', 'Six delicate dumplings filled with pork and savory broth.', 13, '🥟'],
      ['Dumplings', 'Vegetable Potstickers', 'Pan-seared cabbage, mushroom, and chive dumplings.', 11, '🥬'],
      ['Noodles', 'Chili Garlic Noodles', 'Springy noodles with sesame, scallions, and chili crisp.', 12, '🍜'],
      ['Drinks', 'Lychee Green Tea', 'Iced jasmine green tea with lychee.', 4.5, '🧋']
    ]),
    'oak-city-sweets': buildTruckMenu('oak-city-sweets', [
      ['Cookies', 'Salted Chocolate Chunk Cookie', 'Warm brown-butter cookie with dark chocolate and sea salt.', 4, '🍪'],
      ['Desserts', 'Banana Pudding Cup', 'Vanilla custard, bananas, wafers, and whipped cream.', 7, '🍌'],
      ['Desserts', 'Red Velvet Brownie', 'Fudgy cocoa brownie with cream cheese swirl.', 5.5, '🍫'],
      ['Cheesecakes', 'Strawberry Cheesecake Jar', 'Creamy cheesecake layered with strawberry compote.', 8, '🍓'],
      ['Coffee', 'Brown Sugar Cold Brew', 'Cold brew with brown sugar cream and cinnamon.', 5, '☕']
    ]),
    'carolina-coastal-kitchen': buildTruckMenu('carolina-coastal-kitchen', [
      ['Starters', 'Crab Hushpuppies', 'Golden hushpuppies with blue crab and remoulade.', 9, '🦀'],
      ['Seafood Baskets', 'Calabash Shrimp Basket', 'Lightly breaded shrimp, fries, slaw, and cocktail sauce.', 17, '🍤'],
      ['Sandwiches', 'Blackened Mahi Sandwich', 'Spiced mahi, lettuce, tomato, and lemon aioli.', 16, '🐟'],
      ['Seafood Rolls', 'Warm Lobster Roll', 'Butter-poached lobster in a toasted split-top roll.', 22, '🦞'],
      ['Sides', 'Coastal Slaw', 'Cabbage, carrots, herbs, and citrus dressing.', 4, '🥗']
    ]),
    'mama-jos-soul-kitchen': buildTruckMenu('mama-jos-soul-kitchen', [
      ['Starters', 'Fried Green Tomatoes', 'Cornmeal-crusted tomatoes with comeback sauce.', 8, '🍅'],
      ['Soul Plates', 'Buttermilk Fried Chicken', 'Crispy seasoned chicken, two sides, and a biscuit.', 16, '🍗'],
      ['Soul Plates', 'Smothered Turkey Wings', 'Slow-braised turkey wings with onion gravy and rice.', 17, '🦃'],
      ['Sides', 'Candied Yams', 'Sweet potatoes baked with brown sugar and warm spices.', 5, '🍠'],
      ['Desserts', 'Peach Cobbler', 'Warm spiced peaches under a buttery golden crust.', 7, '🍑']
    ]),
    'kingston-jerk-stop': buildTruckMenu('kingston-jerk-stop', [
      ['Small Bites', 'Jamaican Beef Patty', 'Flaky golden pastry filled with curried island beef.', 5, '🥟'],
      ['Plates', 'Jerk Chicken Plate', 'Pimento-smoked jerk chicken with rice and peas.', 16, '🍗'],
      ['Plates', 'Oxtail Stew', 'Slow-braised oxtail with butter beans and rich gravy.', 21, '🍲'],
      ['Sides', 'Festival Bread', 'Sweet fried Jamaican dumplings.', 5, '🥖'],
      ['Drinks', 'Pineapple Ginger Punch', 'Cold pineapple punch with fresh ginger and lime.', 5, '🍍']
    ]),
    'athena-street-eats': buildTruckMenu('athena-street-eats', [
      ['Meze', 'Spanakopita Bites', 'Flaky phyllo filled with spinach, feta, and herbs.', 8, '🥬'],
      ['Pitas', 'Chicken Souvlaki Pita', 'Grilled lemon-herb chicken, tomato, onion, and tzatziki.', 12, '🫓'],
      ['Platters', 'Lamb Gyro Platter', 'Seasoned lamb, lemon potatoes, village salad, and pita.', 17, '🥙'],
      ['Sides', 'Loaded Feta Fries', 'Crispy fries with feta, oregano, and garlic sauce.', 7, '🍟'],
      ['Desserts', 'Honey Baklava', 'Walnut phyllo pastry with orange blossom honey.', 6, '🍯']
    ]),
    'seoul-on-wheels': buildTruckMenu('seoul-on-wheels', [
      ['Snacks', 'Kimchi Mandu', 'Crispy dumplings filled with kimchi and vegetables.', 8, '🥟'],
      ['Rice Bowls', 'Korean BBQ Beef Bowl', 'Bulgogi beef, steamed rice, pickled vegetables, and egg.', 15, '🍚'],
      ['Sandwiches', 'Gochujang Chicken Bao', 'Two steamed buns with spicy glazed chicken and slaw.', 12, '🥠'],
      ['Noodles', 'Japchae Noodles', 'Sweet potato noodles with vegetables and sesame.', 13, '🍜'],
      ['Drinks', 'Yuzu Lemonade', 'Sparkling citrus lemonade with fragrant yuzu.', 5, '🍋']
    ]),
    'cupcake-caravan': buildTruckMenu('cupcake-caravan', [
      ['Classic Cupcakes', 'Vanilla Confetti Cupcake', 'Vanilla bean cake, buttercream, and rainbow confetti.', 4.5, '🧁'],
      ['Signature Cupcakes', 'Salted Caramel Cupcake', 'Chocolate cake, caramel center, and salted buttercream.', 5, '🍮'],
      ['Signature Cupcakes', 'Strawberry Shortcake Cupcake', 'Vanilla cake with strawberry filling and whipped frosting.', 5, '🍓'],
      ['Mini Boxes', 'Six Mini Cupcake Box', 'A rotating assortment of six bite-size cupcakes.', 15, '🎁'],
      ['Drinks', 'Cold Milk', 'Chilled whole or chocolate milk.', 3, '🥛']
    ]),
    'scoop-loop': buildTruckMenu('scoop-loop', [
      ['Cones', 'Double Scoop Cone', 'Choose two rotating house-churned flavors.', 7, '🍦'],
      ['Sundaes', 'Hot Fudge Brownie Sundae', 'Vanilla ice cream, warm brownie, fudge, and whipped cream.', 9, '🍨'],
      ['Shakes', 'Cookies and Cream Shake', 'Thick vanilla shake blended with chocolate cookies.', 8, '🥤'],
      ['Frozen Treats', 'Strawberry Ice Cream Sandwich', 'Strawberry ice cream between soft sugar cookies.', 6, '🍓'],
      ['Dairy Free', 'Mango Coconut Sorbet', 'Bright mango sorbet made with coconut milk.', 6, '🥭']
    ]),
    'bull-city-burgers': buildTruckMenu('bull-city-burgers', [
      ['Snacks', 'Fried Pickle Chips', 'Crispy dill pickle chips with ranch.', 7, '🥒'],
      ['Burgers', 'Bull City Double', 'Two smashed patties, cheddar, pickles, onion, and house sauce.', 14, '🍔'],
      ['Burgers', 'Carolina Chili Burger', 'Beef patty, beef chili, slaw, mustard, and onions.', 13.5, '🍔'],
      ['Chicken', 'Hot Honey Chicken Sandwich', 'Crispy chicken, hot honey, pickles, and slaw.', 13, '🍗'],
      ['Sides', 'Parmesan Truffle Fries', 'Hand-cut fries with parmesan and truffle seasoning.', 6, '🍟']
    ]),
    'smokehouse-919': buildTruckMenu('smokehouse-919', [
      ['Pit Snacks', 'Brisket Queso', 'Smoked brisket, warm queso, jalapeños, and tortilla chips.', 11, '🧀'],
      ['From the Pit', 'Prime Brisket Plate', 'Sliced oak-smoked brisket, pickles, bread, and two sides.', 21, '🥩'],
      ['From the Pit', 'St. Louis Rib Plate', 'Dry-rubbed pork ribs glazed with house barbecue sauce.', 20, '🍖'],
      ['Sandwiches', 'Smoked Turkey Melt', 'Smoked turkey, cheddar, onions, and white barbecue sauce.', 14, '🥪'],
      ['Sides', 'Jalapeño Cornbread', 'Cast-iron cornbread with honey butter.', 5, '🌽']
    ]),
    'green-route-vegan': buildTruckMenu('green-route-vegan', [
      ['Starters', 'Buffalo Cauliflower', 'Crispy cauliflower, buffalo sauce, and cashew ranch.', 9, '🥦'],
      ['Bowls', 'Rainbow Buddha Bowl', 'Quinoa, roasted vegetables, chickpeas, greens, and tahini.', 14, '🥗'],
      ['Sandwiches', 'Crispy Oyster Mushroom Sandwich', 'Crispy mushrooms, slaw, pickles, and herb aioli.', 13, '🍄'],
      ['Tacos', 'Walnut Chorizo Tacos', 'Three corn tortillas with walnut chorizo and avocado crema.', 12, '🌮'],
      ['Desserts', 'Chocolate Avocado Mousse', 'Silky dark chocolate mousse with coconut whip.', 6, '🥑']
    ]),
    'pie-and-pudding': buildTruckMenu('pie-and-pudding', [
      ['Pie Slices', 'Brown Butter Apple Pie', 'Spiced apples under a flaky brown-butter crust.', 7, '🥧'],
      ['Pie Slices', 'Chocolate Chess Pie', 'Rich Southern chocolate custard in a crisp crust.', 7, '🍫'],
      ['Puddings', 'Classic Banana Pudding', 'Vanilla pudding, bananas, wafers, and whipped cream.', 6.5, '🍌'],
      ['Puddings', 'Butterscotch Pudding', 'Brown sugar custard with salted caramel cream.', 6.5, '🍮'],
      ['Drinks', 'Vanilla Cream Soda', 'House vanilla syrup, soda, and sweet cream.', 4, '🥤']
    ]),
    'bayou-bites': buildTruckMenu('bayou-bites', [
      ['Lagniappe', 'Crawfish Beignets', 'Savory crawfish fritters with rémoulade.', 10, '🦞'],
      ['Po Boys', 'Fried Shrimp Po Boy', 'Crispy Gulf shrimp, lettuce, tomato, pickles, and sauce.', 16, '🍤'],
      ['Bowls', 'Chicken and Sausage Gumbo', 'Dark roux gumbo over rice with scallions.', 14, '🍲'],
      ['Rice Plates', 'Cajun Jambalaya', 'Spiced rice with chicken, andouille, and vegetables.', 15, '🍚'],
      ['Desserts', 'Powdered Sugar Beignets', 'Three hot New Orleans-style beignets.', 7, '🍩']
    ]),
    'pasta-passeggiata': buildTruckMenu('pasta-passeggiata', [
      ['Antipasti', 'Arancini', 'Crispy risotto balls with mozzarella and tomato sauce.', 9, '🧀'],
      ['Fresh Pasta', 'Cacio e Pepe', 'Fresh spaghetti, pecorino romano, and cracked pepper.', 15, '🍝'],
      ['Fresh Pasta', 'Short Rib Pappardelle', 'Wide ribbons with braised beef and tomato ragu.', 18, '🍝'],
      ['Sandwiches', 'Chicken Parmesan Panino', 'Crispy chicken, marinara, mozzarella, and basil.', 14, '🥪'],
      ['Desserts', 'Tiramisu Cup', 'Espresso-soaked ladyfingers and mascarpone cream.', 7, '☕']
    ]),
    'curry-in-a-hurry': buildTruckMenu('curry-in-a-hurry', [
      ['Street Snacks', 'Vegetable Samosas', 'Two crisp pastries with spiced potato and peas.', 6, '🥟'],
      ['Curries', 'Butter Chicken Bowl', 'Tomato cream curry, basmati rice, and cucumber salad.', 15, '🍛'],
      ['Curries', 'Chana Masala Bowl', 'Spiced chickpeas, basmati rice, and herb chutney.', 13, '🫘'],
      ['Wraps', 'Tandoori Chicken Kati Roll', 'Spiced chicken, onions, mint chutney, and paratha.', 12, '🌯'],
      ['Drinks', 'Mango Lassi', 'Chilled mango yogurt drink with cardamom.', 5, '🥭']
    ]),
    'breakfast-bus': buildTruckMenu('breakfast-bus', [
      ['Biscuits', 'Sausage Egg Biscuit', 'Buttermilk biscuit, sausage, egg, cheddar, and pepper jelly.', 8, '🥯'],
      ['Breakfast Plates', 'Chicken and Waffles', 'Crispy chicken, Belgian waffle, hot honey, and syrup.', 15, '🧇'],
      ['Breakfast Bowls', 'Loaded Grits Bowl', 'Creamy grits, eggs, bacon, cheddar, and scallions.', 12, '🍳'],
      ['Sweet Breakfast', 'Berry French Toast', 'Brioche French toast, berries, cream, and maple syrup.', 13, '🍓'],
      ['Coffee', 'Maple Cold Brew', 'Cold brew with maple cream and cinnamon.', 5, '☕']
    ])
  };

  const TRUCK_MENU_EXTRAS = {
    'rolling-ember-bbq': buildTruckMenu('rolling-ember-bbq', [
      ['Snacks', 'BBQ Pork Rinds', 'Crispy pork rinds dusted with the house barbecue rub.', 5, '🐖'],
      ['Drinks', 'Cherry Cola', 'Cold craft cola with black cherry.', 4, '🥤'],
      ['Drinks', 'Smoked Lemonade', 'Fresh lemonade with charred lemon and rosemary.', 4.5, '🍋']
    ]),
    'taco-luna': buildTruckMenu('taco-luna', [
      ['Snacks', 'Chile Lime Chicharrones', 'Crispy pork rinds with chile, lime, and sea salt.', 5, '🌶️'],
      ['Drinks', 'Horchata', 'Chilled cinnamon rice milk.', 4.5, '🥛'],
      ['Drinks', 'Mexican Coke', 'Cane-sugar cola served ice cold.', 4, '🥤']
    ]),
    'triangle-dumpling-co': buildTruckMenu('triangle-dumpling-co', [
      ['Snacks', 'Sesame Cucumber Salad', 'Chilled cucumbers with sesame, rice vinegar, and chili.', 6, '🥒'],
      ['Drinks', 'Brown Sugar Boba Tea', 'Black milk tea with brown sugar tapioca pearls.', 6, '🧋'],
      ['Drinks', 'Sparkling Yuzu Water', 'Crisp sparkling water with Japanese yuzu.', 4, '🍋']
    ]),
    'oak-city-sweets': buildTruckMenu('oak-city-sweets', [
      ['Snacks', 'Caramel Popcorn Cup', 'Buttery popcorn coated in salted caramel.', 5, '🍿'],
      ['Drinks', 'Strawberry Milk', 'Cold milk blended with house strawberry syrup.', 4.5, '🥛'],
      ['Drinks', 'Vanilla Iced Latte', 'Espresso, milk, ice, and vanilla bean syrup.', 5.5, '☕']
    ]),
    'carolina-coastal-kitchen': buildTruckMenu('carolina-coastal-kitchen', [
      ['Snacks', 'Old Bay Oyster Crackers', 'Toasted oyster crackers tossed in coastal spices.', 4.5, '🦪'],
      ['Drinks', 'Coastal Arnold Palmer', 'Half sweet tea and half fresh lemonade.', 4, '🍋'],
      ['Drinks', 'Pineapple Sparkler', 'Pineapple, lime, and sparkling water.', 5, '🍍']
    ]),
    'mama-jos-soul-kitchen': buildTruckMenu('mama-jos-soul-kitchen', [
      ['Snacks', 'Hot Honey Cornbread Bites', 'Mini cornbread bites with whipped butter and hot honey.', 6, '🌽'],
      ['Drinks', 'Southern Sweet Tea', 'Fresh-brewed black tea with lemon.', 4, '🥤'],
      ['Drinks', 'Strawberry Lemonade', 'House lemonade with strawberry purée.', 4.5, '🍓']
    ]),
    'kingston-jerk-stop': buildTruckMenu('kingston-jerk-stop', [
      ['Snacks', 'Jerk Plantain Chips', 'Crisp plantain chips with warm jerk spices.', 5, '🍌'],
      ['Drinks', 'Jamaican Sorrel', 'Chilled hibiscus drink with ginger and island spices.', 5, '🌺'],
      ['Drinks', 'Ting Grapefruit Soda', 'Sparkling Caribbean grapefruit soda.', 4, '🥤']
    ]),
    'athena-street-eats': buildTruckMenu('athena-street-eats', [
      ['Snacks', 'Pita Chips and Tzatziki', 'Crisp oregano pita chips with cool cucumber yogurt dip.', 6, '🫓'],
      ['Drinks', 'Greek Lemon Soda', 'Sparkling lemon soda served cold.', 4, '🍋'],
      ['Drinks', 'Peach Mountain Tea', 'Iced black tea with peach and wildflower honey.', 4.5, '🍑']
    ]),
    'seoul-on-wheels': buildTruckMenu('seoul-on-wheels', [
      ['Snacks', 'Seaweed Rice Crisps', 'Crunchy sesame rice crisps wrapped with roasted seaweed.', 5, '🍘'],
      ['Drinks', 'Korean Pear Juice', 'Chilled sweet Korean pear juice.', 4.5, '🍐'],
      ['Drinks', 'Strawberry Milk Tea', 'Creamy iced tea with strawberry.', 5.5, '🧋']
    ]),
    'cupcake-caravan': buildTruckMenu('cupcake-caravan', [
      ['Snacks', 'Birthday Cake Pop', 'Vanilla cake pop dipped in white chocolate and sprinkles.', 4, '🍭'],
      ['Drinks', 'Sparkling Raspberry Lemonade', 'Raspberry lemonade with sparkling water.', 4.5, '🍓'],
      ['Drinks', 'Chocolate Milk', 'Rich chilled chocolate milk.', 3.5, '🥛']
    ]),
    'scoop-loop': buildTruckMenu('scoop-loop', [
      ['Snacks', 'Chocolate-Dipped Waffle Chips', 'Crisp waffle cone chips dipped in dark chocolate.', 5, '🍫'],
      ['Drinks', 'Root Beer Float', 'Craft root beer with vanilla ice cream.', 7, '🍺'],
      ['Drinks', 'Cold Brew Float', 'Cold brew coffee poured over vanilla ice cream.', 7.5, '☕']
    ]),
    'bull-city-burgers': buildTruckMenu('bull-city-burgers', [
      ['Snacks', 'Cajun Onion Straws', 'Thin crispy onions with Cajun seasoning and ranch.', 6, '🧅'],
      ['Drinks', 'Vanilla Cola', 'Craft cola with house vanilla syrup.', 4.5, '🥤'],
      ['Drinks', 'Fresh Limeade', 'Tart limeade shaken over ice.', 4, '🍋']
    ]),
    'smokehouse-919': buildTruckMenu('smokehouse-919', [
      ['Snacks', 'Smoked Chex Mix', 'Crunchy cereal, pretzels, peanuts, and smoky pit seasoning.', 5, '🥜'],
      ['Drinks', 'Bourbon Barrel Root Beer', 'Alcohol-free craft root beer with oak and vanilla notes.', 4.5, '🥤'],
      ['Drinks', 'Blackberry Sweet Tea', 'Southern sweet tea with blackberry.', 4, '🫐']
    ]),
    'green-route-vegan': buildTruckMenu('green-route-vegan', [
      ['Snacks', 'Crispy Spiced Chickpeas', 'Roasted chickpeas with smoked paprika and sea salt.', 5, '🫘'],
      ['Drinks', 'Cucumber Mint Cooler', 'Cucumber, mint, lime, and sparkling water.', 5, '🥒'],
      ['Drinks', 'Blueberry Kombucha', 'Locally brewed blueberry kombucha.', 6, '🫐']
    ]),
    'pie-and-pudding': buildTruckMenu('pie-and-pudding', [
      ['Snacks', 'Cinnamon Pie Crust Dippers', 'Baked pie crust strips with cinnamon sugar and caramel.', 5, '🥧'],
      ['Drinks', 'Salted Caramel Cold Brew', 'Cold brew topped with salted caramel cream.', 5.5, '☕'],
      ['Drinks', 'Cherry Cream Soda', 'Sparkling cherry soda with sweet cream.', 4.5, '🍒']
    ]),
    'bayou-bites': buildTruckMenu('bayou-bites', [
      ['Snacks', 'Cajun Spiced Peanuts', 'Warm roasted peanuts tossed with bayou spices.', 4.5, '🥜'],
      ['Drinks', 'Louisiana Chicory Cold Brew', 'Smooth chicory coffee served over ice.', 5, '☕'],
      ['Drinks', 'Praline Cream Soda', 'Vanilla cream soda with toasted pecan flavor.', 4.5, '🥤']
    ]),
    'pasta-passeggiata': buildTruckMenu('pasta-passeggiata', [
      ['Snacks', 'Parmesan Breadsticks', 'Warm garlic breadsticks with parmesan and marinara.', 6, '🥖'],
      ['Drinks', 'Blood Orange Italian Soda', 'Blood orange syrup, sparkling water, and citrus.', 5, '🍊'],
      ['Drinks', 'Peach Bellini Fizz', 'Alcohol-free peach nectar with sparkling water.', 5, '🍑']
    ]),
    'curry-in-a-hurry': buildTruckMenu('curry-in-a-hurry', [
      ['Snacks', 'Masala-Spiced Cashews', 'Roasted cashews with curry leaf and warm spices.', 5, '🥜'],
      ['Drinks', 'Rose Lemonade', 'Fresh lemonade scented with rose water.', 4.5, '🌹'],
      ['Drinks', 'Cardamom Iced Chai', 'Black tea, milk, cardamom, and warming spices.', 5, '🧋']
    ]),
    'breakfast-bus': buildTruckMenu('breakfast-bus', [
      ['Snacks', 'Maple Granola Cup', 'House granola with maple, pecans, and dried berries.', 5, '🥣'],
      ['Drinks', 'Fresh Orange Juice', 'Cold fresh-squeezed orange juice.', 5, '🍊'],
      ['Drinks', 'Vanilla Oat Milk Latte', 'Espresso, oat milk, and vanilla bean syrup.', 5.5, '☕']
    ])
  };

  const TRUCK_ENTREE_EXTRAS = {
    'rolling-ember-bbq': buildTruckMenu('rolling-ember-bbq', [
      ['Entrees', 'Smoked Chicken Quarter', 'Hickory-smoked chicken with barbecue glaze, two sides, and cornbread.', 15, '🍗'],
      ['Entrees', 'St. Louis Rib Plate', 'Tender dry-rubbed ribs with pickles, bread, and two country sides.', 19, '🍖'],
      ['Entrees', 'Pitmaster Sausage Platter', 'Smoked sausage links with peppers, onions, beans, and slaw.', 16, '🌭']
    ]),
    'taco-luna': buildTruckMenu('taco-luna', [
      ['Entrees', 'Al Pastor Taco Plate', 'Three achiote pork tacos with pineapple, onion, cilantro, and rice.', 13, '🌮'],
      ['Entrees', 'Carne Asada Quesadilla', 'Griddled flour tortilla with steak, Oaxaca cheese, and salsa roja.', 14, '🫓'],
      ['Entrees', 'Chicken Enchilada Bowl', 'Chile-braised chicken, rice, beans, queso, crema, and salsa verde.', 14, '🍲']
    ]),
    'triangle-dumpling-co': buildTruckMenu('triangle-dumpling-co', [
      ['Entrees', 'Orange Chicken Rice Bowl', 'Crispy chicken, bright citrus glaze, broccoli, and steamed rice.', 14, '🍗'],
      ['Entrees', 'Beef Chow Fun', 'Wide rice noodles with tender beef, scallions, and bean sprouts.', 15, '🍜'],
      ['Entrees', 'Coconut Tofu Curry', 'Crispy tofu and vegetables in coconut curry with jasmine rice.', 13, '🍛']
    ]),
    'oak-city-sweets': buildTruckMenu('oak-city-sweets', [
      ['Entrees', 'Brownie Waffle Sundae', 'Warm brownie waffle, vanilla ice cream, fudge, and whipped cream.', 11, '🍨'],
      ['Entrees', 'Oak City Dessert Flight', 'A tasting of cheesecake, banana pudding, brownie, and cookie.', 14, '🍰'],
      ['Entrees', 'Stuffed Cookie Skillet', 'Warm chocolate chip cookie filled with caramel and topped with ice cream.', 10, '🍪']
    ]),
    'carolina-coastal-kitchen': buildTruckMenu('carolina-coastal-kitchen', [
      ['Entrees', 'Carolina Crab Cake Plate', 'Two blue crab cakes with coastal slaw, fries, and remoulade.', 21, '🦀'],
      ['Entrees', 'Beer-Battered Fish and Chips', 'Crispy Atlantic cod, seasoned fries, slaw, and tartar sauce.', 17, '🐟'],
      ['Entrees', 'Lowcountry Shrimp and Grits', 'Blackened shrimp, creamy grits, peppers, bacon, and pan sauce.', 18, '🍤']
    ]),
    'mama-jos-soul-kitchen': buildTruckMenu('mama-jos-soul-kitchen', [
      ['Entrees', 'Southern Fried Catfish Plate', 'Cornmeal-crusted catfish with two sides and a hushpuppy.', 17, '🐟'],
      ['Entrees', 'Sunday Meatloaf Dinner', 'Glazed beef meatloaf, mashed potatoes, green beans, and gravy.', 16, '🍽️'],
      ['Entrees', 'Hot Honey Chicken and Waffles', 'Crispy chicken, Belgian waffle, hot honey, and maple syrup.', 16, '🧇']
    ]),
    'kingston-jerk-stop': buildTruckMenu('kingston-jerk-stop', [
      ['Entrees', 'Curry Goat Plate', 'Slow-cooked curry goat with rice and peas and steamed cabbage.', 19, '🍛'],
      ['Entrees', 'Brown Stew Chicken', 'Jamaican brown stew chicken with island gravy and rice.', 16, '🍗'],
      ['Entrees', 'Escovitch Fish Plate', 'Crispy fish with spicy pickled vegetables, festival, and plantains.', 20, '🐟']
    ]),
    'athena-street-eats': buildTruckMenu('athena-street-eats', [
      ['Entrees', 'Falafel Mezze Platter', 'Herb falafel, hummus, village salad, olives, and warm pita.', 15, '🧆'],
      ['Entrees', 'Moussaka Bowl', 'Layers of eggplant, seasoned beef, potato, and creamy béchamel.', 16, '🍲'],
      ['Entrees', 'Garlic Shrimp Souvlaki', 'Grilled shrimp skewers with lemon rice, salad, and tzatziki.', 18, '🍤']
    ]),
    'seoul-on-wheels': buildTruckMenu('seoul-on-wheels', [
      ['Entrees', 'Kimchi Fried Rice', 'Wok-fried rice with kimchi, vegetables, sesame, and fried egg.', 13, '🍳'],
      ['Entrees', 'Spicy Pork Bulgogi Bowl', 'Gochujang pork, steamed rice, pickled vegetables, and scallions.', 15, '🍚'],
      ['Entrees', 'Crispy Tofu Bibimbap', 'Seasoned vegetables, rice, crispy tofu, egg, and gochujang.', 14, '🥗']
    ]),
    'cupcake-caravan': buildTruckMenu('cupcake-caravan', [
      ['Entrees', 'Signature Cupcake Flight', 'Choose four full-size cupcakes from today’s signature flavors.', 18, '🧁'],
      ['Entrees', 'Cupcake Sundae', 'Warm cupcake, vanilla ice cream, sauce, whipped cream, and sprinkles.', 10, '🍨'],
      ['Entrees', 'Celebration Treat Box', 'Two cupcakes, two brownies, two cookies, and chocolate-dipped pretzels.', 24, '🎁']
    ]),
    'scoop-loop': buildTruckMenu('scoop-loop', [
      ['Entrees', 'Classic Banana Split', 'Three scoops, banana, fudge, strawberry, pineapple, and whipped cream.', 12, '🍌'],
      ['Entrees', 'Ice Cream Tasting Flight', 'Six small scoops of rotating house-churned flavors.', 14, '🍨'],
      ['Entrees', 'Loaded Waffle Bowl', 'Three scoops in a waffle bowl with two sauces and three toppings.', 13, '🧇']
    ]),
    'bull-city-burgers': buildTruckMenu('bull-city-burgers', [
      ['Entrees', 'Mushroom Swiss Smash', 'Two smashed patties, mushrooms, Swiss, onions, and garlic aioli.', 14, '🍔'],
      ['Entrees', 'Bacon Jam Burger', 'Beef patty, cheddar, bacon-onion jam, pickles, and mustard sauce.', 15, '🥓'],
      ['Entrees', 'Black Bean Crunch Burger', 'Seasoned black bean patty, avocado, slaw, tomato, and chipotle aioli.', 13, '🥑']
    ]),
    'smokehouse-919': buildTruckMenu('smokehouse-919', [
      ['Entrees', 'Pulled Pork Dinner', 'Oak-smoked pulled pork, house sauce, two sides, and cornbread.', 17, '🐖'],
      ['Entrees', 'Texas Sausage Trio', 'Three smoked sausages with pickles, onions, bread, and two sides.', 18, '🌭'],
      ['Entrees', 'White Sauce Smoked Chicken', 'Half smoked chicken with Alabama white sauce and two sides.', 18, '🍗']
    ]),
    'green-route-vegan': buildTruckMenu('green-route-vegan', [
      ['Entrees', 'Smoky Lentil Burger', 'Lentil-walnut patty, greens, tomato, pickles, and cashew aioli.', 14, '🍔'],
      ['Entrees', 'BBQ Jackfruit Plate', 'Pulled jackfruit, baked beans, vinegar slaw, and cornbread.', 15, '🌱'],
      ['Entrees', 'Coconut Chickpea Curry', 'Chickpeas, sweet potato, spinach, coconut curry, and brown rice.', 14, '🍛']
    ]),
    'pie-and-pudding': buildTruckMenu('pie-and-pudding', [
      ['Entrees', 'Seasonal Pie Flight', 'Four generous tastes of today’s freshly baked pies.', 15, '🥧'],
      ['Entrees', 'Southern Pudding Trio', 'Banana, butterscotch, and chocolate pudding with house toppings.', 13, '🍮'],
      ['Entrees', 'Brownie Pie Sundae', 'Warm brownie pie, vanilla ice cream, fudge, and toasted pecans.', 11, '🍨']
    ]),
    'bayou-bites': buildTruckMenu('bayou-bites', [
      ['Entrees', 'Crawfish Étouffée', 'Crawfish in a rich seasoned sauce over steamed rice.', 18, '🦞'],
      ['Entrees', 'Blackened Catfish Plate', 'Blackened catfish with dirty rice, green beans, and remoulade.', 17, '🐟'],
      ['Entrees', 'Red Beans and Rice', 'Slow-cooked red beans, smoked sausage, rice, and cornbread.', 14, '🫘']
    ]),
    'pasta-passeggiata': buildTruckMenu('pasta-passeggiata', [
      ['Entrees', 'Basil Pesto Gnocchi', 'Potato gnocchi, basil pesto, blistered tomatoes, and parmesan.', 16, '🍝'],
      ['Entrees', 'Spicy Vodka Rigatoni', 'Rigatoni in creamy tomato vodka sauce with Calabrian chile.', 16, '🍝'],
      ['Entrees', 'Skillet Lasagna Cup', 'Layers of pasta, beef ragu, ricotta, mozzarella, and basil.', 17, '🧀']
    ]),
    'curry-in-a-hurry': buildTruckMenu('curry-in-a-hurry', [
      ['Entrees', 'Paneer Tikka Masala', 'Grilled paneer in tomato cream curry with basmati rice and naan.', 15, '🍛'],
      ['Entrees', 'Lamb Rogan Josh', 'Slow-braised lamb curry with basmati rice and cucumber raita.', 18, '🍲'],
      ['Entrees', 'Hyderabadi Chicken Biryani', 'Fragrant spiced rice layered with chicken, herbs, and fried onions.', 16, '🍚']
    ]),
    'breakfast-bus': buildTruckMenu('breakfast-bus', [
      ['Entrees', 'Loaded Breakfast Burrito', 'Eggs, sausage, potatoes, cheddar, peppers, and salsa in a flour tortilla.', 12, '🌯'],
      ['Entrees', 'Shrimp and Cheddar Grits', 'Blackened shrimp, creamy cheddar grits, tomatoes, and scallions.', 15, '🍤'],
      ['Entrees', 'Avocado Sunrise Toast', 'Sourdough, smashed avocado, two eggs, tomato, feta, and herbs.', 12, '🥑']
    ])
  };

  const TRUCK_ADDITIONAL_ENTREES = {
    'rolling-ember-bbq': buildTruckMenu('rolling-ember-bbq', [
      ['Entrees', 'Pepper-Smoked Turkey Plate', 'Sliced smoked turkey breast with white barbecue sauce and two sides.', 17, '🦃'],
      ['Entrees', 'Ember Pit Combo', 'Brisket, pulled pork, smoked sausage, two sides, pickles, and bread.', 24, '🔥']
    ]),
    'taco-luna': buildTruckMenu('taco-luna', [
      ['Entrees', 'Roasted Chile Relleno Plate', 'Poblano filled with cheese and vegetables, tomato sauce, rice, and beans.', 14, '🌶️'],
      ['Entrees', 'Chipotle Shrimp Burrito', 'Grilled shrimp, cilantro rice, black beans, slaw, and chipotle crema.', 15, '🌯']
    ]),
    'triangle-dumpling-co': buildTruckMenu('triangle-dumpling-co', [
      ['Entrees', 'Sesame Chicken Bowl', 'Crispy chicken, sesame glaze, broccoli, scallions, and steamed rice.', 14, '🍗'],
      ['Entrees', 'Roasted Pork Ramen', 'Rich broth, noodles, roasted pork, egg, mushrooms, and scallions.', 16, '🍜']
    ]),
    'oak-city-sweets': buildTruckMenu('oak-city-sweets', [
      ['Entrees', 'Strawberry Cheesecake Waffle', 'Warm Belgian waffle, cheesecake cream, strawberries, and crumble.', 11, '🧇'],
      ['Entrees', 'Southern Sweets Party Tray', 'Banana pudding, peach cobbler, brownies, cookies, and cheesecake bites.', 22, '🍰']
    ]),
    'carolina-coastal-kitchen': buildTruckMenu('carolina-coastal-kitchen', [
      ['Entrees', 'Blackened Salmon Rice Bowl', 'Blackened salmon, seasoned rice, coastal vegetables, and lemon sauce.', 19, '🐟'],
      ['Entrees', 'Crispy Oyster Po Boy', 'Fried oysters, lettuce, tomato, pickles, and remoulade on French bread.', 17, '🦪']
    ]),
    'mama-jos-soul-kitchen': buildTruckMenu('mama-jos-soul-kitchen', [
      ['Entrees', 'Smothered Pork Chop Dinner', 'Pan-seared pork chop, onion gravy, rice, and two sides.', 18, '🍖'],
      ['Entrees', 'Soulful Chicken Pot Pie', 'Chicken and vegetables in cream gravy under a flaky biscuit crust.', 15, '🥧']
    ]),
    'kingston-jerk-stop': buildTruckMenu('kingston-jerk-stop', [
      ['Entrees', 'Ackee and Saltfish Plate', 'Jamaica’s national dish with fried dumpling, plantain, and callaloo.', 18, '🐟'],
      ['Entrees', 'Jerk Salmon Plate', 'Jerk-glazed salmon with coconut rice and mango cabbage slaw.', 20, '🐟']
    ]),
    'athena-street-eats': buildTruckMenu('athena-street-eats', [
      ['Entrees', 'Lemon Chicken Rice Plate', 'Grilled lemon chicken, herbed rice, village salad, pita, and tzatziki.', 16, '🍗'],
      ['Entrees', 'Beef Keftedes Platter', 'Greek beef meatballs with lemon potatoes, salad, pita, and red sauce.', 17, '🧆']
    ]),
    'seoul-on-wheels': buildTruckMenu('seoul-on-wheels', [
      ['Entrees', 'Korean Fried Chicken Plate', 'Crispy glazed chicken with rice, pickled radish, and sesame slaw.', 16, '🍗'],
      ['Entrees', 'Galbi Short Rib Noodles', 'Marinated short rib, chewy noodles, vegetables, and soy garlic sauce.', 18, '🍜']
    ]),
    'cupcake-caravan': buildTruckMenu('cupcake-caravan', [
      ['Entrees', 'Baker’s Dozen Cupcake Box', 'Thirteen assorted classic and signature cupcakes.', 48, '🧁'],
      ['Entrees', 'Cookie Cupcake Sandwich Trio', 'Three buttercream-filled cupcake tops paired with soft cookies.', 14, '🍪']
    ]),
    'scoop-loop': buildTruckMenu('scoop-loop', [
      ['Entrees', 'Brownie Avalanche Sundae', 'Three scoops, brownie chunks, fudge, caramel, whipped cream, and nuts.', 13, '🍨'],
      ['Entrees', 'Dairy-Free Sundae Flight', 'Three coconut-based scoops with fruit sauces and toasted toppings.', 12, '🥥']
    ]),
    'bull-city-burgers': buildTruckMenu('bull-city-burgers', [
      ['Entrees', 'Griddled Patty Melt', 'Two beef patties, Swiss, caramelized onions, and sauce on rye.', 14, '🥪'],
      ['Entrees', 'Blue Ridge Burger', 'Beef patty, blue cheese, bacon, onion straws, and pepper jelly.', 15, '🍔']
    ]),
    'smokehouse-919': buildTruckMenu('smokehouse-919', [
      ['Entrees', 'Dino Beef Rib Plate', 'Massive smoked beef rib with two sides, pickles, and bread.', 28, '🍖'],
      ['Entrees', '919 Smokehouse Sampler', 'Brisket, ribs, pulled pork, sausage, two sides, and cornbread.', 27, '🥩']
    ]),
    'green-route-vegan': buildTruckMenu('green-route-vegan', [
      ['Entrees', 'Ginger Tempeh Power Bowl', 'Glazed tempeh, brown rice, vegetables, edamame, and sesame dressing.', 15, '🥗'],
      ['Entrees', 'Wild Mushroom Stroganoff', 'Mushrooms and noodles in a creamy cashew sauce with fresh herbs.', 15, '🍄']
    ]),
    'pie-and-pudding': buildTruckMenu('pie-and-pudding', [
      ['Entrees', 'Chocolate Pecan Pie À La Mode', 'Warm chocolate pecan pie with vanilla ice cream and caramel.', 11, '🥧'],
      ['Entrees', 'Warm Cobbler Sampler', 'Peach, berry, and apple cobblers with vanilla cream.', 13, '🍑']
    ]),
    'bayou-bites': buildTruckMenu('bayou-bites', [
      ['Entrees', 'Creole Shrimp Plate', 'Gulf shrimp in tomato Creole sauce over rice with green beans.', 18, '🍤'],
      ['Entrees', 'Boudin and Dirty Rice Plate', 'Grilled boudin links, dirty rice, mustard slaw, and French bread.', 16, '🌭']
    ]),
    'pasta-passeggiata': buildTruckMenu('pasta-passeggiata', [
      ['Entrees', 'Roasted Garlic Chicken Alfredo', 'Fresh fettuccine, grilled chicken, roasted garlic cream, and parmesan.', 18, '🍝'],
      ['Entrees', 'Eggplant Parmesan Bowl', 'Crispy eggplant, tomato sauce, mozzarella, basil, and fresh pasta.', 16, '🍆']
    ]),
    'curry-in-a-hurry': buildTruckMenu('curry-in-a-hurry', [
      ['Entrees', 'Chicken Vindaloo', 'Tangy hot-spiced chicken curry with basmati rice and naan.', 16, '🍛'],
      ['Entrees', 'Dal Makhani Plate', 'Slow-simmered black lentils with basmati rice, naan, and chutney.', 14, '🫘']
    ]),
    'breakfast-bus': buildTruckMenu('breakfast-bus', [
      ['Entrees', 'Steak and Egg Breakfast Hash', 'Seared steak, crispy potatoes, peppers, onions, eggs, and hollandaise.', 16, '🍳'],
      ['Entrees', 'Lemon Ricotta Pancake Stack', 'Three fluffy pancakes with berries, lemon cream, and maple syrup.', 13, '🥞']
    ])
  };

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
      statusLabel: 'Order Picked Up',
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
      statusLabel: 'Order Picked Up',
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
  const formatOrderDateTime = value => value
    ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  const normalizePhone = value => String(value || '').replace(/\D/g, '');
  const orderNumberValue = value => {
    const match = String(value ?? '').match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  };
  const orderNumberLabel = value => `Order #${orderNumberValue(value) || escapeHtml(value)}`;
  const checkoutOrderNumberText = (truck, value) => truck?.supabase ? 'Assigned after checkout' : orderNumberLabel(value);
  const checkoutOrderNumberEyebrow = (truck, value) => truck?.supabase ? 'Secure Checkout · Order number assigned after checkout' : `Secure Checkout · ${orderNumberLabel(value)}`;
  function generateOrderNumber() {
    let highest = Math.max(1046, Number(localStorage.getItem(ORDER_NUMBER_STORAGE_KEY)) || 0);
    try {
      const vendorOrders = JSON.parse(localStorage.getItem('ftnVendorOrdersV0231'));
      if (Array.isArray(vendorOrders)) vendorOrders.forEach(order => { highest = Math.max(highest, orderNumberValue(order.id)); });
    } catch {}
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY));
      if (Array.isArray(accounts)) accounts.forEach(account => {
        (account.orders || []).forEach(order => { highest = Math.max(highest, orderNumberValue(order.id)); });
        highest = Math.max(highest, orderNumberValue(account.cart?.orderNumber));
      });
    } catch {}
    try {
      const guest = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY));
      (guest?.orders || []).forEach(order => { highest = Math.max(highest, orderNumberValue(order.id)); });
      highest = Math.max(highest, orderNumberValue(guest?.cart?.orderNumber));
    } catch {}
    const nextOrderNumber = highest + 1;
    localStorage.setItem(ORDER_NUMBER_STORAGE_KEY, String(nextOrderNumber));
    return nextOrderNumber;
  }
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
        nearbyRadiusMiles: 5,
        cart: { truckId: null, items: [] },
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

    async getCurrentAccount() {
      const session = readSession();
      return session ? this.repository.findById(session.accountId) : null;
    }

    async requestPasswordReset() {
      throw new Error('Password reset email requires the Supabase connection.');
    }

    async requestMagicLink() {
      throw new Error('Secure email-link sign-in requires the Supabase connection.');
    }

    async resendConfirmation() {
      throw new Error('Confirmation email delivery requires the Supabase connection.');
    }

    async signOut() {}
  }

  const repository = new CustomerAccountRepository();

  function buildSupabaseAccount({ user, profile, existing, isPlatformAdmin = false }) {
    return {
      id: user.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      preferredName: profile.preferred_name || '',
      mobile: profile.mobile_number || '',
      email: user.email || existing?.email || '',
      photo: profile.profile_photo_url || '',
      role: profile.role || 'customer',
      isPlatformAdmin: Boolean(isPlatformAdmin),
      emailVerified: Boolean(user.email_confirmed_at),
      verificationDismissed: existing?.verificationDismissed || false,
      termsAcceptedAt: existing?.termsAcceptedAt || profile.created_at || user.created_at || new Date().toISOString(),
      createdAt: profile.created_at || user.created_at || existing?.createdAt || new Date().toISOString(),
      addresses: existing?.addresses || [],
      favoriteTrucks: existing?.favoriteTrucks || [],
      favoriteOrders: existing?.favoriteOrders || [],
      paymentMethods: existing?.paymentMethods || [],
      orders: existing?.orders || [],
      preferredLocation: existing?.preferredLocation || null,
      nearbyRadiusMiles: Number(existing?.nearbyRadiusMiles) || 5,
      cart: existing?.cart || { truckId: null, items: [] },
      preferences: existing?.preferences || defaultPreferences()
    };
  }

  class UnavailableCustomerAuthAdapter {
    constructor() {
      this.isSupabase = true;
    }
    unavailable() {
      throw new Error('The secure account service is temporarily unavailable. Guest checkout is still available.');
    }
    signUp() { return this.unavailable(); }
    signIn() { return this.unavailable(); }
    updateProfile() { return this.unavailable(); }
    changePassword() { return this.unavailable(); }
    deleteAccount() { return this.unavailable(); }
    requestPasswordReset() { return this.unavailable(); }
    requestMagicLink() { return this.unavailable(); }
    resendConfirmation() { return this.unavailable(); }
    getCurrentAccount() { return Promise.resolve(null); }
    signOut() { return Promise.resolve(); }
  }

  function createCustomerAuthAdapter() {
    const secureConfig = window.FoodTrekNowSupabaseConfig;
    // Local authentication is available only when it is explicitly configured.
    // If the production Supabase configuration fails to load, fail closed instead
    // of silently opening a legacy local session that cannot read live orders.
    if (secureConfig?.enabled === false) return new LocalCustomerAuthAdapter(repository);
    if (!secureConfig?.enabled || !window.FoodTrekNowSupabaseClient || !window.FoodTrekNowSupabaseAuth?.createAdapter) {
      return new UnavailableCustomerAuthAdapter();
    }
    const redirectUrl = /^https?:$/.test(window.location.protocol)
      ? `${window.location.origin}${window.location.pathname}`
      :…42402 tokens truncated…ddEventListener('click', () => {
    document.querySelector('.customer-sidebar')?.classList.remove('open');
    renderCustomerPage('overview');
    window.scrollTo(0, 0);
  }));
  document.querySelectorAll('[data-foodtrek-home="host"]').forEach(button => button.addEventListener('click', () => {
    document.querySelector('.host-portal-sidebar')?.classList.remove('open');
    window.FoodTrekNowOpportunityMarketplace?.mountHost();
    window.scrollTo(0, 0);
  }));
  document.getElementById('showCustomerSignInButton').addEventListener('click', () => showCustomerAuth('signin'));
  document.getElementById('showCreateAccountButton').addEventListener('click', () => showCustomerAuth('create'));
  document.getElementById('guestCheckoutButton').addEventListener('click', () => startGuestCheckout('nearby'));
  document.querySelectorAll('[data-auth-back]').forEach(button => button.addEventListener('click', () => authDestination === 'host' ? showVendorLogin() : showCustomerAuth()));
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
      event.target.reset();
      if (account.requiresEmailVerification) {
        clearSession();
        showCustomerAuth('signin');
        document.getElementById('customerSignInIdentifier').value = input.email.toLowerCase();
        document.getElementById('customerSignInMessage').textContent = 'Account created. Check your email and select the verification link before signing in.';
      } else {
        saveSession(account.id, true);
        openSelectedPortal(account);
        customerToast('Account created. Welcome to FoodTrekNow!');
      }
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
      openSelectedPortal(account);
      customerToast('Signed in successfully.');
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('customerForgotForm').addEventListener('submit', async event => {
    event.preventDefault();
    const identifier = document.getElementById('customerForgotIdentifier').value.trim();
    const message = document.getElementById('customerForgotMessage');
    message.textContent = '';
    if (!identifier) return;
    try {
      await CustomerAuthService.requestPasswordReset(identifier);
      message.textContent = 'If that email belongs to an account, a secure reset link has been sent.';
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('sendMagicLinkButton').addEventListener('click', async () => {
    const identifier = document.getElementById('customerSignInIdentifier').value.trim();
    const message = document.getElementById('customerSignInMessage');
    message.textContent = '';
    try {
      await CustomerAuthService.requestMagicLink(identifier);
      message.textContent = 'Secure sign-in link sent. Open the email on this device to continue.';
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('resendConfirmationButton').addEventListener('click', async () => {
    const identifier = document.getElementById('customerSignInIdentifier').value.trim();
    const message = document.getElementById('customerSignInMessage');
    message.textContent = '';
    try {
      await CustomerAuthService.resendConfirmation(identifier);
      message.textContent = 'If this account still needs verification, a new confirmation email has been sent.';
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById('customerSignOutButton').addEventListener('click', async () => {
    const wasGuest = Boolean(currentAccount?.isGuest);
    if (!wasGuest) {
      try {
        await CustomerAuthService.signOut();
      } catch (error) {
        customerToast(error.message);
        return;
      }
    }
    clearSession();
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    currentAccount = null;
    customerNotifications = [];
    customerCommunicationsSubscribed = false;
    showCustomerAuth(wasGuest ? 'welcome' : 'signin', 'customer');
  });
  document.getElementById('hostPortalSignOutButton').addEventListener('click', async () => {
    try {
      await CustomerAuthService.signOut();
    } catch (error) {
      customerToast(error.message);
      return;
    }
    clearSession();
    currentAccount = null;
    customerNotifications = [];
    customerCommunicationsSubscribed = false;
    showCustomerAuth('signin', 'host');
  });
  document.getElementById('switchToCustomerPortalButton').addEventListener('click', () => {
    if (currentAccount) openCustomerAccount(currentAccount);
  });
  document.getElementById('hostPortalMobileMenuButton').addEventListener('click', event => {
    const sidebar = document.querySelector('.host-portal-sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('closeHostPortalMenuButton').addEventListener('click', () => {
    document.querySelector('.host-portal-sidebar')?.classList.remove('open');
    document.getElementById('hostPortalMobileMenuButton')?.setAttribute('aria-expanded', 'false');
  });
  document.getElementById('customerMenuButton').addEventListener('click', event => {
    const sidebar = document.querySelector('.customer-sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('customerMobileCartButton').addEventListener('click', () => renderCustomerPage('cart'));
  document.getElementById('customerNotificationButton').addEventListener('click', () => renderCustomerPage('notifications'));
  document.getElementById('customerAccountNav').addEventListener('click', event => {
    const button = event.target.closest('[data-customer-page]');
    if (button) renderCustomerPage(button.dataset.customerPage);
  });
  document.getElementById('adminVendorPortalNav').addEventListener('click', async () => {
    if (!currentAccount?.isPlatformAdmin) return;
    try {
      const context = await window.FoodTrekNowVendorAuth?.restore();
      if (!context?.isPlatformAdmin) throw new Error('The FoodTrekNow administrator Vendor Portal could not be verified.');
      window.FoodTrekNowOpenApprovedVendorPortal(context);
    } catch (error) {
      customerToast(error.message);
    }
  });

  window.FoodTrekNowOpenCustomerPortal = async (page = 'overview') => {
    const account = await CustomerAuthService.getCurrentAccount();
    if (!account) throw new Error('Your FoodTrekNow session has expired. Sign in again.');
    openCustomerAccount(account, page);
    return account;
  };
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
      renderCustomerPage('cart');
      return;
    }
    if (target === 'explore') {
      renderCustomerPage('nearby');
      return;
    }
    renderCustomerPage('overview');
    setTimeout(() => document.getElementById('customerHomeEvents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  });
  document.getElementById('dismissVerificationButton').addEventListener('click', () => {
    currentAccount.verificationDismissed = true;
    persistCurrentAccount();
    document.getElementById('customerVerificationBanner').classList.add('hidden-view');
  });
  document.getElementById('closeCustomerAccountModal').addEventListener('click', closeModal);
  accountModal.addEventListener('click', event => { if (event.target === accountModal) closeModal(); });

  accountContent.addEventListener('click', async event => {
    const markNotifications = event.target.closest('[data-mark-notifications-read]');
    if (markNotifications) {
      await markCustomerNotificationsRead();
      renderCustomerPage('notifications');
      customerToast('All notifications marked as read.');
      return;
    }
    const notificationOrder = event.target.closest('[data-notification-order]');
    if (notificationOrder) {
      const order = currentAccount.orders.find(item => String(item.id) === String(notificationOrder.dataset.notificationOrder));
      const notificationId = notificationOrder.dataset.notificationId;
      if (notificationId) await markCustomerNotificationsRead([notificationId]);
      if (order) orderModal(order);
      if (currentPage === 'notifications') renderCustomerPage('notifications');
      return;
    }
    const vendorDecision = event.target.closest('[data-vendor-decision]');
    if (vendorDecision) {
      const decision = vendorDecision.dataset.vendorDecision;
      const label = decision === 'approved' ? 'approve this vendor and create their food truck' : 'reject this vendor application';
      if (!confirm(`Are you sure you want to ${label}?`)) return;
      const card = vendorDecision.closest('[data-vendor-review-card]');
      const notes = card?.querySelector('[data-vendor-review-notes]')?.value || '';
      try {
        await window.FoodTrekNowVendorOnboarding.review(vendorDecision.dataset.vendorApplicationId, decision, notes);
        customerToast(decision === 'approved' ? 'Vendor approved and food truck created.' : 'Vendor application rejected.');
        await loadVendorReviews();
      } catch (error) { customerToast(error.message); }
      return;
    }
    const approvedVendorPortal = event.target.closest('[data-open-approved-vendor-portal]');
    if (approvedVendorPortal) {
      await activateApprovedVendorPortal(false);
      return;
    }
    const refreshVendorManagement = event.target.closest('[data-refresh-vendor-management]');
    if (refreshVendorManagement) {
      refreshVendorManagement.disabled = true;
      try { await loadVendorManagement(); }
      finally { refreshVendorManagement.disabled = false; }
      return;
    }
    const adminContact = event.target.closest('[data-admin-contact-type]');
    if (adminContact) {
      const record = adminContactRecord(adminContact.dataset.adminContactType, adminContact.dataset.adminContactId);
      adminContactDetail(adminContact.dataset.adminContactType, record);
      return;
    }
    const vendorFreeze = event.target.closest('[data-admin-vendor-freeze]');
    if (vendorFreeze) {
      const shouldFreeze = vendorFreeze.dataset.adminVendorFreeze === 'true';
      const card = vendorFreeze.closest('[data-admin-vendor-card]');
      const truckName = card?.querySelector('h2')?.textContent || 'this vendor';
      const reason = card?.querySelector('[data-admin-freeze-reason]')?.value || '';
      if (shouldFreeze && reason.trim().length < 3) {
        customerToast('Enter a brief reason before freezing vendor access.');
        card?.querySelector('[data-admin-freeze-reason]')?.focus();
        return;
      }
      const action = shouldFreeze ? `freeze ${truckName} and remove it from customer ordering` : `restore ${truckName}'s access subject to its subscription status`;
      if (!confirm(`Are you sure you want to ${action}?`)) return;
      vendorFreeze.disabled = true;
      try {
        await window.FoodTrekNowAdminVendorManagement.setFrozen(vendorFreeze.dataset.vendorProfileId, shouldFreeze, reason);
        customerToast(shouldFreeze ? `${truckName} has been frozen.` : `${truckName} access has been restored.`);
        await loadVendorManagement();
      } catch (error) {
        customerToast(error.message);
        vendorFreeze.disabled = false;
      }
      return;
    }
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
        'delete-account': deleteAccountModal,
        'need-food-truck': () => openHostPortal(currentAccount)
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
      if (target === 'explore' || target === 'order') {
        renderCustomerPage('nearby');
        if (target === 'order') customerToast('Choose a nearby truck to start your order.');
        return;
      }
      const sectionId = target === 'events' || target === 'all-events' ? 'customerHomeEvents' : 'customerHomeExplore';
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target === 'all-events') customerToast('More local events are coming soon.');
      return;
    }
    const nearbyOrder = event.target.closest('[data-nearby-order]');
    if (nearbyOrder) {
      const truck = TRUCKS.find(item => item.id === nearbyOrder.dataset.nearbyOrder);
      if (truck) {
        selectedTruckId = truck.id;
        localStorage.setItem('ftnSelectedTruckV1', JSON.stringify({ truckId: truck.id, selectedAt: Date.now() }));
        renderCustomerPage('truckMenu');
      }
      return;
    }
    const nearbyDirections = event.target.closest('[data-nearby-directions]');
    if (nearbyDirections) {
      const truck = TRUCKS.find(item => item.id === nearbyDirections.dataset.nearbyDirections);
      if (truck && Number.isFinite(Number(truck.latitude)) && Number.isFinite(Number(truck.longitude))) {
        const destination = `${Number(truck.latitude)},${Number(truck.longitude)}`;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank', 'noopener');
        customerToast(`Opening directions to ${truck.name}.`);
      } else if (truck) customerToast(`${truck.name} has not shared a map location yet.`);
      return;
    }
    const pageBack = event.target.closest('[data-customer-page-back]');
    if (pageBack) {
      renderCustomerPage(pageBack.dataset.customerPageBack);
      return;
    }
    if (event.target.closest('[data-return-host-portal]')) {
      if (currentAccount) openHostPortal(currentAccount);
      return;
    }
    const orderingAction = event.target.closest('[data-ordering-action]');
    if (orderingAction) {
      const action = orderingAction.dataset.orderingAction;
      if (action === 'open-menu' || action === 'continue-shopping') {
        if (currentAccount.cart.truckId && action === 'continue-shopping') selectedTruckId = currentAccount.cart.truckId;
        renderCustomerPage('truckMenu');
      } else if (action === 'open-cart') renderCustomerPage('cart');
      else if (action === 'checkout' && currentAccount.cart.items.length) {
        if (unavailableCartItems().length) {
          renderCustomerPage('cart');
          customerToast('Remove sold-out items before checkout.');
          return;
        }
        if (!currentAccount.cart.orderNumber) currentAccount.cart.orderNumber = generateOrderNumber();
        CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
        renderCustomerPage('checkout');
      }
      else if (action === 'empty-cart' && confirm('Empty every item from your cart?')) {
        CustomerOrderingService.saveCart(currentAccount, { truckId: null, items: [] });
        renderCustomerPage('cart');
      } else if (action === 'track-order') renderCustomerPage('tracking');
      else if (action === 'directions') customerToast(`Directions to ${selectedTruck().name} are coming with Google Maps.`);
      else if (action === 'call') customerToast(`Calling ${selectedTruck().name} will be available soon.`);
      else if (action === 'share') customerToast(`Sharing ${selectedTruck().name} will be available soon.`);
      else if (action === 'apply-promo') customerToast('Promo code validation is coming soon.');
      return;
    }
    const openTruck = event.target.closest('[data-open-truck-profile]');
    if (openTruck) {
      selectedTruckId = openTruck.dataset.openTruckProfile;
      localStorage.setItem('ftnSelectedTruckV1', JSON.stringify({ truckId: selectedTruckId, selectedAt: Date.now() }));
      renderCustomerPage('truckMenu');
      return;
    }
    const addMenuItemButton = event.target.closest('[data-add-menu-item]');
    if (addMenuItemButton) {
      const item = menuForTruck().find(menuItem => menuItem.id === addMenuItemButton.dataset.addMenuItem);
      if (item) incrementConfiguredMenuItem(item);
      return;
    }
    const decreaseMenuItemButton = event.target.closest('[data-menu-item-decrease]');
    if (decreaseMenuItemButton) {
      decreaseMenuItem(decreaseMenuItemButton.dataset.menuItemDecrease);
      return;
    }
    const openMenuItem = event.target.closest('[data-open-menu-item]');
    if (openMenuItem) {
      const item = menuForTruck().find(menuItem => menuItem.id === openMenuItem.dataset.openMenuItem);
      if (item) menuItemDetailModal(item);
      return;
    }
    const categoryJump = event.target.closest('[data-menu-category]');
    if (categoryJump) {
      const section = accountContent.querySelector(`[data-menu-section="${categoryJump.dataset.menuCategory}"]`);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const cartQuantity = event.target.closest('[data-cart-quantity]');
    if (cartQuantity) {
      const item = currentAccount.cart.items.find(cartItem => cartItem.id === cartQuantity.dataset.cartQuantity);
      if (item) {
        item.quantity = Math.max(0, Math.min(99, item.quantity + Number(cartQuantity.dataset.quantityChange || 0)));
        item.qty = item.quantity;
        if (!item.quantity) currentAccount.cart.items = currentAccount.cart.items.filter(cartItem => cartItem.id !== item.id);
      }
      if (!currentAccount.cart.items.length) {
        currentAccount.cart.truckId = null;
        currentAccount.cart.orderNumber = null;
      }
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      renderCustomerPage('cart');
      return;
    }
    const cartNote = event.target.closest('[data-cart-note]');
    if (cartNote) {
      const item = currentAccount.cart.items.find(cartItem => cartItem.id === cartNote.dataset.cartNote);
      if (item) cartItemNoteModal(item);
      return;
    }
    const cartRemove = event.target.closest('[data-cart-remove]');
    if (cartRemove) {
      currentAccount.cart.items = currentAccount.cart.items.filter(item => item.id !== cartRemove.dataset.cartRemove);
      if (!currentAccount.cart.items.length) {
        currentAccount.cart.truckId = null;
        currentAccount.cart.orderNumber = null;
      }
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      renderCustomerPage('cart');
      return;
    }
    const orderAgain = event.target.closest('[data-order-again]');
    if (orderAgain) {
      const order = currentAccount.orders.find(item => String(item.id) === String(orderAgain.dataset.orderAgain));
      if (order) {
        selectedTruckId = order.truckId || TRUCK.id;
        currentAccount.cart = { truckId: selectedTruckId, orderNumber: generateOrderNumber(), items: order.items.map(item => ({ ...item, id: uid('cart') })) };
        CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
        renderCustomerPage('cart');
      }
      return;
    }
    const trackOrder = event.target.closest('[data-track-order]');
    if (trackOrder) {
      lastPlacedOrderId = trackOrder.dataset.trackOrder;
      renderCustomerPage('tracking');
      return;
    }
    const cancelOrder = event.target.closest('[data-cancel-order]');
    if (cancelOrder) {
      cancelOrderModal(currentAccount.orders.find(order => String(order.id) === String(cancelOrder.dataset.cancelOrder)));
      return;
    }
    const homeEvent = event.target.closest('[data-home-event]');
    if (homeEvent) {
      const eventItem = EVENTS.find(item => item.id === homeEvent.dataset.homeEvent);
      if (eventItem) customerEventModal(eventItem);
      return;
    }
    const orderFavorite = event.target.closest('[data-toggle-order-favorite]');
    if (orderFavorite) return toggleFavoriteOrder(orderFavorite.dataset.toggleOrderFavorite);
    const reorder = event.target.closest('[data-reorder]');
    if (reorder) return reorderMeal(reorder.dataset.reorder);
    const orderDetails = event.target.closest('[data-order-details]');
    if (orderDetails) return orderModal(currentAccount.orders.find(order => String(order.id) === String(orderDetails.dataset.orderDetails)));
    const receipt = event.target.closest('[data-receipt]');
    if (receipt) return orderModal(currentAccount.orders.find(order => String(order.id) === String(receipt.dataset.receipt)), true);
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
    const source = currentAccount.orders.find(order => String(order.id) === String(orderId));
    if (!source) return;
    if (source.supabaseOrderId) {
      selectedTruckId = source.truckId;
      currentAccount.cart = { truckId: selectedTruckId, orderNumber: generateOrderNumber(), items: source.items.map(item => ({ ...item, id: uid('cart') })) };
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      closeModal();
      renderCustomerPage('cart');
      customerToast('Your previous meal is ready to review and order again.');
      return;
    }
    const { pickupNumber: legacyPickupNumber, ...sourceWithoutPickupNumber } = source;
    const copy = {
      ...sourceWithoutPickupNumber,
      id: generateOrderNumber(),
      status: 'new',
      statusLabel: 'Order Received',
      createdAt: Date.now(),
      items: source.items.map(item => ({ ...item }))
    };
    currentAccount.orders.unshift(copy);
    persistCurrentAccount();
    syncPlacedOrderToVendor(copy);
    closeModal();
    orderHistoryFilter = 'current';
    renderCustomerPage('orders');
    customerToast('Meal reordered and added to current orders.');
  }

  accountContent.addEventListener('change', event => {
    if (event.target.id === 'adminVendorReportDays') {
      loadVendorManagement(Number(event.target.value));
      return;
    }
    if (event.target.matches('[data-nearby-radius]')) {
      const radius = Number(event.target.value);
      currentAccount.nearbyRadiusMiles = NEARBY_RADIUS_OPTIONS.includes(radius) ? radius : 5;
      persistCurrentAccount();
      renderCustomerPage('nearby');
      return;
    }
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
    if (event.target.id === 'vendorApplicationForm') {
      event.preventDefault();
      const message = document.getElementById('vendorApplicationMessage');
      const input = {
        businessName: document.getElementById('vendorApplicationBusinessName').value.trim(),
        truckName: document.getElementById('vendorApplicationTruckName').value.trim(),
        cuisine: document.getElementById('vendorApplicationCuisine').value.trim(),
        businessMobile: document.getElementById('vendorApplicationMobile').value.trim(),
        businessEmail: document.getElementById('vendorApplicationEmail').value.trim(),
        city: document.getElementById('vendorApplicationCity').value.trim(),
        state: document.getElementById('vendorApplicationState').value.trim(),
        description: document.getElementById('vendorApplicationDescription').value.trim()
      };
      if (!input.businessName || !input.truckName || !input.cuisine || normalizePhone(input.businessMobile).length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.businessEmail) || !input.city || input.state.length !== 2) {
        message.textContent = 'Complete every required field with a valid email, mobile number, and two-letter state.';
        return;
      }
      try {
        await window.FoodTrekNowVendorOnboarding.submit(input);
        customerToast('Vendor application submitted for review.');
        await loadVendorApplication();
      } catch (error) { message.textContent = error.message; }
      return;
    }
    if (event.target.id === 'customerCheckoutForm') {
      event.preventDefault();
      if (!currentAccount.cart.items.length) {
        renderCustomerPage('cart');
        return;
      }
      if (unavailableCartItems().length) {
        renderCustomerPage('cart');
        customerToast('Availability changed. Remove sold-out items before checkout.');
        return;
      }
      if (currentAccount.isGuest) {
        const guestName = document.getElementById('guestCheckoutName').value.trim();
        const guestMobile = document.getElementById('guestCheckoutMobile').value.trim();
        const guestEmail = document.getElementById('guestCheckoutEmail').value.trim().toLowerCase();
        if (!guestName || normalizePhone(guestMobile).length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
          document.getElementById('checkoutMessage').textContent = 'Enter your name, a valid mobile number, and a valid email address.';
          return;
        }
        const guestNameParts = guestName.split(/\s+/);
        currentAccount.firstName = guestNameParts.shift();
        currentAccount.lastName = guestNameParts.join(' ');
        currentAccount.preferredName = currentAccount.firstName;
        currentAccount.mobile = guestMobile;
        currentAccount.email = guestEmail;
        saveCustomerState(currentAccount);
      }
      const truck = TRUCKS.find(item => item.id === currentAccount.cart.truckId) || selectedTruck();
      const totals = cartTotals();
      const payment = accountContent.querySelector('input[name="paymentMethod"]:checked');
      const order = {
        id: currentAccount.cart.orderNumber || generateOrderNumber(),
        truckId: truck.id,
        truckName: truck.name,
        status: 'received',
        statusLabel: 'Order Received',
        createdAt: Date.now(),
        estimatedReadyAt: Date.now() + truck.pickupMinutes * 60 * 1000,
        pickupInstructions: `Show ${orderNumberLabel(currentAccount.cart.orderNumber)} at the truck window.`,
        items: currentAccount.cart.items.map(item => ({ ...item, qty: item.quantity, price: cartItemUnitPrice(item) })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        serviceFee: totals.serviceFee,
        total: totals.total,
        pickupTime: 'ASAP',
        paymentMethodId: payment?.value || '',
        paymentLabel: currentAccount.paymentMethods.find(method => method.id === payment?.value)?.brand || 'Pay at Pickup',
        guestCheckout: Boolean(currentAccount.isGuest),
        customerName: `${currentAccount.firstName} ${currentAccount.lastName}`.trim(),
        customerMobile: currentAccount.mobile,
        customerEmail: currentAccount.email,
        promoCode: document.getElementById('checkoutPromoCode').value.trim(),
        orderNotes: document.getElementById('checkoutOrderNotes').value.trim()
      };
      if (truck.supabase && !currentAccount.isGuest) {
        const checkoutMessage = document.getElementById('checkoutMessage');
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (!window.FoodTrekNowCustomerPayments?.available) {
          checkoutMessage.textContent = 'Secure Stripe Checkout is temporarily unavailable. Please try again shortly.';
          return;
        }
        checkoutMessage.textContent = window.FoodTrekNowCustomerPayments.testMode ? 'Sending your no-charge test order…' : 'Opening secure Stripe Checkout…';
        if (submitButton) submitButton.disabled = true;
        try {
          const checkoutResult = await window.FoodTrekNowCustomerPayments.startCheckout({
            truckId: truck.id,
            items: currentAccount.cart.items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: Number(item.quantity),
              modifiers: item.modifiers || [],
              instructions: item.instructions || ''
            })),
            customerName: order.customerName,
            customerMobile: order.customerMobile,
            customerEmail: order.customerEmail,
            orderNotes: order.orderNotes,
            useVendorCredit: document.getElementById('useVendorCredit')?.checked !== false
          });
          if (checkoutResult?.order?.order_number) {
            currentAccount.cart = { truckId: null, items: [] };
            CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
            await hydrateLiveCustomerOrders();
            await hydrateVendorCredits();
            lastPlacedOrderId = Number(checkoutResult.order.order_number);
            renderCustomerPage('confirmation');
            customerToast(checkoutResult.testPayment
              ? `${orderNumberLabel(lastPlacedOrderId)} was sent as a Test Paid order. No money was charged.`
              : `${orderNumberLabel(lastPlacedOrderId)} was paid with ${truck.name} credit and sent to the truck.`);
          }
        } catch (error) {
          checkoutMessage.textContent = error.message || 'Stripe Checkout could not be opened. Please try again.';
          if (submitButton) submitButton.disabled = false;
        }
        return;
      }
      let liveOrderPlaced = false;
      if (truck.supabase && !currentAccount.isGuest && window.FoodTrekNowLiveOrders?.available) {
        const checkoutMessage = document.getElementById('checkoutMessage');
        checkoutMessage.textContent = 'Placing your secure order…';
        try {
          const placed = await window.FoodTrekNowLiveOrders.placeOrder({
            truckId: truck.id,
            items: currentAccount.cart.items,
            customerName: order.customerName,
            customerMobile: order.customerMobile,
            customerEmail: order.customerEmail,
            orderNotes: order.orderNotes,
            paymentLabel: order.paymentLabel
          });
          Object.assign(order, {
            id: Number(placed.order_number),
            supabaseOrderId: placed.order_id,
            pickupInstructions: `Show ${orderNumberLabel(placed.order_number)} at the truck window.`,
            status: placed.status,
            statusLabel: databaseStatusForCustomer(placed.status).statusLabel,
            subtotal: Number(placed.subtotal),
            tax: Number(placed.tax),
            serviceFee: 0,
            total: Number(placed.total)
          });
          liveOrderPlaced = true;
        } catch (error) {
          checkoutMessage.textContent = error.message || 'Your order could not be placed. Please try again.';
          return;
        }
      }
      CustomerOrderingService.placeOrder(currentAccount, order);
      if (!liveOrderPlaced) syncPlacedOrderToVendor(order);
      lastPlacedOrderId = order.id;
      selectedTruckId = truck.id;
      renderCustomerPage('confirmation');
      customerToast(`${orderNumberLabel(order.id)} was placed successfully.`);
      return;
    }
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
      const menusByTruck = new Map(TRUCKS.map(truck => [truck.id, menuForTruck(truck.id)]));
      const menuMatches = [...menusByTruck.entries()].flatMap(([truckId, menu]) => menu
        .filter(item => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query))
        .map(item => ({ ...item, truckId })));
      const menuMatchTruckIds = new Set(menuMatches.map(item => item.truckId));
      const truckMatches = TRUCKS.filter(truck => `${truck.name} ${truck.cuisine} ${truck.status}`.toLowerCase().includes(query) || menuMatchTruckIds.has(truck.id));
      const eventMatches = EVENTS.filter(item => `${item.name} ${item.location} ${item.detail}`.toLowerCase().includes(query));
      const total = truckMatches.length + menuMatches.length + eventMatches.length;
      results.innerHTML = `<div class="home-search-result-card"><div><strong>${total ? `${total} result${total === 1 ? '' : 's'} for “${escapeHtml(input.value.trim())}”` : `No matches for “${escapeHtml(input.value.trim())}”`}</strong><p>${total ? [
        truckMatches.length ? `${truckMatches.length} truck${truckMatches.length === 1 ? '' : 's'}` : '',
        menuMatches.length ? `${menuMatches.length} menu item${menuMatches.length === 1 ? '' : 's'}` : '',
        eventMatches.length ? `${eventMatches.length} event${eventMatches.length === 1 ? '' : 's'}` : ''
      ].filter(Boolean).join(' · ') : 'Try a truck name, menu item, cuisine, city event, or “tacos”.'}</p></div><button data-home-target="${eventMatches.length && !truckMatches.length ? 'events' : 'explore'}" type="button">${total ? 'View matches' : 'Browse nearby'}</button></div>${truckMatches.length ? `<div class="home-search-truck-matches">${truckMatches.map(truck => `<button data-open-truck-profile="${truck.id}" type="button"><span>${truck.icon || '🚚'}</span><span><strong>${escapeHtml(truck.name)}</strong><small>${escapeHtml(truck.cuisine)}</small></span><b>View Truck →</b></button>`).join('')}</div>` : ''}`;
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
    try {
      currentAccount = await CustomerAuthService.updateProfile(currentAccount.id, updates);
      renderCustomerShell();
      renderCustomerPage('profile');
      customerToast(currentAccount.emailVerified ? 'Profile saved.' : 'Profile saved. Verify your new email address to complete the change.');
    } catch (error) {
      message.textContent = error.message;
    }
  });

  modalContent.addEventListener('click', async event => {
    if (event.target.closest('[data-close-customer-modal]')) closeModal();
    const detailQuantity = event.target.closest('[data-menu-detail-quantity]');
    if (detailQuantity) {
      const input = document.getElementById('menuItemDetailQuantity');
      input.value = String(Math.max(1, Math.min(99, Number(input.value || 1) + Number(detailQuantity.dataset.menuDetailQuantity || 0))));
      updateMenuModalPrice();
      return;
    }
    const eventTruck = event.target.closest('[data-event-truck]');
    if (eventTruck) {
      selectedTruckId = eventTruck.dataset.eventTruck;
      localStorage.setItem('ftnSelectedTruckV1', JSON.stringify({ truckId: selectedTruckId, selectedAt: Date.now() }));
      closeModal();
      renderCustomerPage('truckMenu');
      return;
    }
    const eventDirections = event.target.closest('[data-event-directions]');
    if (eventDirections) {
      const eventItem = EVENTS.find(item => item.id === eventDirections.dataset.eventDirections);
      if (eventItem) {
        const destination = Number.isFinite(eventItem.latitude) && Number.isFinite(eventItem.longitude)
          ? `${eventItem.latitude},${eventItem.longitude}`
          : eventItem.address;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank', 'noopener');
      }
      return;
    }
    const locationChoice = event.target.closest('[data-location-method]');
    if (locationChoice) {
      const method = locationChoice.dataset.locationMethod;
      document.getElementById('customerLocationMethod').value = method;
      modalContent.querySelectorAll('.location-choice').forEach(button => button.classList.toggle('active', button.dataset.locationMethod === method));
      document.getElementById('locationCityField').classList.toggle('hidden-view', method !== 'city');
      document.getElementById('locationZipField').classList.toggle('hidden-view', method !== 'zip');
      document.getElementById('customerLocationMessage').textContent = method === 'current' ? 'Tap Save to request location permission.' : '';
    }
    const reorder = event.target.closest('[data-reorder]');
    if (reorder) reorderMeal(reorder.dataset.reorder);
    const cancelOrder = event.target.closest('[data-cancel-order]');
    if (cancelOrder) cancelOrderModal(currentAccount.orders.find(order => String(order.id) === String(cancelOrder.dataset.cancelOrder)));
    const confirmCancelOrder = event.target.closest('[data-confirm-cancel-order]');
    if (confirmCancelOrder) {
      const selectedOrder = currentAccount.orders.find(order => String(order.id) === String(confirmCancelOrder.dataset.confirmCancelOrder));
      const resolution = confirmCancelOrder.dataset.cancelResolution;
      if (selectedOrder?.supabaseOrderId && resolution) {
        modalContent.querySelectorAll('[data-confirm-cancel-order]').forEach(button => { button.disabled = true; });
        const message = document.getElementById('cancelOrderMessage');
        if (message) message.textContent = resolution === 'vendor_credit' ? 'Creating your food truck credit…' : 'Requesting your Stripe refund…';
        try {
          const result = await window.FoodTrekNowCustomerPayments.cancelPaidOrder(selectedOrder.supabaseOrderId, resolution);
          closeModal();
          await hydrateLiveCustomerOrders();
          await hydrateVendorCredits();
          orderHistoryFilter = 'past';
          renderCustomerPage('orders');
          const creditAmount = Number(result?.cancellation?.total_credit_issued_cents || 0) / 100;
          const refundStatus = result?.refund?.status;
          customerToast(resolution === 'vendor_credit'
            ? `${customerMoney(creditAmount)} ${selectedOrder.truckName} credit is ready.`
            : refundStatus === 'succeeded' ? 'Stripe confirmed your refund.' : 'Your refund request is being processed.');
          return;
        } catch (error) {
          if (message) message.textContent = error.message || 'This order can no longer be cancelled.';
          modalContent.querySelectorAll('[data-confirm-cancel-order]').forEach(button => { button.disabled = false; });
          return;
        }
      }
      if (selectedOrder?.supabaseOrderId && !resolution) {
        try {
          await window.FoodTrekNowLiveOrders.cancelCustomerOrder(selectedOrder.supabaseOrderId);
        } catch (error) {
          closeModal();
          customerToast(error.message || 'This order can no longer be cancelled.');
          return;
        }
      }
      const order = CustomerOrderingService.cancelOrder(currentAccount, confirmCancelOrder.dataset.confirmCancelOrder);
      if (!order) {
        closeModal();
        customerToast('This order can no longer be cancelled automatically.');
        return;
      }
      if (!order.supabaseOrderId) syncCancelledOrderToVendor(order);
      lastPlacedOrderId = order.id;
      closeModal();
      orderHistoryFilter = 'past';
      renderCustomerPage('orders');
      customerToast(`${orderNumberLabel(order.id)} cancelled. Full refund: ${customerMoney(order.refund.amount)}.`);
    }
  });

  modalContent.addEventListener('change', event => {
    if (event.target.matches('[data-required-choice], [data-optional-choice], #menuItemDetailQuantity')) updateMenuModalPrice();
  });

  modalContent.addEventListener('input', event => {
    if (event.target.matches('[data-required-choice], [data-optional-choice], #menuItemDetailQuantity')) updateMenuModalPrice();
  });

  modalContent.addEventListener('submit', async event => {
    event.preventDefault();
    if (event.target.id === 'customerOrderMessageForm') {
      const order = currentAccount.orders.find(item => item.supabaseOrderId === event.target.dataset.orderMessageId);
      const input = document.getElementById('customerOrderMessage');
      const error = event.target.querySelector('[data-message-error]');
      const submit = event.target.querySelector?.('button[type="submit"]');
      if (!order || !input.value.trim()) return;
      submit.disabled = true;
      error.textContent = '';
      try {
        await window.FoodTrekNowLiveOrders.sendOrderMessage(order.supabaseOrderId, input.value, 'customer');
        input.value = '';
        await loadCustomerConversation(order);
        customerToast('Message sent to the food truck.');
      } catch (messageError) {
        error.textContent = messageError.message || 'Your message could not be sent.';
      } finally {
        submit.disabled = false;
      }
      return;
    }
    if (event.target.id === 'requiredMenuItemForm') {
      const item = menuForTruck().find(menuItem => menuItem.id === document.getElementById('requiredMenuItemId').value);
      const requiredChoices = selectedRequiredChoices();
      const choices = [...requiredChoices, ...selectedOptionalChoices()];
      if (item && requiredChoices.length === (item.requiredChoices?.length || 0) && addMenuItem(item, choices)) closeModal();
      return;
    }
    if (event.target.id === 'customerMenuItemDetailForm') {
      const item = menuForTruck().find(menuItem => menuItem.id === document.getElementById('menuItemDetailId').value);
      const requiredChoices = selectedRequiredChoices();
      const choices = [...requiredChoices, ...selectedOptionalChoices()];
      if (!item || requiredChoices.length !== (item.requiredChoices?.length || 0)) return;
      const quantity = document.getElementById('menuItemDetailQuantity').value;
      const instructions = document.getElementById('menuItemDetailInstructions')?.value || '';
      if (addMenuItem(item, choices, instructions, quantity)) closeModal();
      return;
    }
    if (event.target.id === 'customerCartItemNoteForm') {
      const item = currentAccount.cart.items.find(cartItem => cartItem.id === document.getElementById('cartNoteItemId').value);
      if (!item) return;
      item.instructions = document.getElementById('cartItemNote').value.trim();
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      closeModal();
      renderCustomerPage('cart');
      customerToast(item.instructions ? 'Item notes saved.' : 'Item notes removed.');
      return;
    }
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
      const submit = event.target.querySelector?.('button[type="submit"]');
      if (method === 'city' && !city) {
        message.textContent = 'Enter a city to save this location.';
        return;
      }
      if (method === 'zip' && !/^\d{5}(?:-\d{4})?$/.test(zip)) {
        message.textContent = 'Enter a valid 5-digit ZIP code.';
        return;
      }
      if (method === 'current') {
        message.textContent = 'Requesting your current location…';
        if (submit) submit.disabled = true;
        try {
          const position = await window.FoodTrekNowLocation.requestCurrentPosition();
          currentAccount.preferredLocation = {
            method: 'current',
            label: 'Current Location',
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            capturedAt: position.capturedAt
          };
        } catch (error) {
          message.textContent = error.message || 'FoodTrekNow could not access your current location.';
          if (submit) submit.disabled = false;
          return;
        }
      } else {
        currentAccount.preferredLocation = method === 'city' ? { method, city } : { method, zip };
      }
      persistCurrentAccount();
      closeModal();
      renderCustomerPage(currentPage === 'nearby' ? 'nearby' : 'overview');
      customerToast(method === 'current' ? 'Current location saved.' : 'Preferred location saved.');
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
    if (event.target.id === 'customerRecoveryPasswordForm') {
      const nextPassword = document.getElementById('recoveryCustomerPassword').value;
      const confirmPassword = document.getElementById('confirmRecoveryCustomerPassword').value;
      const message = document.getElementById('recoveryPasswordMessage');
      if (nextPassword.length < 8) {
        message.textContent = 'New password must be at least 8 characters.';
        return;
      }
      if (nextPassword !== confirmPassword) {
        message.textContent = 'New passwords do not match.';
        return;
      }
      try {
        currentAccount = await CustomerAuthService.updateRecoveredPassword(nextPassword);
        closeModal();
        if (currentAccount) openSelectedPortal(currentAccount);
        customerToast('Your password has been reset and verified.');
      } catch (error) {
        message.textContent = error.message;
      }
    }
    if (event.target.id === 'customerDeleteForm') {
      if (document.getElementById('deleteAccountConfirm').value !== 'DELETE') {
        document.getElementById('deleteAccountMessage').textContent = 'Type DELETE exactly to confirm.';
        return;
      }
      try {
        await CustomerAuthService.deleteAccount(currentAccount.id);
        clearSession();
        currentAccount = null;
        closeModal();
        showCustomerAuth();
        customerToast('Your account has been permanently deleted.');
      } catch (error) {
        document.getElementById('deleteAccountMessage').textContent = error.message;
      }
    }
  });

  if (window.addEventListener) {
    window.addEventListener('ftn:customer-orders-updated', refreshCustomerOrders);
    window.addEventListener('storage', event => {
      if (['ftnCustomerAccountsV1', 'ftnGuestCustomerV1'].includes(event.key)) refreshCustomerOrders();
    });
  }

  async function restoreCustomerSession() {
    if (localStorage.getItem('ftnVendorLoggedIn')) return;
    if (sessionStorage.getItem(GUEST_SESSION_KEY) === 'true') {
      openCustomerAccount(readGuestCustomer(), 'nearby');
      return;
    }
    if (CustomerAuthService.usesSupabase()) {
      try {
        const account = await CustomerAuthService.getCurrentAccount();
        if (account) {
          saveSession(account.id, true);
          openSelectedPortal(account);
        } else {
          clearSession();
        }
      } catch (error) {
        clearSession();
        showCustomerAuth('signin');
        document.getElementById('customerSignInMessage').textContent = error.message;
      }
      return;
    }
    const session = readSession();
    if (!session) return;
    const account = repository.findById(session.accountId);
    if (account) openSelectedPortal(account);
    else clearSession();
  }

  let passwordRecoveryHandled = false;
  function handlePasswordRecovery() {
    if (passwordRecoveryHandled) return;
    passwordRecoveryHandled = true;
    window.FoodTrekNowSupabaseRecoveryPending = false;
    clearSession();
    hidePrimaryViews();
    document.body.classList.remove('login-page');
    setTimeout(passwordRecoveryModal, 0);
  }

  CustomerAuthService.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') handlePasswordRecovery();
  });
  if (window.FoodTrekNowSupabaseRecoveryPending) handlePasswordRecovery();
  else restoreCustomerSession();
})();

