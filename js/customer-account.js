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
  let marketplaceLoadPromise = null;
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
  const orderNumberValue = value => {
    const match = String(value ?? '').match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  };
  const orderNumberLabel = value => `Order #${orderNumberValue(value) || escapeHtml(value)}`;
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

    async signOut() {}
  }

  const repository = new CustomerAccountRepository();

  function buildSupabaseAccount({ user, profile, existing }) {
    return {
      id: user.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      preferredName: profile.preferred_name || '',
      mobile: profile.mobile_number || '',
      email: user.email || existing?.email || '',
      photo: profile.profile_photo_url || '',
      role: profile.role || 'customer',
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
      : '';
    return window.FoodTrekNowSupabaseAuth.createAdapter({
      client: window.FoodTrekNowSupabaseClient,
      repository,
      buildAccount: buildSupabaseAccount,
      redirectUrl
    });
  }

  const CustomerAuthService = {
    adapter: createCustomerAuthAdapter(),
    setAdapter(adapter) { this.adapter = adapter; },
    usesSupabase() { return Boolean(this.adapter?.isSupabase); },
    signUp(input) { return this.adapter.signUp(input); },
    signIn(identifier, password) { return this.adapter.signIn(identifier, password); },
    getCurrentAccount() { return this.adapter.getCurrentAccount(); },
    requestPasswordReset(identifier) { return this.adapter.requestPasswordReset(identifier); },
    updateProfile(accountId, updates) { return this.adapter.updateProfile(accountId, updates); },
    changePassword(accountId, currentPassword, nextPassword) { return this.adapter.changePassword(accountId, currentPassword, nextPassword); },
    updateRecoveredPassword(nextPassword) { return this.adapter.updateRecoveredPassword?.(nextPassword); },
    deleteAccount(accountId) { return this.adapter.deleteAccount(accountId); },
    signOut() { return this.adapter.signOut(); },
    onAuthStateChange(callback) { return this.adapter.onAuthStateChange?.(callback); }
  };
  window.FoodTrekNowCustomerAuth = CustomerAuthService;

  function saveCustomerState(account) {
    if (!account) return account;
    if (account.isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(account));
      return account;
    }
    return repository.save(account);
  }

  function readGuestCustomer() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || 'null'); } catch {}
    return {
      id: 'guest-local',
      isGuest: true,
      firstName: saved?.firstName || 'Guest',
      lastName: saved?.lastName || '',
      preferredName: saved?.preferredName || 'Guest',
      mobile: saved?.mobile || '',
      email: saved?.email || '',
      photo: '',
      emailVerified: true,
      verificationDismissed: true,
      addresses: saved?.addresses || [],
      favoriteTrucks: saved?.favoriteTrucks || [],
      favoriteOrders: saved?.favoriteOrders || [],
      paymentMethods: saved?.paymentMethods || [],
      orders: saved?.orders || [],
      preferredLocation: saved?.preferredLocation || null,
      nearbyRadiusMiles: Number(saved?.nearbyRadiusMiles) || 5,
      cart: saved?.cart || { truckId: null, items: [] },
      preferences: saved?.preferences || defaultPreferences(),
      createdAt: saved?.createdAt || new Date().toISOString()
    };
  }

  const SAMPLE_LOCATION_CENTERS = {
    raleigh: { latitude: 35.7796, longitude: -78.6382 },
    cary: { latitude: 35.7915, longitude: -78.7811 },
    durham: { latitude: 35.994, longitude: -78.8986 }
  };

  function resolveSampleCustomerLocation(savedLocation) {
    const location = savedLocation || { method: 'current', label: 'Location not set' };
    if (location.method === 'current' && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))) {
      return { latitude: Number(location.latitude), longitude: Number(location.longitude), label: location.label || 'Current Location', hasLocation: true };
    }
    if (location.method === 'city') {
      const city = String(location.city || '').toLowerCase();
      const center = city.includes('durham') ? SAMPLE_LOCATION_CENTERS.durham : city.includes('cary') ? SAMPLE_LOCATION_CENTERS.cary : SAMPLE_LOCATION_CENTERS.raleigh;
      return { ...center, label: location.city || 'Saved City', hasLocation: true };
    }
    if (location.method === 'zip') {
      const zip = String(location.zip || '');
      const center = zip.startsWith('277') ? SAMPLE_LOCATION_CENTERS.durham : zip.startsWith('27513') ? SAMPLE_LOCATION_CENTERS.cary : SAMPLE_LOCATION_CENTERS.raleigh;
      return { ...center, label: `ZIP ${zip}`, hasLocation: true };
    }
    return { ...SAMPLE_LOCATION_CENTERS.raleigh, label: 'Location not set', hasLocation: false };
  }

  function distanceInMiles(origin, destination) {
    const toRadians = degrees => degrees * Math.PI / 180;
    const earthRadiusMiles = 3958.8;
    const latitudeChange = toRadians(destination.latitude - origin.latitude);
    const longitudeChange = toRadians(destination.longitude - origin.longitude);
    const a = Math.sin(latitudeChange / 2) ** 2
      + Math.cos(toRadians(origin.latitude)) * Math.cos(toRadians(destination.latitude)) * Math.sin(longitudeChange / 2) ** 2;
    return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function timeInMinutes(time) {
    const match = String(time).match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
    if (!match) return 0;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function operatingStatus(truck, date) {
    const nowMinutes = date.getHours() * 60 + date.getMinutes();
    if (nowMinutes < timeInMinutes(truck.opensAt)) return `Opens today at ${truck.opensAt}`;
    if (nowMinutes < timeInMinutes(truck.closesAt)) return `Open · Closes ${truck.closesAt}`;
    return `Closed · Closed at ${truck.closesAt}`;
  }

  class LocalTruckDataAdapter {
    searchNearby({ location, radiusMiles, date = new Date() }) {
      const canMeasureDistance = location?.hasLocation !== false;
      return TRUCKS
        .filter(truck => truck.operatingDays.includes(date.getDay()))
        .map(truck => {
          const distance = distanceInMiles(location, truck);
          return {
            ...truck,
            distance,
            distanceLabel: canMeasureDistance ? `${distance.toFixed(1)} mi` : 'Enable location',
            driveTime: canMeasureDistance ? `${Math.max(4, Math.round(distance * 2.2))} min drive` : 'Location needed',
            operatingStatus: operatingStatus(truck, date),
            pickupLabel: `About ${truck.pickupMinutes} min`
          };
        })
        .filter(truck => !canMeasureDistance || truck.distance <= radiusMiles)
        .sort((first, second) => {
          if (!canMeasureDistance && first.liveLocation !== second.liveLocation) return first.liveLocation ? -1 : 1;
          return first.distance - second.distance;
        });
    }
  }

  // Truck data boundary: replace this local adapter with a Supabase-backed
  // adapter in a future phase without changing the nearby-truck screen.
  const TruckDataService = {
    adapter: new LocalTruckDataAdapter(),
    setAdapter(adapter) { this.adapter = adapter; },
    searchNearby(query) { return this.adapter.searchNearby(query); }
  };
  window.FoodTrekNowTruckData = TruckDataService;

  class LocalCustomerOrderingAdapter {
    ensureState(account) {
      if (!account.cart || !Array.isArray(account.cart.items)) account.cart = { truckId: null, items: [] };
      if (account.cart.truckId && account.cart.items.length) {
        const drinkItemIds = new Set(
          menuForTruck(account.cart.truckId)
            .filter(item => item.category === 'Drinks')
            .map(item => item.id)
        );
        const migratedItems = new Map();
        account.cart.items.forEach(item => {
          const migratedItem = {
            ...item,
            modifiers: drinkItemIds.has(item.menuItemId)
              ? (item.modifiers || []).filter(modifier => !String(modifier.group || '').toLowerCase().includes('size'))
              : (item.modifiers || [])
          };
          const signature = [
            migratedItem.menuItemId,
            migratedItem.modifiers.map(modifier => `${modifier.group}:${modifier.name}`).sort().join('|'),
            migratedItem.instructions || ''
          ].join('::');
          const existing = migratedItems.get(signature);
          if (existing) {
            existing.quantity = Math.min(99, Number(existing.quantity || 0) + Number(migratedItem.quantity || 0));
            existing.qty = existing.quantity;
          } else {
            migratedItems.set(signature, migratedItem);
          }
        });
        account.cart.items = [...migratedItems.values()];
      }
      account.orders = (account.orders || []).map(order => {
        if (!Object.prototype.hasOwnProperty.call(order, 'pickupNumber')) return order;
        const { pickupNumber, ...standardOrder } = order;
        return standardOrder;
      });
      if (account.cart.items.length && !account.cart.orderNumber) account.cart.orderNumber = generateOrderNumber();
      if (!Number.isFinite(Number(account.nearbyRadiusMiles))) account.nearbyRadiusMiles = 5;
      saveCustomerState(account);
      return account;
    }

    saveCart(account, cart) {
      account.cart = cart;
      saveCustomerState(account);
      return cart;
    }

    placeOrder(account, order) {
      account.orders.unshift(order);
      account.cart = { truckId: null, items: [] };
      saveCustomerState(account);
      return order;
    }

    cancelOrder(account, orderId) {
      const order = account.orders.find(item => String(item.id) === String(orderId));
      if (!order || !['received', 'new'].includes(order.status)) return null;
      order.status = 'cancelled';
      order.statusLabel = 'Cancelled · Full Refund';
      order.cancelledAt = Date.now();
      order.refund = {
        status: 'refunded',
        amount: Number(order.total || 0),
        processedAt: order.cancelledAt,
        method: order.paymentLabel || 'Original payment method'
      };
      saveCustomerState(account);
      return order;
    }
  }

  // Ordering boundary: a future Supabase adapter can replace these local
  // mutations while the profile, menu, cart, checkout, and tracking UI remains.
  const CustomerOrderingService = {
    adapter: new LocalCustomerOrderingAdapter(),
    setAdapter(adapter) { this.adapter = adapter; },
    ensureState(account) { return this.adapter.ensureState(account); },
    saveCart(account, cart) { return this.adapter.saveCart(account, cart); },
    placeOrder(account, order) { return this.adapter.placeOrder(account, order); },
    cancelOrder(account, orderId) { return this.adapter.cancelOrder(account, orderId); }
  };
  window.FoodTrekNowOrdering = CustomerOrderingService;

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
  let selectedTruckId = TRUCK.id;
  let lastPlacedOrderId = null;
  let vendorCreditsByTruck = new Map();
  let customerNotifications = [];
  let customerCommunicationsSubscribed = false;
  let customerMarketplaceSubscribed = false;
  let customerMarketplaceRefreshTimer = null;

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
    clearInterval(customerMarketplaceRefreshTimer);
    customerMarketplaceRefreshTimer = null;
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

  function startGuestCheckout(page = 'nearby') {
    clearSession();
    sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
    openCustomerAccount(readGuestCustomer(), page);
    customerToast('Guest checkout is ready. Choose a nearby truck to begin.');
  }

  function openCustomerAccount(account, page = 'overview') {
    currentAccount = CustomerOrderingService.ensureState(account);
    let savedTruck = null;
    try { savedTruck = JSON.parse(localStorage.getItem('ftnSelectedTruckV1') || 'null'); } catch {}
    if (savedTruck?.truckId && TRUCKS.some(truck => truck.id === savedTruck.truckId)) selectedTruckId = savedTruck.truckId;
    currentPage = page;
    hidePrimaryViews();
    accountView.classList.remove('hidden-view');
    accountView.classList.toggle('guest-session', Boolean(currentAccount.isGuest));
    document.body.classList.remove('login-page');
    renderCustomerShell();
    renderCustomerPage(page);
    refreshCustomerMarketplace();
    if (!customerMarketplaceSubscribed && window.FoodTrekNowCustomerMarketplace?.subscribeLocations) {
      window.FoodTrekNowCustomerMarketplace.subscribeLocations(() => refreshCustomerMarketplace(true));
      customerMarketplaceSubscribed = true;
    }
    clearInterval(customerMarketplaceRefreshTimer);
    customerMarketplaceRefreshTimer = setInterval(() => {
      if (currentAccount && !accountView.classList.contains('hidden-view')) refreshCustomerMarketplace(true);
    }, 60000);
    hydrateLiveCustomerOrders();
    hydrateCustomerCommunications();
    hydrateVendorCredits();
    handleStripeCheckoutReturn();
    window.scrollTo(0, 0);
  }

  let checkoutReturnInProgress = false;

  async function hydrateVendorCredits() {
    if (!currentAccount || currentAccount.isGuest || !window.FoodTrekNowCustomerPayments?.available) return;
    try {
      const credits = await window.FoodTrekNowCustomerPayments.loadVendorCredits();
      vendorCreditsByTruck = new Map(credits.map(credit => [credit.truck_id, Number(credit.balance_cents || 0)]));
      if (['checkout', 'payments'].includes(currentPage)) renderCustomerPage(currentPage);
    } catch {}
  }

  async function handleStripeCheckoutReturn() {
    if (checkoutReturnInProgress || !currentAccount || currentAccount.isGuest || !window.location?.href) return;
    const url = new URL(window.location.href);
    const checkoutResult = url.searchParams.get('checkout');
    if (!checkoutResult) return;
    checkoutReturnInProgress = true;
    try {
      if (checkoutResult === 'cancelled') {
        const draftId = url.searchParams.get('draft_id');
        if (draftId) await window.FoodTrekNowCustomerPayments?.cancelCheckout(draftId);
        renderCustomerPage('cart');
        customerToast('Stripe Checkout was closed. Your cart is still here.');
        return;
      }
      const sessionId = url.searchParams.get('session_id') || '';
      if (checkoutResult !== 'success' || !sessionId) return;
      customerToast('Confirming your Stripe payment…');
      const result = await window.FoodTrekNowCustomerPayments?.completeCheckout(sessionId);
      if (!result?.order?.order_number) throw new Error('Your paid order could not be loaded.');
      currentAccount.cart = { truckId: null, items: [] };
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      await hydrateLiveCustomerOrders();
      lastPlacedOrderId = Number(result.order.order_number);
      renderCustomerPage('confirmation');
      customerToast(`${orderNumberLabel(lastPlacedOrderId)} was paid and sent to the truck.`);
    } catch (error) {
      renderCustomerPage('orders');
      customerToast(error.message || 'We could not confirm the payment yet. Check Order History in a moment.');
    } finally {
      url.searchParams.delete('checkout');
      url.searchParams.delete('session_id');
      url.searchParams.delete('draft_id');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      checkoutReturnInProgress = false;
    }
  }

  function displayMarketplaceTime(value, fallback) {
    if (!value) return fallback;
    const [hourValue, minute = '00'] = String(value).split(':');
    const hour = Number(hourValue);
    if (!Number.isFinite(hour)) return fallback;
    return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  async function refreshCustomerMarketplace(force = false) {
    const service = window.FoodTrekNowCustomerMarketplace;
    if (!service?.available) return;
    if (force) marketplaceLoadPromise = null;
    if (!marketplaceLoadPromise) marketplaceLoadPromise = service.load();
    try {
      const marketplace = await marketplaceLoadPromise;
      const sampleTrucks = TRUCKS.filter(truck => !remoteTruckIds.has(truck.id));
      TRUCKS.splice(0, TRUCKS.length, ...sampleTrucks);
      remoteTruckIds = new Set(marketplace.map(truck => truck.id));
      marketplace.forEach((truck, index) => {
        const openHours = truck.hours.filter(row => !row.is_closed);
        const todayHours = truck.hours.find(row => row.day_of_week === new Date().getDay());
        const fallbackLocation = resolveSampleCustomerLocation(currentAccount?.preferredLocation);
        const liveLocation = truck.live_location;
        TRUCKS.push({
          id: truck.id,
          name: truck.name,
          cuisine: truck.cuisine || 'Food Truck',
          description: truck.description || '',
          status: truck.accepting_orders ? 'Open now' : 'Not accepting orders',
          wait: `${truck.estimated_prep_minutes || 20} min`,
          icon: '🚚',
          logo: truck.logo_url || '',
          latitude: Number(liveLocation?.latitude) || Number(truck.latitude) || fallbackLocation.latitude + (index + 1) * 0.002,
          longitude: Number(liveLocation?.longitude) || Number(truck.longitude) || fallbackLocation.longitude + (index + 1) * 0.002,
          liveLocation: Boolean(liveLocation),
          locationAccuracyMeters: liveLocation?.accuracy_meters == null ? null : Number(liveLocation.accuracy_meters),
          locationUpdatedAt: liveLocation?.recorded_at || null,
          // The vendor's live Online toggle is an explicit override of the
          // saved weekly schedule. Keep an online truck discoverable even if
          // today's recurring hours are marked closed.
          operatingDays: truck.accepting_orders
            ? [0, 1, 2, 3, 4, 5, 6]
            : openHours.length ? openHours.map(row => row.day_of_week) : [0, 1, 2, 3, 4, 5, 6],
          opensAt: displayMarketplaceTime(todayHours?.opens_at, '11:00 AM'),
          closesAt: displayMarketplaceTime(todayHours?.closes_at, '8:00 PM'),
          pickupMinutes: Number(truck.estimated_prep_minutes) || 20,
          currentEvent: truck.location_name || '',
          acceptingOrders: Boolean(truck.accepting_orders),
          pickupInstructions: truck.pickup_instructions || '',
          minimumOrder: Number(truck.minimum_order) || 0,
          taxRate: Number(truck.tax_rate) || 0,
          supabase: true
        });
        TRUCK_MENUS[truck.id] = truck.menu.map(item => ({
          id: item.id,
          menuItemId: item.id,
          truckId: truck.id,
          category: item.category_name,
          name: item.name,
          description: item.description || '',
          price: Number(item.price),
          calories: null,
          available: !item.is_sold_out,
          icon: customerMenuIcon(item.category_name),
          image: item.photo_url || '',
          featured: Boolean(item.is_featured),
          special: false,
          popular: Boolean(item.is_featured)
        }));
      });
      try {
        const savedTruck = JSON.parse(localStorage.getItem('ftnSelectedTruckV1') || 'null');
        if (savedTruck?.truckId && TRUCKS.some(truck => truck.id === savedTruck.truckId)) selectedTruckId = savedTruck.truckId;
      } catch {}
      if (currentAccount && !accountView.classList.contains('hidden-view')) renderCustomerPage(currentPage);
    } catch (error) {
      marketplaceLoadPromise = null;
      customerToast(`Live trucks could not be loaded: ${error.message}`);
    }
  }

  function databaseStatusForCustomer(status) {
    return {
      received: { status: 'received', statusLabel: 'Order Received' },
      preparing: { status: 'preparing', statusLabel: 'Preparing' },
      ready: { status: 'ready', statusLabel: 'Ready for Pickup' },
      picked_up: { status: 'completed', statusLabel: 'Picked Up' },
      cancelled: { status: 'cancelled', statusLabel: 'Cancelled · Full Refund' }
    }[status] || { status, statusLabel: status };
  }

  function databaseOrderToCustomerOrder(row) {
    const mappedStatus = databaseStatusForCustomer(row.status);
    const prepMinutes = Number(row.trucks?.estimated_prep_minutes) || 20;
    return {
      id: row.order_number,
      supabaseOrderId: row.id,
      truckId: row.truck_id,
      truckName: row.trucks?.name || 'Food Truck',
      ...mappedStatus,
      statusLabel: row.status === 'cancelled'
        ? row.cancellation_resolution === 'vendor_credit' ? 'Cancelled · Food Truck Credit' : row.refund_status === 'succeeded' ? 'Cancelled · Refunded' : 'Cancelled · Refund Pending'
        : mappedStatus.statusLabel,
      createdAt: Date.parse(row.created_at),
      estimatedReadyAt: Date.parse(row.created_at) + prepMinutes * 60 * 1000,
      pickupInstructions: row.trucks?.pickup_instructions || `Show Order #${row.order_number} at the truck window.`,
      items: (row.order_items || []).map(item => ({
        id: item.id,
        menuItemId: item.menu_item_id,
        name: item.item_name,
        icon: customerMenuIcon('Entrees'),
        basePrice: Number(item.unit_price),
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
        qty: Number(item.quantity),
        modifiers: item.modifiers || [],
        instructions: item.special_instructions || ''
      })),
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      serviceFee: Number(row.service_fee),
      total: Number(row.total),
      paymentLabel: row.payment_label || 'Pay at Pickup',
      vendorCreditApplied: Number(row.vendor_credit_applied_cents || 0) / 100,
      refundStatus: row.refund_status || 'none',
      cancellationResolution: row.cancellation_resolution || null,
      orderNotes: row.order_notes || '',
      acceptedAt: row.preparing_at ? Date.parse(row.preparing_at) : null,
      readyAt: row.ready_at ? Date.parse(row.ready_at) : null,
      completedAt: row.picked_up_at ? Date.parse(row.picked_up_at) : null,
      cancelledAt: row.cancelled_at ? Date.parse(row.cancelled_at) : null,
      refund: row.status === 'cancelled' ? {
        status: row.refund_status || (row.cancellation_resolution === 'vendor_credit' ? 'credited' : 'pending'),
        amount: row.cancellation_resolution === 'vendor_credit' ? Number(row.total) : Number(row.refunded_amount_cents || 0) / 100,
        processedAt: Date.parse(row.cancelled_at || row.updated_at),
        method: row.cancellation_resolution === 'vendor_credit' ? `${row.trucks?.name || 'Food truck'} credit` : 'Original Stripe payment'
      } : null
    };
  }

  async function hydrateLiveCustomerOrders(announce = false) {
    const service = window.FoodTrekNowLiveOrders;
    if (!currentAccount || currentAccount.isGuest || !service?.available) return;
    try {
      const remoteRows = await service.loadCustomerOrders();
      const previousStatuses = new Map((currentAccount.orders || []).filter(order => order.supabaseOrderId).map(order => [order.supabaseOrderId, order.status]));
      const localOrders = (currentAccount.orders || []).filter(order => !order.supabaseOrderId);
      const remoteOrders = remoteRows.map(databaseOrderToCustomerOrder);
      currentAccount.orders = [...remoteOrders, ...localOrders].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      saveCustomerState(currentAccount);
      if (!accountView.classList.contains('hidden-view')) {
        renderCustomerShell();
        renderCustomerPage(currentPage);
      }
      if (announce && remoteOrders.some(order => previousStatuses.has(order.supabaseOrderId) && previousStatuses.get(order.supabaseOrderId) !== order.status)) customerToast('Your order status was updated.');
      service.subscribeCustomer(currentAccount.id, () => hydrateLiveCustomerOrders(true));
    } catch (error) {
      customerToast(`Order updates could not be loaded: ${error.message}`);
    }
  }

  function updateCustomerNotificationBadge() {
    const unreadCount = customerNotifications.filter(notification => !notification.is_read).length;
    document.querySelectorAll('[data-customer-notification-count]').forEach(badge => {
      badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      badge.classList.toggle('hidden-view', unreadCount === 0);
    });
  }

  async function hydrateCustomerCommunications(announce = false) {
    const service = window.FoodTrekNowLiveOrders;
    if (!currentAccount || currentAccount.isGuest || !service?.available) return;
    try {
      const previousIds = new Set(customerNotifications.map(notification => notification.id));
      customerNotifications = await service.loadCustomerNotifications();
      updateCustomerNotificationBadge();
      if (currentPage === 'notifications' && !accountView.classList.contains('hidden-view')) renderCustomerPage('notifications');
      if (announce && customerNotifications.some(notification => !previousIds.has(notification.id))) customerToast('You have a new order update.');
      if (!customerCommunicationsSubscribed) {
        service.subscribeCustomerCommunications(currentAccount.id, () => hydrateCustomerCommunications(true));
        customerCommunicationsSubscribed = true;
      }
    } catch (error) {
      customerToast(`Notifications could not be loaded: ${error.message}`);
    }
  }

  async function markCustomerNotificationsRead(notificationIds = null) {
    const service = window.FoodTrekNowLiveOrders;
    if (!service?.available || currentAccount?.isGuest) return;
    try {
      await service.markCustomerNotificationsRead(notificationIds);
      const selectedIds = notificationIds ? new Set(notificationIds) : null;
      customerNotifications.forEach(notification => {
        if (!selectedIds || selectedIds.has(notification.id)) notification.is_read = true;
      });
      updateCustomerNotificationBadge();
    } catch (error) {
      customerToast(`Notifications could not be updated: ${error.message}`);
    }
  }

  function persistCurrentAccount() {
    if (currentAccount) saveCustomerState(currentAccount);
  }

  function refreshCustomerOrders() {
    if (!currentAccount) return;
    const refreshed = currentAccount.isGuest ? readGuestCustomer() : repository.findById(currentAccount.id);
    if (!refreshed) return;
    currentAccount = CustomerOrderingService.ensureState(refreshed);
    if (!accountView.classList.contains('hidden-view')) {
      renderCustomerShell();
      renderCustomerPage(currentPage);
    }
  }

  function customerToast(message) {
    const toast = document.getElementById('customerToast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.ftnCustomerToast);
    window.ftnCustomerToast = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function updateCartBadge() {
    const count = currentAccount?.cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;
    document.querySelectorAll('[data-customer-cart-count]').forEach(badge => {
      badge.textContent = String(count);
      badge.classList.toggle('hidden-view', count === 0);
    });
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
    document.getElementById('customerMiniProfile').innerHTML = `${avatarMarkup(currentAccount)}<div><strong>${escapeHtml(name)} ${escapeHtml(currentAccount.lastName)}</strong><small>${currentAccount.isGuest ? 'Guest checkout · Saved on this device' : escapeHtml(currentAccount.email)}</small></div>`;
    document.getElementById('customerVerificationBanner').classList.toggle('hidden-view', currentAccount.emailVerified || currentAccount.verificationDismissed);
    document.getElementById('customerSignOutButton').textContent = currentAccount.isGuest ? 'Exit Guest Checkout' : 'Sign Out';
    document.getElementById('vendorApplicationNav').classList.toggle('hidden-view', Boolean(currentAccount.isGuest) || currentAccount.role === 'admin');
    document.getElementById('adminVendorReviewNav').classList.toggle('hidden-view', currentAccount.role !== 'admin');
    document.querySelectorAll('.customer-nav-link').forEach(button => button.classList.toggle('active', button.dataset.customerPage === currentPage));
    updateCartBadge();
    updateCustomerNotificationBadge();
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
    if (!location) return 'Location not set';
    if (location.method === 'city') return location.city;
    if (location.method === 'zip') return `ZIP ${location.zip}`;
    return location.label || 'Current Location';
  }

  function selectedNearbyRadius() {
    const savedRadius = Number(currentAccount.nearbyRadiusMiles);
    return NEARBY_RADIUS_OPTIONS.includes(savedRadius) ? savedRadius : 5;
  }

  function customerCanOrderTruck(truck) {
    return truck?.acceptingOrders !== false && !(currentAccount?.isGuest && truck?.supabase);
  }

  function liveLocationAgeLabel(truck) {
    if (!truck?.liveLocation || !truck.locationUpdatedAt) return '';
    const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(truck.locationUpdatedAt)) / 1000));
    if (ageSeconds < 60) return 'Live now';
    return `Updated ${Math.max(1, Math.round(ageSeconds / 60))} min ago`;
  }

  function nearbyMapPin(truck, index, origin, radius) {
    const latitudeMiles = (Number(truck.latitude) - Number(origin.latitude)) * 69;
    const longitudeMiles = (Number(truck.longitude) - Number(origin.longitude)) * 69 * Math.cos(Number(origin.latitude) * Math.PI / 180);
    const left = Math.max(8, Math.min(92, 50 + longitudeMiles / radius * 40));
    const top = Math.max(8, Math.min(92, 50 - latitudeMiles / radius * 40));
    return `<span class="nearby-map-pin ${truck.liveLocation ? 'live' : ''}" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%" title="${escapeHtml(truck.name)} · ${escapeHtml(liveLocationAgeLabel(truck) || truck.distanceLabel)}" aria-label="${escapeHtml(truck.name)} map marker">${index + 1}</span>`;
  }

  function nearbyTruckCard(truck) {
    const canOrder = customerCanOrderTruck(truck);
    const orderLabel = currentAccount?.isGuest && truck.supabase ? 'Sign In to Order' : truck.acceptingOrders === false ? 'Currently Closed' : 'Order Now';
    return `<article class="nearby-truck-card" data-open-truck-profile="${truck.id}">
      <div class="nearby-truck-logo" aria-hidden="true">${truck.icon || '🚚'}</div>
      <div class="nearby-truck-main">
        <div class="nearby-truck-heading"><div><p>${escapeHtml(truck.cuisine)}</p><h2>${escapeHtml(truck.name)}</h2>${truck.liveLocation ? `<span class="nearby-live-location">● ${escapeHtml(liveLocationAgeLabel(truck))}</span>` : ''}</div><span class="nearby-distance">${escapeHtml(truck.distanceLabel)}</span></div>
        <div class="nearby-truck-details">
          <span><small>Drive time</small><strong>🚗 ${escapeHtml(truck.driveTime)}</strong></span>
          <span><small>Hours today</small><strong>${escapeHtml(truck.operatingStatus)}</strong></span>
          <span><small>Estimated pickup</small><strong>⏱ ${escapeHtml(truck.pickupLabel)}</strong></span>
        </div>
        ${truck.currentEvent ? `<div class="nearby-event-note"><span aria-hidden="true">🎪</span><div><small>Current Event</small><strong>${escapeHtml(truck.currentEvent)}</strong></div></div>` : ''}
      </div>
      <div class="nearby-truck-actions">
        <button class="primary-button" data-nearby-order="${truck.id}" type="button" ${canOrder ? '' : 'disabled'}>${orderLabel}</button>
        <button class="secondary-button" data-nearby-directions="${truck.id}" type="button">Directions</button>
      </div>
    </article>`;
  }

  function renderNearbyTrucks() {
    const radius = selectedNearbyRadius();
    const location = resolveSampleCustomerLocation(currentAccount.preferredLocation);
    const hasLocation = location.hasLocation !== false;
    const trucks = TruckDataService.searchNearby({ location, radiusMiles: radius });
    const radiusOptions = NEARBY_RADIUS_OPTIONS.map(option => `<option value="${option}" ${option === radius ? 'selected' : ''}>${option}</option>`).join('');
    const pins = trucks.slice(0, 5).map((truck, index) => nearbyMapPin(truck, index, location, radius)).join('');
    const liveTruckCount = trucks.filter(truck => truck.liveLocation).length;
    return `<div class="nearby-search-page">
      ${pageHeader('Explore Nearby', 'Find Food Trucks Near Your Location', hasLocation ? `Using ${escapeHtml(preferredLocationLabel())}` : 'Showing active trucks — enable location for distances', '<button class="secondary-button" data-home-page="overview" type="button">← Back to Home</button>')}
      <section class="nearby-search-controls" aria-label="Nearby truck search controls">
        <div><span class="nearby-location-icon" aria-hidden="true">📍</span><span><small>Searching near</small><strong>${escapeHtml(location.label)}</strong></span><button data-customer-action="change-location" type="button">Change Location</button></div>
        <label for="nearbyRadiusSelect"><span>${hasLocation ? 'Showing Trucks Within:' : 'Distance filter:'}</span><span class="nearby-radius-input"><select id="nearbyRadiusSelect" data-nearby-radius aria-label="Search radius in miles" ${hasLocation ? '' : 'disabled'}>${radiusOptions}</select><strong>${hasLocation ? 'Miles' : 'Enable location'}</strong></span></label>
      </section>

      <div class="nearby-search-layout">
        <aside id="nearbyMapContainer" class="nearby-map-shell" data-map-provider="foodtreknow-live" data-map-ready="true" aria-label="Live truck map">
          <div class="nearby-map-heading"><strong>Live Truck Map</strong><span>Updates automatically while vendors share</span></div>
          <div class="nearby-map-canvas">
            <div class="nearby-map-road road-one"></div><div class="nearby-map-road road-two"></div><div class="nearby-map-road road-three"></div>
            ${pins}
            <div class="nearby-map-center" title="${hasLocation ? 'Your saved location' : 'Set your location'}"><span>📍</span><strong>${hasLocation ? 'You' : 'Set location'}</strong></div>
          </div>
          <div class="nearby-map-footer"><span>${trucks.length} truck${trucks.length === 1 ? '' : 's'} shown · ${liveTruckCount} live</span><span>${hasLocation ? `${radius}-mile radius` : 'All active trucks'}</span></div>
        </aside>

        <section class="nearby-results" aria-live="polite">
          <div class="nearby-results-heading"><div><p class="eyebrow">${hasLocation ? 'Nearest First' : 'Active Trucks'}</p><h2>${trucks.length} truck${trucks.length === 1 ? '' : 's'} operating today</h2></div><span>${hasLocation ? `Within ${radius} miles` : 'Enable location to sort by distance'}</span></div>
          <div class="nearby-truck-list">${trucks.length ? trucks.map(nearbyTruckCard).join('') : `<div class="customer-card nearby-empty-state"><span>🚚</span><h2>${hasLocation ? `No operating trucks within ${radius} miles` : 'No active trucks are available right now'}</h2><p>${hasLocation ? 'Increase your search radius to see more food trucks.' : 'Check back soon or enable location to search another area.'}</p></div>`}</div>
        </section>
      </div>
    </div>`;
  }

  function selectedTruck() {
    return TRUCKS.find(truck => truck.id === selectedTruckId) || TRUCK;
  }

  function readVendorMenu() {
    try {
      const savedMenu = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY));
      return Array.isArray(savedMenu) ? savedMenu : defaultMenu;
    } catch {
      return defaultMenu;
    }
  }

  function customerMenuCategory(category) {
    const value = String(category || '').toLowerCase();
    if (value.includes('side')) return 'Sides';
    if (value.includes('drink') || value.includes('beverage')) return 'Drinks';
    if (value.includes('dessert') || value.includes('sweet')) return 'Desserts';
    if (value.includes('app') || value.includes('nacho')) return 'Appetizers';
    return 'Entrees';
  }

  function customerMenuIcon(category) {
    return { Appetizers: '🥨', Entrees: '🍽️', Sides: '🍟', Desserts: '🍰', Drinks: '🥤' }[category] || '🍽️';
  }

  function ensureMinimumDrinkOptions(menu, truckId) {
    const completeMenu = menu.map(item => ({ ...item, truckId }));
    const existingDrinkNames = new Set(
      completeMenu
        .filter(item => item.category === 'Drinks')
        .map(item => item.name.trim().toLowerCase())
    );
    let drinkCount = existingDrinkNames.size;
    for (const drink of STANDARD_DRINK_OPTIONS) {
      if (drinkCount >= 5) break;
      if (existingDrinkNames.has(drink.name.toLowerCase())) continue;
      completeMenu.push({
        id: `${truckId}-drink-${drink.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        truckId,
        category: 'Drinks',
        name: drink.name,
        description: drink.description,
        price: drink.price,
        calories: null,
        available: true,
        icon: drink.icon,
        featured: false,
        special: false,
        popular: false
      });
      existingDrinkNames.add(drink.name.toLowerCase());
      drinkCount += 1;
    }
    return completeMenu;
  }

  function menuForTruck(truckId = selectedTruck().id) {
    const liveTruck = TRUCKS.find(truck => truck.id === truckId && truck.supabase);
    if (liveTruck) return (TRUCK_MENUS[truckId] || []).map(item => ({ ...item }));
    const baseMenu = ORDERING_MENU_ITEMS.map(item => ({ ...item, truckId }));
    if (truckId !== TRUCK.id) {
      const cuisineMenu = [
        ...(TRUCK_MENUS[truckId] || []),
        ...(TRUCK_ENTREE_EXTRAS[truckId] || []),
        ...(TRUCK_ADDITIONAL_ENTREES[truckId] || []),
        ...(TRUCK_MENU_EXTRAS[truckId] || [])
      ];
      return ensureMinimumDrinkOptions(cuisineMenu.length ? cuisineMenu : ORDERING_MENU_ITEMS, truckId);
    }

    const vendorMenu = readVendorMenu();
    const vendorItemsByCustomerId = new Map(
      vendorMenu
        .filter(item => VENDOR_MENU_ITEM_MAP.has(Number(item.id)))
        .map(item => [VENDOR_MENU_ITEM_MAP.get(Number(item.id)), item])
    );
    const connectedMenu = baseMenu.map(item => {
      const vendorItem = vendorItemsByCustomerId.get(item.id);
      if (!vendorItem) return item;
      return {
        ...item,
        vendorMenuItemId: vendorItem.id,
        name: vendorItem.name || item.name,
        category: customerMenuCategory(vendorItem.category || item.category),
        available: vendorItem.available !== false,
        price: Number(vendorItem.price ?? item.price),
        description: vendorItem.description || item.description,
        image: vendorItem.image || item.image || ''
      };
    });
    const mappedVendorIds = new Set(VENDOR_MENU_ITEM_MAP.keys());
    const vendorOnlyItems = vendorMenu
      .filter(item => !mappedVendorIds.has(Number(item.id)))
      .map(item => {
        const category = customerMenuCategory(item.category);
        return {
          id: `vendor-${item.id}`,
          vendorMenuItemId: item.id,
          truckId,
          category,
          name: item.name,
          description: item.description || '',
          price: Number(item.price || 0),
          calories: null,
          available: item.available !== false,
          icon: customerMenuIcon(category),
          image: item.image || '',
          featured: Boolean(item.featured),
          special: false,
          popular: false
        };
      });
    return ensureMinimumDrinkOptions([...connectedMenu, ...vendorOnlyItems], truckId);
  }

  function truckExperienceDetails(truck) {
    const location = resolveSampleCustomerLocation(currentAccount.preferredLocation);
    const distance = distanceInMiles(location, truck);
    const today = new Date();
    const operatingToday = truck.operatingDays.includes(today.getDay());
    const ratingOffset = Math.max(0, TRUCKS.findIndex(item => item.id === truck.id));
    return {
      distance,
      distanceLabel: `${distance.toFixed(1)} mi away`,
      driveTime: `${Math.max(4, Math.round(distance * 2.2))} min drive`,
      status: operatingToday ? operatingStatus(truck, today) : 'Closed · Not operating today',
      rating: (4.9 - ratingOffset * 0.1).toFixed(1),
      reviews: 128 + ratingOffset * 37
    };
  }

  function orderingItemCard(item, compact = false) {
    const cartQuantity = currentAccount.cart.truckId === selectedTruckId
      ? currentAccount.cart.items.filter(cartItem => cartItem.menuItemId === item.id).reduce((total, cartItem) => total + Number(cartItem.quantity || 0), 0)
      : 0;
    const requiresChoice = Boolean(item.requiredChoices?.length);
    const canOrder = item.available && customerCanOrderTruck(selectedTruck());
    return `<article class="ordering-item-card ${compact ? 'compact' : ''} ${canOrder ? '' : 'sold-out'}">
      <span class="ordering-item-photo" aria-hidden="true">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : item.icon}${canOrder ? '' : `<b>${item.available ? 'Closed' : 'Sold Out'}</b>`}</span>
      <div class="ordering-item-copy"><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span><em>${item.calories ? `${item.calories} cal · ` : ''}${customerMoney(item.price)}</em>
        <div class="menu-item-quantity-control" aria-label="Quantity of ${escapeHtml(item.name)}">
          <button data-menu-item-decrease="${item.id}" type="button" aria-label="Decrease ${escapeHtml(item.name)} quantity" ${canOrder && cartQuantity ? '' : 'disabled'}>−</button>
          <span><b data-menu-item-quantity="${item.id}">${cartQuantity}</b><small>in cart</small></span>
          <button data-add-menu-item="${item.id}" type="button" aria-label="${requiresChoice && !cartQuantity ? 'Choose options for' : 'Increase'} ${escapeHtml(item.name)} quantity" ${canOrder ? '' : 'disabled'}>+</button>
        </div>
      </div>
    </article>`;
  }

  function renderTruckProfile() {
    return renderTruckMenu();
  }

  function renderTruckMenu() {
    const truck = selectedTruck();
    const menu = menuForTruck();
    const saved = currentAccount.favoriteTrucks.includes(truck.id);
    const categories = [...new Set(menu.map(item => item.category))];
    const hasThisTruckCart = currentAccount.cart.truckId === truck.id;
    const cartCount = hasThisTruckCart ? currentAccount.cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    const cartSubtotal = hasThisTruckCart ? cartTotals().subtotal : 0;
    return `<div class="ordering-page full-menu-page">
      <header class="menu-experience-header">
        <button class="ordering-back-button" data-customer-page-back="nearby" type="button">← Nearby Trucks</button>
        <div><p class="eyebrow">${escapeHtml(truck.cuisine)}</p><h1>${escapeHtml(truck.name)} Menu</h1><p>Tap an item to add it · Keep scrolling while you build your order</p></div>
        <button class="menu-cart-button" data-ordering-action="open-cart" type="button"><span>🛒</span> Cart <b data-live-cart-count>${cartCount}</b></button>
        <div class="menu-truck-tools">
          <button class="${saved ? 'saved' : ''}" data-toggle-truck-favorite="${truck.id}" type="button">${saved ? '♥ Favorited' : '♡ Favorite'}</button>
          <button data-ordering-action="directions" type="button">Directions</button>
          <button data-ordering-action="call" type="button">Call</button>
          <button data-ordering-action="share" type="button">Share</button>
        </div>
      </header>
      <nav class="menu-category-jump" aria-label="Menu categories">${categories.map(category => `<button data-menu-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>`).join('')}</nav>
      <div class="full-menu-sections">${categories.map(category => `<section class="full-menu-category" data-menu-section="${escapeHtml(category)}"><div class="ordering-section-heading"><div><p class="eyebrow">Browse</p><h2>${escapeHtml(category)}</h2></div><span>${menu.filter(item => item.category === category).length} items</span></div><div class="full-menu-grid">${menu.filter(item => item.category === category).map(item => orderingItemCard(item)).join('')}</div></section>`).join('')}</div>
      <aside class="floating-cart-summary ${cartCount ? 'has-items' : ''}" aria-live="polite">
        <button class="floating-cart-review" data-ordering-action="open-cart" type="button"><span>🛒</span><span><small>Your order</small><strong><b data-live-cart-count>${cartCount}</b> <span data-live-cart-noun>item${cartCount === 1 ? '' : 's'}</span> · <b data-live-cart-total>${customerMoney(cartSubtotal)}</b></strong></span></button>
        <button class="primary-button floating-checkout-button" data-ordering-action="checkout" type="button" ${cartCount ? '' : 'disabled'}>Checkout</button>
      </aside>
    </div>`;
  }

  function requiredChoiceMarkup(choice) {
    return `<fieldset class="required-choice-group"><legend>${escapeHtml(choice.name)} <span>Required</span></legend>${choice.options.map((option, index) => `<label><input type="radio" name="required-choice-${choice.id}" value="${option.id}" data-required-choice data-choice-group="${escapeHtml(choice.name)}" data-choice-name="${escapeHtml(option.name)}" data-choice-price="${option.price}" ${index === 0 ? 'checked' : ''}><span><strong>${escapeHtml(option.name)}</strong><small>${option.price ? `+${customerMoney(option.price)}` : 'Included'}</small></span></label>`).join('')}</fieldset>`;
  }

  function requiredOptionsModal(item) {
    openModal(`<form id="requiredMenuItemForm" class="required-options-modal"><input id="requiredMenuItemId" type="hidden" value="${item.id}"><div class="required-options-heading"><span>${item.icon}</span><div><p class="eyebrow">One quick choice</p><h2 id="customerModalTitle">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p></div></div>${item.requiredChoices.map(requiredChoiceMarkup).join('')}<div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Add to Cart · ${customerMoney(item.price)}</button></div></form>`);
  }

  function selectedRequiredChoices() {
    return [...modalContent.querySelectorAll('[data-required-choice]:checked')].map(input => ({
      group: input.dataset.choiceGroup,
      name: input.dataset.choiceName,
      price: Number(input.dataset.choicePrice || 0)
    }));
  }

  function addMenuItem(item, modifiers = []) {
    if (!item || !item.available || !customerCanOrderTruck(selectedTruck())) {
      if (currentAccount?.isGuest && selectedTruck().supabase) customerToast('Sign in or create an account to send a live order to this truck.');
      else if (selectedTruck().acceptingOrders === false) customerToast(`${selectedTruck().name} is not accepting orders right now.`);
      return false;
    }
    if (currentAccount.cart.items.length && currentAccount.cart.truckId !== selectedTruckId && !confirm('Your cart contains items from another truck. Start a new cart?')) return false;
    if (currentAccount.cart.truckId !== selectedTruckId) currentAccount.cart = { truckId: selectedTruckId, orderNumber: generateOrderNumber(), items: [] };
    if (!currentAccount.cart.orderNumber) currentAccount.cart.orderNumber = generateOrderNumber();
    const signature = modifiers.map(modifier => `${modifier.group}:${modifier.name}`).sort().join('|');
    const existing = currentAccount.cart.items.find(cartItem => cartItem.menuItemId === item.id && (cartItem.modifiers || []).map(modifier => `${modifier.group}:${modifier.name}`).sort().join('|') === signature && !cartItem.instructions);
    if (existing) {
      existing.quantity += 1;
      existing.qty = existing.quantity;
    } else {
      currentAccount.cart.items.push({
        id: uid('cart'),
        menuItemId: item.id,
        name: item.name,
        icon: item.icon,
        basePrice: item.price,
        price: item.price,
        quantity: 1,
        qty: 1,
        modifiers,
        instructions: ''
      });
    }
    CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
    updateContinuousMenuCart();
    customerToast(`${item.name} added to your cart.`);
    return true;
  }

  function incrementConfiguredMenuItem(item) {
    const matches = currentAccount.cart.truckId === selectedTruckId
      ? currentAccount.cart.items.filter(cartItem => cartItem.menuItemId === item.id)
      : [];
    if (item.requiredChoices?.length && matches.length !== 1) {
      requiredOptionsModal(item);
      return;
    }
    if (item.requiredChoices?.length && matches.length === 1) {
      matches[0].quantity = Math.min(99, Number(matches[0].quantity || 0) + 1);
      matches[0].qty = matches[0].quantity;
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      updateContinuousMenuCart();
      customerToast(`${item.name} quantity increased.`);
      return;
    }
    addMenuItem(item);
  }

  function decreaseMenuItem(menuItemId) {
    if (currentAccount.cart.truckId !== selectedTruckId) return;
    const matches = currentAccount.cart.items.filter(item => item.menuItemId === menuItemId);
    const cartItem = matches[matches.length - 1];
    if (!cartItem) return;
    cartItem.quantity = Math.max(0, Number(cartItem.quantity || 0) - 1);
    cartItem.qty = cartItem.quantity;
    if (!cartItem.quantity) currentAccount.cart.items = currentAccount.cart.items.filter(item => item.id !== cartItem.id);
    if (!currentAccount.cart.items.length) {
      currentAccount.cart.truckId = null;
      currentAccount.cart.orderNumber = null;
    }
    CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
    updateContinuousMenuCart();
    customerToast(`${cartItem.name} quantity decreased.`);
  }

  function updateContinuousMenuCart() {
    const count = currentAccount.cart.truckId === selectedTruckId ? currentAccount.cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0) : 0;
    const subtotal = count ? cartTotals().subtotal : 0;
    accountContent.querySelectorAll('[data-live-cart-count]').forEach(element => { element.textContent = String(count); });
    accountContent.querySelectorAll('[data-live-cart-noun]').forEach(element => { element.textContent = count === 1 ? 'item' : 'items'; });
    accountContent.querySelectorAll('[data-live-cart-total]').forEach(element => { element.textContent = customerMoney(subtotal); });
    accountContent.querySelectorAll('[data-menu-item-quantity]').forEach(element => {
      const itemQuantity = currentAccount.cart.truckId === selectedTruckId
        ? currentAccount.cart.items
          .filter(item => item.menuItemId === element.dataset.menuItemQuantity)
          .reduce((total, item) => total + Number(item.quantity || 0), 0)
        : 0;
      element.textContent = String(itemQuantity);
      const decreaseButton = accountContent.querySelector(`[data-menu-item-decrease="${element.dataset.menuItemQuantity}"]`);
      if (decreaseButton) decreaseButton.disabled = !itemQuantity;
    });
    const summary = accountContent.querySelector('.floating-cart-summary');
    if (summary) summary.classList.toggle('has-items', Boolean(count));
    const checkoutButton = accountContent.querySelector('.floating-checkout-button');
    if (checkoutButton) checkoutButton.disabled = !count;
    updateCartBadge();
  }

  function cartItemNoteModal(item) {
    openModal(`<form id="customerCartItemNoteForm" class="cart-note-modal"><input id="cartNoteItemId" type="hidden" value="${item.id}"><p class="eyebrow">Item Notes</p><h2 id="customerModalTitle">${escapeHtml(item.name)}</h2><p class="muted">Add a special request for this item. The truck will see it with your order.</p><label for="cartItemNote">Notes</label><textarea id="cartItemNote" class="customer-textarea" rows="4" maxlength="240" placeholder="No onions · Extra pickles · Well done · Cut in half">${escapeHtml(item.instructions || '')}</textarea><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="primary-button" type="submit">Save Notes</button></div></form>`);
  }

  function cartItemUnitPrice(item) {
    return Number(item.basePrice || item.price || 0) + (item.modifiers || []).reduce((total, modifier) => total + Number(modifier.price || 0), 0);
  }

  function cartTotals() {
    const subtotal = currentAccount.cart.items.reduce((total, item) => total + cartItemUnitPrice(item) * Number(item.quantity || 0), 0);
    const truck = TRUCKS.find(item => item.id === currentAccount.cart.truckId);
    const taxRate = truck?.supabase ? Number(truck.taxRate || 0) : 0.06;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const serviceFee = truck?.supabase ? 0 : subtotal ? 1.49 : 0;
    return { subtotal, tax, serviceFee, total: Number((subtotal + tax + serviceFee).toFixed(2)) };
  }

  function unavailableCartItems() {
    if (!currentAccount?.cart?.items?.length || !currentAccount.cart.truckId) return [];
    const currentMenu = new Map(menuForTruck(currentAccount.cart.truckId).map(item => [item.id, item]));
    const truck = TRUCKS.find(item => item.id === currentAccount.cart.truckId);
    if (!customerCanOrderTruck(truck)) return currentAccount.cart.items.slice();
    return currentAccount.cart.items.filter(item => currentMenu.get(item.menuItemId)?.available !== true);
  }

  function cartItemMarkup(item, unavailable = false) {
    const modifiers = (item.modifiers || []).map(modifier => modifier.name).join(' · ');
    return `<article class="ordering-cart-item ${unavailable ? 'cart-item-sold-out' : ''}">
      <div class="cart-item-photo" aria-hidden="true">${item.icon || '🍽️'}</div>
      <div class="cart-item-copy"><h3>${escapeHtml(item.name)}</h3>${unavailable ? '<strong class="cart-item-availability">Sold Out — remove to continue</strong>' : ''}${modifiers ? `<p>${escapeHtml(modifiers)}</p>` : ''}${item.instructions ? `<small>“${escapeHtml(item.instructions)}”</small>` : ''}<div class="cart-item-links"><button data-cart-note="${item.id}" type="button">${item.instructions ? 'Edit Notes' : '+ Add Notes'}</button><button data-cart-remove="${item.id}" type="button">Remove</button></div></div>
      <div class="cart-item-controls"><strong>${customerMoney(cartItemUnitPrice(item) * item.quantity)}</strong><div class="ordering-quantity small"><button data-cart-quantity="${item.id}" data-quantity-change="-1" type="button">−</button><span>${item.quantity}</span><button data-cart-quantity="${item.id}" data-quantity-change="1" type="button">+</button></div></div>
    </article>`;
  }

  function renderCart() {
    const cart = currentAccount.cart;
    const truck = TRUCKS.find(item => item.id === cart.truckId) || selectedTruck();
    const totals = cartTotals();
    const unavailableItems = unavailableCartItems();
    const unavailableIds = new Set(unavailableItems.map(item => item.id));
    if (!cart.items.length) return `<div class="ordering-page"><button class="ordering-back-button" data-customer-page-back="truckMenu" type="button">← Continue Shopping</button><section class="ordering-empty-cart"><span>🛒</span><p class="eyebrow">Your Cart</p><h1>Ready when you are.</h1><p>Add something delicious from ${escapeHtml(truck.name)}.</p><button class="primary-button" data-ordering-action="continue-shopping" type="button">Browse the Menu</button></section></div>`;
    return `<div class="ordering-page cart-page">
      ${pageHeader('Your Order', 'Shopping Cart', `${escapeHtml(truck.name)} · ${cart.items.reduce((total, item) => total + item.quantity, 0)} items`, '<button class="ordering-text-danger" data-ordering-action="empty-cart" type="button">Empty Cart</button>')}
      ${unavailableItems.length ? `<div class="cart-availability-alert" role="alert"><span>⚠️</span><div><strong>Your cart changed</strong><p>${unavailableItems.length === 1 ? 'An item is' : 'Some items are'} now sold out. Remove ${unavailableItems.length === 1 ? 'it' : 'them'} before checkout.</p></div></div>` : ''}
      <div class="cart-layout"><section class="cart-items-panel">${cart.items.map(item => cartItemMarkup(item, unavailableIds.has(item.id))).join('')}<button class="secondary-button" data-ordering-action="continue-shopping" type="button">← Continue Shopping</button></section>
      <aside class="order-summary-card"><p class="order-number-banner"><small>Your permanent order number</small><strong>${orderNumberLabel(cart.orderNumber)}</strong></p><h2>Order Summary</h2><div><span>Subtotal</span><strong>${customerMoney(totals.subtotal)}</strong></div><div><span>Taxes <small>estimate</small></span><strong>${customerMoney(totals.tax)}</strong></div><div><span>Service Fee <small>placeholder</small></span><strong>${customerMoney(totals.serviceFee)}</strong></div><div class="order-summary-total"><span>Estimated Total</span><strong>${customerMoney(totals.total)}</strong></div><p>Estimated pickup in about ${truck.pickupMinutes} minutes.</p><button class="primary-button full" data-ordering-action="checkout" type="button" ${unavailableItems.length ? 'disabled aria-disabled="true"' : ''}>${unavailableItems.length ? 'Remove Sold-Out Items' : 'Proceed to Checkout'}</button></aside></div>
    </div>`;
  }

  function checkoutSummaryMarkup(totals) {
    return `<div class="checkout-summary-lines"><div><span>Subtotal</span><strong>${customerMoney(totals.subtotal)}</strong></div><div><span>Estimated tax</span><strong>${customerMoney(totals.tax)}</strong></div><div><span>Service fee</span><strong>${customerMoney(totals.serviceFee)}</strong></div><div><span>Total</span><strong>${customerMoney(totals.total)}</strong></div></div>`;
  }

  function renderCheckout() {
    const truck = TRUCKS.find(item => item.id === currentAccount.cart.truckId) || selectedTruck();
    const totals = cartTotals();
    const defaultPayment = currentAccount.paymentMethods.find(method => method.isDefault) || currentAccount.paymentMethods[0];
    const defaultAddress = currentAccount.addresses.find(address => address.isDefault) || currentAccount.addresses[0];
    const secureStripeCheckout = Boolean(truck.supabase && !currentAccount.isGuest && window.FoodTrekNowCustomerPayments?.available);
    const availableVendorCredit = Number(vendorCreditsByTruck.get(truck.id) || 0) / 100;
    const vendorCreditMarkup = secureStripeCheckout && availableVendorCredit > 0
      ? `<label class="checkout-choice vendor-credit-choice"><input id="useVendorCredit" type="checkbox" checked><span><strong>Use ${customerMoney(availableVendorCredit)} ${escapeHtml(truck.name)} credit</strong><small>This credit works only with this food truck. Stripe will charge any remaining balance.</small></span></label>`
      : '';
    const paymentMarkup = secureStripeCheckout
      ? `<div class="stripe-checkout-choice"><strong>Pay securely with Stripe</strong><p>Your payment goes directly to ${escapeHtml(truck.name)}. Available methods may include card, Apple Pay, Google Pay, and Cash App Pay based on your device and the truck's Stripe settings.</p><small>FoodTrekNow never receives or stores your full card number or security code.</small></div>`
      : defaultPayment
        ? `<label class="checkout-choice"><input name="paymentMethod" value="${defaultPayment.id}" type="radio" checked><span><strong>${escapeHtml(defaultPayment.brand)} ••••${escapeHtml(defaultPayment.last4)}</strong><small>${defaultPayment.isDefault ? 'Default payment preference' : `Expires ${escapeHtml(defaultPayment.expiry)}`}</small></span></label>`
        : '<p>Pay at pickup (prototype).</p>';
    const pickupInformation = currentAccount.isGuest
      ? `<div class="checkout-card-content guest-pickup-fields"><h2>Pickup Information</h2><p>Enter the contact details the truck should use for this order.</p><label for="guestCheckoutName"><strong>Name</strong></label><input id="guestCheckoutName" class="customer-input" value="${escapeHtml(`${currentAccount.firstName || ''} ${currentAccount.lastName || ''}`.trim().replace(/^Guest$/, ''))}" autocomplete="name" required placeholder="Your name"><label for="guestCheckoutMobile"><strong>Mobile Number</strong></label><input id="guestCheckoutMobile" class="customer-input" type="tel" value="${escapeHtml(currentAccount.mobile)}" autocomplete="tel" required placeholder="(555) 555-0123"><label for="guestCheckoutEmail"><strong>Email Address</strong></label><input id="guestCheckoutEmail" class="customer-input" type="email" value="${escapeHtml(currentAccount.email)}" autocomplete="email" required placeholder="you@example.com"></div>`
      : `<div><h2>Pickup Information</h2><p><strong>${escapeHtml(currentAccount.firstName)} ${escapeHtml(currentAccount.lastName)}</strong><br>${escapeHtml(currentAccount.mobile)} · ${escapeHtml(currentAccount.email)}</p></div>`;
    return `<div class="ordering-page checkout-page">
      <button class="ordering-back-button" data-customer-page-back="cart" type="button">← Back to Cart</button>
      <form id="customerCheckoutForm"><div class="checkout-heading"><p class="eyebrow">Secure Checkout · ${orderNumberLabel(currentAccount.cart.orderNumber)}</p><h1>Review and Place Your Order</h1><p>${escapeHtml(truck.name)} · Pickup only</p></div>
      <div class="checkout-layout"><div class="checkout-sections">
        <section class="checkout-card"><span class="checkout-step">1</span>${pickupInformation}</section>
        <section class="checkout-card"><span class="checkout-step">2</span><div class="checkout-card-content"><h2>Pickup Time</h2><label class="checkout-choice"><input name="pickupTime" value="asap" type="radio" checked><span><strong>ASAP</strong><small>Ready in about ${truck.pickupMinutes} minutes</small></span></label><label class="checkout-choice disabled"><input name="pickupTime" value="later" type="radio" disabled><span><strong>Schedule Later</strong><small>Coming in a future update</small></span></label></div></section>
        <section class="checkout-card"><span class="checkout-step">3</span><div class="checkout-card-content"><h2>Saved Address <small>Future Delivery</small></h2><p>${defaultAddress ? `${escapeHtml(defaultAddress.label)} · ${escapeHtml(defaultAddress.street)}, ${escapeHtml(defaultAddress.city)}` : 'Add a saved address from your profile when delivery becomes available.'}</p></div></section>
        <section class="checkout-card"><span class="checkout-step">4</span><div class="checkout-card-content"><h2>Payment Method</h2>${paymentMarkup}${vendorCreditMarkup}${secureStripeCheckout ? '' : '<button class="checkout-link" data-customer-action="view-payments" type="button">Manage Payment Methods</button>'}</div></section>
        <section class="checkout-card checkout-fields"><span class="checkout-step">5</span><div class="checkout-card-content"><label for="checkoutPromoCode"><strong>Promo Code</strong></label><div class="promo-row"><input id="checkoutPromoCode" class="customer-input" placeholder="Enter code"><button class="secondary-button" data-ordering-action="apply-promo" type="button">Apply</button></div><label for="checkoutOrderNotes"><strong>Order Notes</strong></label><textarea id="checkoutOrderNotes" class="customer-textarea" rows="3" maxlength="300" placeholder="Notes for the truck team"></textarea><p id="checkoutMessage" class="form-message"></p></div></section>
      </div><aside class="checkout-order-summary"><p class="order-number-banner"><small>Order Number</small><strong>${orderNumberLabel(currentAccount.cart.orderNumber)}</strong></p><p class="eyebrow">Final Summary</p><h2>${escapeHtml(truck.name)}</h2>${currentAccount.cart.items.map(item => `<div class="checkout-item-line"><span>${item.quantity}× ${escapeHtml(item.name)}</span><strong>${customerMoney(cartItemUnitPrice(item) * item.quantity)}</strong></div>`).join('')}${checkoutSummaryMarkup(totals)}<button class="primary-button full" type="submit">${secureStripeCheckout ? 'Continue to Secure Payment' : 'Place Order'}</button><button class="secondary-button full" data-customer-page-back="cart" type="button">Back to Cart</button></aside></div></form>
    </div>`;
  }

  function confirmationOrder() {
    return currentAccount.orders.find(order => String(order.id) === String(lastPlacedOrderId)) || currentAccount.orders[0];
  }

  function isOrderCancellable(order) {
    return Boolean(order && ['received', 'new'].includes(order.status));
  }

  function cancelOrderModal(order) {
    if (!isOrderCancellable(order)) {
      customerToast('This order is already being prepared and can no longer be cancelled automatically.');
      return;
    }
    if (order.supabaseOrderId && order.paymentLabel !== 'Pay at Pickup') {
      const stripePaid = Math.max(0, order.total - Number(order.vendorCreditApplied || 0));
      openModal(`<div class="cancel-order-modal"><p class="eyebrow">Cancel ${orderNumberLabel(order.id)}</p><h2 id="customerModalTitle">How should we return your payment?</h2><p>${escapeHtml(order.truckName)} has received your order but has not started preparing it.</p><div class="cancellation-options"><button class="cancellation-option" data-confirm-cancel-order="${escapeHtml(order.id)}" data-cancel-resolution="original_payment" type="button"><span>↩</span><div><strong>Refund original payment</strong><small>${customerMoney(stripePaid)} returns through Stripe${order.vendorCreditApplied ? ` and ${customerMoney(order.vendorCreditApplied)} returns as ${escapeHtml(order.truckName)} credit` : ''}. Bank posting times vary.</small></div></button><button class="cancellation-option credit" data-confirm-cancel-order="${escapeHtml(order.id)}" data-cancel-resolution="vendor_credit" type="button"><span>¤</span><div><strong>Get ${escapeHtml(order.truckName)} credit</strong><small>${customerMoney(order.total)} is available immediately for a future order from this truck only.</small></div></button></div><p id="cancelOrderMessage" class="form-message"></p><button class="secondary-button full" data-close-customer-modal type="button">Keep My Order</button></div>`);
      return;
    }
    openModal(`<div class="cancel-order-modal"><p class="eyebrow">Cancel ${orderNumberLabel(order.id)}</p><h2 id="customerModalTitle">Cancel this order?</h2><p>${escapeHtml(order.truckName)} has received your order but has not started preparing it.</p><div class="refund-summary"><span>Full refund</span><strong>${customerMoney(order.total)}</strong></div><p class="muted">This demo order is stored only on this device.</p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Keep My Order</button><button class="customer-small-button danger" data-confirm-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order &amp; Refund</button></div></div>`);
  }

  function renderOrderConfirmation() {
    const order = confirmationOrder();
    if (!order) return renderOverview();
    const readyTime = new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `<div class="ordering-page confirmation-page"><section class="confirmation-card"><div class="confirmation-check">✓</div><p class="eyebrow">Order Successfully Placed</p><h1>Thanks, ${escapeHtml(currentAccount.preferredName || currentAccount.firstName)}!</h1><p>Your order is with ${escapeHtml(order.truckName)}.</p><div class="confirmation-number"><small>Order Number · Use for pickup</small><strong>${orderNumberLabel(order.id)}</strong></div><div class="confirmation-details"><span><small>Estimated Ready Time</small><strong>${readyTime}</strong></span><span><small>Pickup Instructions</small><strong>Show ${orderNumberLabel(order.id)} at the truck window.</strong></span></div><div class="confirmation-actions"><button class="primary-button" data-ordering-action="track-order" type="button">Track My Order</button><button class="secondary-button" data-order-again="${escapeHtml(order.id)}" type="button">Order Again</button><button class="secondary-button" data-home-page="overview" type="button">Return Home</button>${isOrderCancellable(order) ? `<button class="customer-small-button danger confirmation-cancel-button" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order</button>` : ''}</div></section></div>`;
  }

  function trackingStatusIndex(status) {
    return ({ received: 0, new: 0, preparing: 1, ready: 2, pickedup: 3, completed: 3 })[status] ?? 0;
  }

  function renderLiveTracking() {
    const order = confirmationOrder();
    if (!order) return renderOrders();
    const activeIndex = trackingStatusIndex(order.status);
    const statuses = [['Order Received', 'We sent your order to the truck.'], ['Preparing', 'The kitchen is making your meal.'], ['Ready for Pickup', 'Head to the pickup window.'], ['Picked Up', 'Enjoy your FoodTrekNow order!']];
    const readyTime = new Date(order.estimatedReadyAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `<div class="ordering-page tracking-page">
      <button class="ordering-back-button" data-home-page="overview" type="button">← Customer Home</button>
      <section class="tracking-hero"><div><p class="eyebrow">Live Order Tracking</p><h1>${escapeHtml(order.truckName)}</h1><p>${orderNumberLabel(order.id)}</p></div><div><small>Estimated Ready</small><strong>${readyTime}</strong></div><div><small>Order Number</small><strong>#${orderNumberValue(order.id)}</strong></div></section>
      <section class="tracking-timeline">${statuses.map(([title, copy], index) => `<article class="${index < activeIndex ? 'complete' : index === activeIndex ? 'active' : ''}"><span>${index < activeIndex ? '✓' : index + 1}</span><div><small>${index === activeIndex ? 'Current Status' : index < activeIndex ? 'Complete' : 'Up Next'}</small><h2>${title}</h2><p>${copy}</p></div></article>`).join('')}</section>
      <section class="tracking-pickup-card"><span>📍</span><div><p class="eyebrow">Pickup Instructions</p><h2>Meet us at the truck window</h2><p>Bring <strong>${orderNumberLabel(order.id)}</strong>. We’ll call your order number when it is ready.</p></div><button class="secondary-button" data-ordering-action="directions" type="button">Directions</button></section>
      ${isOrderCancellable(order) ? `<section class="tracking-cancel-card"><div><p class="eyebrow">Changed your mind?</p><h2>Cancel before preparation starts</h2><p>Cancel now to receive a full refund of ${customerMoney(order.total)}.</p></div><button class="customer-small-button danger" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order</button></section>` : ''}
    </div>`;
  }

  function syncPlacedOrderToVendor(order) {
    const vendorStorageKey = 'ftnVendorOrdersV0231';
    let vendorOrders = [];
    try {
      const saved = JSON.parse(localStorage.getItem(vendorStorageKey));
      if (Array.isArray(saved)) vendorOrders = saved;
    } catch {}
    vendorOrders.unshift({
      id: order.id,
      truckId: order.truckId,
      truckName: order.truckName,
      customer: currentAccount.preferredName || currentAccount.firstName,
      customerMobile: currentAccount.mobile,
      customerEmail: currentAccount.email,
      guestCheckout: Boolean(currentAccount.isGuest),
      items: order.items.map(item => ({ name: item.name, qty: item.qty, price: item.price, modifiers: item.modifiers || [], instructions: item.instructions || '' })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: 'new',
      time: new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      payment: order.paymentLabel,
      paid: true,
      createdAt: order.createdAt
    });
    localStorage.setItem(vendorStorageKey, JSON.stringify(vendorOrders));
    if (window.dispatchEvent && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('ftn:vendor-orders-updated'));
    }
  }

  function syncCancelledOrderToVendor(order) {
    const vendorStorageKey = 'ftnVendorOrdersV0231';
    let vendorOrders = [];
    try {
      const saved = JSON.parse(localStorage.getItem(vendorStorageKey));
      if (Array.isArray(saved)) vendorOrders = saved;
    } catch {}
    const vendorOrder = vendorOrders.find(item => String(item.id) === String(order.id));
    if (vendorOrder) {
      vendorOrder.status = 'cancelled';
      vendorOrder.paid = false;
      vendorOrder.cancelledAt = order.cancelledAt;
      vendorOrder.refundStatus = 'refunded';
      vendorOrder.refundedAmount = order.refund?.amount || order.total;
      localStorage.setItem(vendorStorageKey, JSON.stringify(vendorOrders));
      if (window.dispatchEvent && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('ftn:vendor-orders-updated'));
      }
    }
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
      <div class="active-order-heading"><div><p class="eyebrow">Active Order</p><h2>${escapeHtml(order.statusLabel)}</h2><p>${escapeHtml(order.truckName)} · ${orderNumberLabel(order.id)}</p></div><span class="status-live-dot">Live</span></div>
      <div class="home-order-track" aria-label="Order progress">
        <div class="complete"><span>✓</span><strong>Received</strong></div>
        <i class="complete"></i>
        <div class="${preparing ? 'complete' : ''}"><span>2</span><strong>Preparing</strong></div>
        <i class="${ready ? 'complete' : ''}"></i>
        <div class="${ready ? 'complete' : ''}"><span>3</span><strong>Ready</strong></div>
      </div>
      <button class="customer-small-button primary" data-track-order="${escapeHtml(order.id)}" type="button">Track Order</button>
    </article>`;
  }

  function favoriteTruckHomeCard(truck) {
    const saved = currentAccount.favoriteTrucks.includes(truck.id);
    return `<article class="home-truck-card" data-open-truck-profile="${truck.id}">
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
    document.querySelectorAll('[data-bottom-target="cart"]').forEach(button => button.classList.toggle('active', page === 'cart'));
    const renderers = {
      overview: renderOverview,
      nearby: renderNearbyTrucks,
      truckProfile: renderTruckProfile,
      truckMenu: renderTruckMenu,
      cart: renderCart,
      checkout: renderCheckout,
      confirmation: renderOrderConfirmation,
      tracking: renderLiveTracking,
      profile: renderProfile,
      addresses: renderAddresses,
      favorites: renderFavorites,
      orders: renderOrders,
      payments: renderPayments,
      notifications: renderNotifications,
      settings: renderSettings,
      vendorApplication: renderVendorApplication,
      vendorReviews: renderVendorReviews
    };
    accountContent.innerHTML = (renderers[page] || renderers.overview)();
    if (page === 'vendorApplication') loadVendorApplication();
    if (page === 'vendorReviews' && currentAccount.role === 'admin') loadVendorReviews();
    updateCartBadge();
    updateCustomerNotificationBadge();
    document.querySelector('.customer-sidebar')?.classList.remove('open');
    document.getElementById('customerMenuButton').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }

  function renderOverview() {
    const currentOrders = currentAccount.orders.filter(order => !['completed', 'cancelled'].includes(order.status));
    const pastOrders = currentAccount.orders.filter(order => ['completed', 'cancelled'].includes(order.status));
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
        <div class="home-event-grid">${EVENTS.map(event => `<article class="home-event-card" data-home-event="${event.id}"><div class="event-date"><span>${event.date.split(' ')[0]}</span><strong>${event.date.split(' ')[1]}</strong></div><div><p>${escapeHtml(event.location)}</p><h3>${escapeHtml(event.name)}</h3><span>${escapeHtml(event.time)} · ${escapeHtml(event.detail)}</span></div><button data-home-event="${event.id}" type="button" aria-label="View ${escapeHtml(event.name)}">›</button></article>`).join('')}</div>
      </section>

      <section class="home-section">
        <div class="home-section-heading"><div><p class="eyebrow">Order it again</p><h2>Recent Orders</h2></div><button class="home-link-button" data-customer-action="view-orders" type="button">View Order History →</button></div>
        <div class="home-recent-orders">${pastOrders.slice(0, 3).map(order => `<article class="home-recent-order"><div class="recent-order-logo">🚚</div><div><h3>${escapeHtml(order.truckName)} · ${orderNumberLabel(order.id)}</h3><p>${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</p><span>${formatDate(order.createdAt)} · ${customerMoney(order.total)}</span></div><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button></article>`).join('') || '<div class="customer-card empty-customer-state"><strong>No recent orders yet</strong><p>Your past pickups will appear here.</p></div>'}</div>
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
        <aside class="customer-card"><h2 class="customer-section-title">Security</h2><p class="muted">Use a unique password to protect your account and order information.</p><button class="secondary-button full" data-customer-action="change-password" type="button">Change Password</button><div class="demo-note"><strong>Email verification</strong><br>${currentAccount.emailVerified ? 'Verified by Supabase' : 'Pending — check your email for the secure link'}</div></aside>
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
    const favoriteTrucks = TRUCKS.filter(truck => currentAccount.favoriteTrucks.includes(truck.id));
    const favoriteOrders = currentAccount.orders.filter(order => currentAccount.favoriteOrders.includes(order.id));
    return `${pageHeader('Saved for Later', 'Favorites', 'Keep favorite trucks and meals close at hand.')}
      <div class="customer-list">${favoriteTrucks.length ? favoriteTrucks.map(truck => `<section class="customer-card favorite-truck-card" data-open-truck-profile="${truck.id}"><div class="favorite-truck-art">${truck.icon || '🚚'}</div><div><p class="eyebrow">${escapeHtml(truck.status)}</p><h2 class="customer-section-title">${escapeHtml(truck.name)}</h2><p class="muted">${escapeHtml(truck.cuisine)} · ${escapeHtml(truck.wait)}</p></div><div class="customer-card-actions"><button class="customer-small-button primary" data-open-truck-profile="${truck.id}" type="button">View Truck</button><button class="heart-button saved" data-toggle-truck-favorite="${truck.id}" type="button" aria-label="Remove favorite truck">♥</button></div></section>`).join('') : '<div class="customer-card empty-customer-state"><span>♡</span><strong>No favorite trucks yet</strong><p>Explore nearby trucks and save the ones you love.</p></div>'}</div>
      <h2>Favorite Orders</h2>
      <div class="customer-list">${favoriteOrders.length ? favoriteOrders.map(order => favoriteOrderCard(order)).join('') : '<div class="customer-card empty-customer-state"><span>♡</span><strong>No favorite orders yet</strong><p>Open Order History and tap “Save Favorite” on a past meal.</p><button class="secondary-button" data-customer-action="view-orders" type="button">View Order History</button></div>'}</div>`;
  }

  function favoriteOrderCard(order) {
    return `<article class="customer-card customer-order-card"><div><p class="eyebrow">${orderNumberLabel(order.id)} · ${formatDate(order.createdAt)}</p><h3>${escapeHtml(order.truckName)}</h3><div class="order-item-summary">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</div></div><div><div class="order-total">${customerMoney(order.total)}</div><div class="customer-card-actions"><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button><button class="customer-small-button danger" data-toggle-order-favorite="${escapeHtml(order.id)}" type="button">Remove</button></div></div></article>`;
  }

  function renderOrders() {
    const current = currentAccount.orders.filter(order => !['completed', 'cancelled'].includes(order.status));
    const past = currentAccount.orders.filter(order => ['completed', 'cancelled'].includes(order.status));
    const shown = orderHistoryFilter === 'current' ? current : past;
    return `${pageHeader('Every Pickup', 'Order History', 'Track active orders and revisit past meals.')}
      <div class="order-history-tabs" role="tablist"><button class="order-history-tab ${orderHistoryFilter === 'current' ? 'active' : ''}" data-order-filter="current" type="button">Current Orders (${current.length})</button><button class="order-history-tab ${orderHistoryFilter === 'past' ? 'active' : ''}" data-order-filter="past" type="button">Past Orders (${past.length})</button></div>
      <div class="customer-list">${shown.length ? shown.map(order => orderHistoryCard(order)).join('') : `<div class="customer-card empty-customer-state"><span>▤</span><strong>No ${orderHistoryFilter} orders</strong><p>Orders will appear here after checkout.</p></div>`}</div>`;
  }

  function orderHistoryCard(order) {
    const isFavorite = currentAccount.favoriteOrders.includes(order.id);
    const isPast = ['completed', 'cancelled'].includes(order.status);
    const cancellationCopy = !order.supabaseOrderId
      ? `Full refund: ${customerMoney(order.refund?.amount || order.total)}`
      : order.cancellationResolution === 'vendor_credit'
        ? `${customerMoney(order.refund?.amount || order.total)} ${order.truckName} credit issued`
        : order.refundStatus === 'succeeded' ? `${customerMoney(order.refund?.amount || 0)} refunded through Stripe` : 'Stripe refund processing';
    return `<article class="customer-card customer-order-card"><div><span class="status-pill ${isPast ? 'past' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(order.statusLabel)}</span><h3>${escapeHtml(order.truckName)} · ${orderNumberLabel(order.id)}</h3><p class="muted">${formatDate(order.createdAt)}</p><div class="order-item-summary">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</div>${order.status === 'cancelled' ? `<p class="refund-confirmation">${escapeHtml(cancellationCopy)}</p>` : ''}</div><div><div class="order-total">${customerMoney(order.total)}</div><div class="customer-card-actions"><button class="customer-small-button" data-order-details="${escapeHtml(order.id)}" type="button">Order Details</button>${isOrderCancellable(order) ? `<button class="customer-small-button danger" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order</button>` : ''}${order.status === 'completed' ? `<button class="customer-small-button" data-receipt="${escapeHtml(order.id)}" type="button">Receipt</button><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button><button class="customer-small-button" data-toggle-order-favorite="${escapeHtml(order.id)}" type="button">${isFavorite ? '♥ Saved' : '♡ Save Favorite'}</button>` : ''}${order.status === 'cancelled' ? `<button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Order Again</button>` : ''}</div></div></article>`;
  }

  function renderPayments() {
    const methods = currentAccount.paymentMethods;
    const credits = [...vendorCreditsByTruck.entries()].filter(([, cents]) => cents > 0).map(([truckId, cents]) => ({
      truck: TRUCKS.find(truck => truck.id === truckId),
      amount: cents / 100
    }));
    return `${pageHeader('Checkout', 'Payment Methods', 'Saved payment methods are a UI-only prototype. No card numbers are retained.', '<button class="primary-button" data-customer-action="add-payment" type="button">+ Add Payment Method</button>')}
      ${credits.length ? `<section class="customer-card vendor-credit-wallet"><p class="eyebrow">Food Truck Credits</p><h2 class="customer-section-title">Available Credits</h2><p class="muted">Each credit can be used only with the food truck that issued it.</p>${credits.map(credit => `<div class="setting-row"><div><strong>${escapeHtml(credit.truck?.name || 'Food Truck')}</strong><small>Automatically available at this truck's secure checkout</small></div><b>${customerMoney(credit.amount)}</b></div>`).join('')}</section>` : ''}
      <div class="customer-quick-grid">${methods.length ? methods.map(method => `
        <article class="customer-card payment-card"><div class="payment-card-top"><strong>${escapeHtml(method.brand)}</strong>${method.isDefault ? '<span class="default-pill">Default</span>' : ''}</div><div class="payment-card-number">•••• •••• •••• ${escapeHtml(method.last4)}</div><div class="payment-card-bottom"><span>${escapeHtml(method.name)}</span><span>EXP ${escapeHtml(method.expiry)}</span></div></article>`).join('') : '<div class="customer-card empty-customer-state"><span>▣</span><strong>No payment methods saved</strong><p>Add a card preference for faster checkout.</p></div>'}</div>
      ${methods.length ? `<div class="customer-card" style="margin-top:18px"><h2 class="customer-section-title">Manage Methods</h2>${methods.map(method => `<div class="setting-row"><div><strong>${escapeHtml(method.brand)} ending in ${escapeHtml(method.last4)}</strong><small>${escapeHtml(method.name)} · Expires ${escapeHtml(method.expiry)}</small></div><div class="customer-card-actions">${method.isDefault ? '' : `<button class="customer-small-button" data-default-payment="${method.id}" type="button">Make Default</button>`}<button class="customer-small-button danger" data-delete-payment="${method.id}" type="button">Delete</button></div></div>`).join('')}</div>` : ''}`;
  }

  function renderNotifications() {
    const preferences = currentAccount.preferences.notifications;
    const unreadCount = customerNotifications.filter(notification => !notification.is_read).length;
    const rows = [
      ['orderUpdates', 'Order Updates', 'Status changes, pickup readiness, and order confirmations.'],
      ['promotions', 'Promotions', 'Occasional offers and FoodTrekNow news.'],
      ['favoriteTrucks', 'Favorite Truck Notifications', 'Opening hours, new menu items, and availability from saved trucks.'],
      ['push', 'Push Notifications', 'Preference is ready for native Apple and Android notification delivery.']
    ];
    const feed = customerNotifications.length ? customerNotifications.map(notification => {
      const order = currentAccount.orders.find(item => item.supabaseOrderId === notification.order_id);
      return `<article class="communication-notification ${notification.is_read ? '' : 'unread'}"><span class="communication-notification-icon" aria-hidden="true">${notification.kind === 'order_message' ? '💬' : '🛍️'}</span><div><div class="communication-notification-heading"><strong>${escapeHtml(notification.title)}</strong>${notification.is_read ? '' : '<b>New</b>'}</div><p>${escapeHtml(notification.body)}</p><small>${new Date(notification.created_at).toLocaleString()}</small></div>${order ? `<button class="customer-small-button" data-notification-order="${escapeHtml(order.id)}" type="button">View Order</button>` : ''}</article>`;
    }).join('') : '<div class="empty-customer-state communication-empty"><span>🔔</span><strong>No notifications yet</strong><p>Order updates and truck messages will appear here.</p></div>';
    return `${pageHeader('Stay in the Loop', 'Notifications', 'Order updates and messages, all in one place.', unreadCount ? '<button class="secondary-button" data-mark-notifications-read type="button">Mark All Read</button>' : '')}<section class="customer-card communication-inbox"><div class="communication-section-heading"><div><p class="eyebrow">Notification Center</p><h2>Recent Updates</h2></div><span>${unreadCount} unread</span></div><div class="communication-notification-list">${feed}</div></section><section class="customer-card communication-preferences"><h2 class="customer-section-title">Preferences</h2>${rows.map(([key, title, copy]) => `<div class="setting-row"><div><strong>${title}</strong><small>${copy}</small></div><label class="customer-switch" aria-label="${title}"><input type="checkbox" data-notification-setting="${key}" ${preferences[key] ? 'checked' : ''}><span></span></label></div>`).join('')}</section>`;
  }

  function renderSettings() {
    const preferences = currentAccount.preferences.privacy;
    return `${pageHeader('Account Controls', 'Settings', 'Manage privacy preferences and your FoodTrekNow account.')}
      <section class="customer-card"><h2 class="customer-section-title">Privacy Settings</h2>
        <div class="setting-row"><div><strong>Personalized Offers</strong><small>Use your saved favorites to tailor food truck suggestions.</small></div><label class="customer-switch"><input type="checkbox" data-privacy-setting="personalizedOffers" ${preferences.personalizedOffers ? 'checked' : ''}><span></span></label></div>
        <div class="setting-row"><div><strong>Activity History</strong><small>Keep order activity available for one-tap reordering.</small></div><label class="customer-switch"><input type="checkbox" data-privacy-setting="activityHistory" ${preferences.activityHistory ? 'checked' : ''}><span></span></label></div>
      </section>
      <section class="customer-card" style="margin-top:18px"><h2 class="customer-section-title">Legal & Privacy</h2><p class="muted">Review how FoodTrekNow handles your information and the rules for using the service.</p><div class="customer-card-actions"><a class="customer-small-button secondary" href="privacy.html">Privacy Policy</a><a class="customer-small-button secondary" href="privacy.html#your-choices">Privacy Choices</a><a class="customer-small-button secondary" href="terms.html">Terms of Service</a></div></section>
      <section class="customer-card danger-zone" style="margin-top:18px"><h2>Delete Account</h2><p class="muted">Permanently remove your customer profile, addresses, favorites, payment preferences, and order history. This cannot be undone.</p><button class="customer-small-button danger" data-customer-action="delete-account" type="button">Delete My Account</button></section>`;
  }

  function vendorApplicationForm(application = null) {
    return `<form id="vendorApplicationForm" class="customer-card"><h2 class="customer-section-title">Food Truck Information</h2><div class="customer-form-grid">
      <div><label for="vendorApplicationBusinessName">Legal Business Name</label><input id="vendorApplicationBusinessName" class="customer-input" maxlength="100" required value="${escapeHtml(application?.business_name || '')}"></div>
      <div><label for="vendorApplicationTruckName">Food Truck Name</label><input id="vendorApplicationTruckName" class="customer-input" maxlength="100" required value="${escapeHtml(application?.truck_name || '')}"></div>
      <div><label for="vendorApplicationCuisine">Cuisine</label><input id="vendorApplicationCuisine" class="customer-input" maxlength="80" required placeholder="Tacos, barbecue, desserts..." value="${escapeHtml(application?.cuisine || '')}"></div>
      <div><label for="vendorApplicationMobile">Business Mobile</label><input id="vendorApplicationMobile" class="customer-input" type="tel" maxlength="20" required value="${escapeHtml(application?.business_mobile || currentAccount.mobile || '')}"></div>
      <div><label for="vendorApplicationEmail">Business Email</label><input id="vendorApplicationEmail" class="customer-input" type="email" maxlength="120" required value="${escapeHtml(application?.business_email || currentAccount.email || '')}"></div>
      <div><label for="vendorApplicationCity">Primary City</label><input id="vendorApplicationCity" class="customer-input" maxlength="60" required value="${escapeHtml(application?.city || '')}"></div>
      <div><label for="vendorApplicationState">State</label><input id="vendorApplicationState" class="customer-input" maxlength="2" required placeholder="NC" value="${escapeHtml(application?.state || '')}"></div><div></div>
      <div style="grid-column:1/-1"><label for="vendorApplicationDescription">Tell us about your truck</label><textarea id="vendorApplicationDescription" class="customer-textarea" maxlength="500" rows="4">${escapeHtml(application?.description || '')}</textarea></div>
    </div><p id="vendorApplicationMessage" class="form-message" aria-live="polite"></p><div class="customer-form-actions"><button class="primary-button" type="submit">${application ? 'Resubmit Application' : 'Submit Vendor Application'}</button></div></form>`;
  }

  function renderVendorApplication() {
    return `<div class="vendor-application-shell">${pageHeader('Food Truck Partners', 'Become a FoodTrekNow Vendor', 'Submit your business for administrator review.')}<section id="vendorApplicationContent" class="customer-card"><p class="muted">Loading your application…</p></section></div>`;
  }

  async function loadVendorApplication() {
    const container = document.getElementById('vendorApplicationContent');
    if (!container) return;
    try {
      const application = await window.FoodTrekNowVendorOnboarding.getMyApplication();
      if (!application) return void (container.outerHTML = `<div id="vendorApplicationContent">${vendorApplicationForm()}</div>`);
      if (application.status === 'rejected') {
        container.outerHTML = `<div id="vendorApplicationContent"><section class="customer-card vendor-application-status"><span class="vendor-status-badge rejected">Rejected</span><h2>Application needs attention</h2><p>${escapeHtml(application.review_notes || 'Review the information below and resubmit when ready.')}</p></section><div style="height:16px"></div>${vendorApplicationForm(application)}</div>`;
        return;
      }
      const descriptions = { pending: 'Your information is securely saved. A FoodTrekNow administrator will review it before vendor access is enabled.', approved: 'Your business is approved. Sign out and sign back in to load vendor access for your food truck.', withdrawn: 'This application was withdrawn. You may submit it again.' };
      container.className = 'customer-card vendor-application-status';
      container.innerHTML = `<span class="vendor-status-badge ${application.status}">${escapeHtml(application.status)}</span><h2>${escapeHtml(application.truck_name)}</h2><p>${escapeHtml(descriptions[application.status] || '')}</p>${application.review_notes ? `<p><strong>Administrator note:</strong> ${escapeHtml(application.review_notes)}</p>` : ''}`;
    } catch (error) { container.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`; }
  }

  function renderVendorReviews() {
    return `${pageHeader('Administrator', 'Vendor Approvals', 'Review food truck applications and control access to the vendor platform.')}<section id="vendorReviewContent" class="customer-card"><p class="muted">Loading vendor applications…</p></section>`;
  }

  async function loadVendorReviews() {
    const container = document.getElementById('vendorReviewContent');
    if (!container) return;
    try {
      const applications = await window.FoodTrekNowVendorOnboarding.listApplications();
      if (!applications.length) return void (container.innerHTML = '<div class="empty-customer-state"><span>🚚</span><h2>No vendor applications yet</h2><p>New food truck submissions will appear here.</p></div>');
      container.className = 'vendor-review-list';
      container.innerHTML = applications.map(application => `<article class="customer-card vendor-review-card" data-vendor-review-card="${application.id}"><div><span class="vendor-status-badge ${application.status}">${escapeHtml(application.status)}</span><h2>${escapeHtml(application.truck_name)}</h2><p><strong>${escapeHtml(application.business_name)}</strong> · ${escapeHtml(application.cuisine)}</p><p>${escapeHtml(application.description || 'No description provided.')}</p><div class="vendor-review-meta"><span>${escapeHtml(application.city)}, ${escapeHtml(application.state)}</span><span>${escapeHtml(application.business_email)}</span><span>${escapeHtml(application.business_mobile)}</span></div></div>${application.status === 'pending' ? `<div class="vendor-review-actions"><button class="customer-small-button primary" data-vendor-decision="approved" data-vendor-application-id="${application.id}" type="button">Approve Vendor</button><button class="customer-small-button danger" data-vendor-decision="rejected" data-vendor-application-id="${application.id}" type="button">Reject</button></div><label class="vendor-review-notes">Review Notes<textarea class="customer-textarea" data-vendor-review-notes rows="2" placeholder="Optional note for the applicant"></textarea></label>` : `<div><strong>Reviewed</strong><p>${escapeHtml(application.review_notes || 'No review note.')}</p></div>`}</article>`).join('');
    } catch (error) { container.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`; }
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
          <button class="location-choice ${!saved.method || saved.method === 'current' ? 'active' : ''}" data-location-method="current" type="button"><span>⌖</span><strong>Use Current Location</strong><small>Uses this device's GPS with permission</small></button>
          <button class="location-choice ${saved.method === 'city' ? 'active' : ''}" data-location-method="city" type="button"><span>🏙️</span><strong>Search by City</strong><small>Enter a city name</small></button>
          <button class="location-choice ${saved.method === 'zip' ? 'active' : ''}" data-location-method="zip" type="button"><span>#</span><strong>Search by ZIP Code</strong><small>Enter a postal code</small></button>
        </div>
        <input id="customerLocationMethod" type="hidden" value="${escapeHtml(saved.method || 'current')}">
        <div id="locationCityField" class="${saved.method === 'city' ? '' : 'hidden-view'}"><label for="customerLocationCity">City</label><input id="customerLocationCity" class="customer-input" value="${escapeHtml(saved.city || '')}" placeholder="Raleigh, NC"></div>
        <div id="locationZipField" class="${saved.method === 'zip' ? '' : 'hidden-view'}"><label for="customerLocationZip">ZIP Code</label><input id="customerLocationZip" class="customer-input" inputmode="numeric" maxlength="10" value="${escapeHtml(saved.zip || '')}" placeholder="27601"></div>
        <p id="customerLocationMessage" class="customer-success-message">${saved.method === 'current' && Number.isFinite(Number(saved.latitude)) ? 'Current GPS location is saved on this device.' : saved.method === 'current' ? 'Tap Save to request location permission.' : ''}</p>
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

  function passwordRecoveryModal() {
    openModal(`<p class="eyebrow">Secure Account Recovery</p><h2 id="customerModalTitle">Choose a new password</h2><p class="muted">Your recovery link was accepted. Enter a new password for your FoodTrekNow account.</p><form id="customerRecoveryPasswordForm"><label for="recoveryCustomerPassword">New Password</label><input id="recoveryCustomerPassword" class="customer-input" type="password" minlength="8" required autocomplete="new-password"><label for="confirmRecoveryCustomerPassword">Confirm New Password</label><input id="confirmRecoveryCustomerPassword" class="customer-input" type="password" minlength="8" required autocomplete="new-password"><p id="recoveryPasswordMessage" class="form-message"></p><div class="customer-form-actions"><button class="primary-button full" type="submit">Save New Password</button></div></form>`);
  }

  function customerConversationMarkup(messages) {
    if (!messages.length) return '<div class="communication-empty compact"><span>💬</span><strong>No messages yet</strong><p>Send a pickup question directly to the food truck.</p></div>';
    return messages.map(message => `<article class="message-bubble ${message.sender_role === 'customer' ? 'mine' : 'theirs'}"><div><strong>${message.sender_role === 'customer' ? 'You' : 'Food Truck'}</strong><small>${new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div><p>${escapeHtml(message.body)}</p></article>`).join('');
  }

  async function loadCustomerConversation(order) {
    const container = modalContent.querySelector('[data-customer-conversation]');
    if (!container || !order?.supabaseOrderId || !window.FoodTrekNowLiveOrders?.available) return;
    try {
      const messages = await window.FoodTrekNowLiveOrders.loadOrderConversation(order.supabaseOrderId);
      container.innerHTML = customerConversationMarkup(messages);
      await window.FoodTrekNowLiveOrders.markOrderMessagesRead(order.supabaseOrderId, 'customer');
      const relatedIds = customerNotifications.filter(notification => notification.order_id === order.supabaseOrderId && !notification.is_read).map(notification => notification.id);
      if (relatedIds.length) await markCustomerNotificationsRead(relatedIds);
      container.scrollTop = container.scrollHeight;
    } catch (error) {
      container.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`;
    }
  }

  function orderModal(order, receiptOnly = false) {
    if (!order) return;
    const itemLines = order.items.map(item => `<div class="receipt-line"><span>${item.qty} × ${escapeHtml(item.name)}</span><strong>${customerMoney(item.qty * item.price)}</strong></div>`).join('');
    const creditPaymentLine = order.vendorCreditApplied ? `<div class="receipt-line"><span>${escapeHtml(order.truckName)} credit used</span><strong>−${customerMoney(order.vendorCreditApplied)}</strong></div>` : '';
    const cancellationLine = order.status === 'cancelled'
      ? !order.supabaseOrderId
        ? `<div class="receipt-line refund-line"><strong>Full refund</strong><strong>−${customerMoney(order.refund?.amount || order.total)}</strong></div>`
        : order.cancellationResolution === 'vendor_credit'
        ? `<div class="receipt-line refund-line"><strong>${escapeHtml(order.truckName)} credit issued</strong><strong>${customerMoney(order.refund?.amount || order.total)}</strong></div>`
        : `<div class="receipt-line refund-line"><strong>Stripe refund ${order.refundStatus === 'succeeded' ? '' : 'pending'}</strong><strong>−${customerMoney(order.refund?.amount || 0)}</strong></div>`
      : '';
    const communication = !receiptOnly && order.supabaseOrderId ? `<section class="order-conversation"><div class="communication-section-heading"><div><p class="eyebrow">Pickup Communication</p><h3>Message ${escapeHtml(order.truckName)}</h3></div><span>Live</span></div><div class="message-thread" data-customer-conversation><p class="muted">Loading messages…</p></div><form id="customerOrderMessageForm" data-order-message-id="${order.supabaseOrderId}"><label for="customerOrderMessage">Message</label><div class="message-composer"><textarea id="customerOrderMessage" class="customer-textarea" maxlength="500" rows="2" required placeholder="Ask a pickup question or share an update"></textarea><button class="primary-button" type="submit">Send</button></div><p class="form-message" data-message-error></p></form></section>` : '';
    openModal(`<div class="customer-receipt"><div class="receipt-brand"><p class="eyebrow">${receiptOnly ? 'Receipt' : 'Order Details'}</p><h2 id="customerModalTitle">${escapeHtml(order.truckName)}</h2><p>${orderNumberLabel(order.id)} · ${formatDate(order.createdAt)}</p><span class="status-pill ${['completed', 'cancelled'].includes(order.status) ? 'past' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(order.statusLabel)}</span></div><h3>Items</h3>${itemLines}<div class="receipt-line"><span>Subtotal</span><strong>${customerMoney(order.subtotal)}</strong></div><div class="receipt-line"><span>Tax</span><strong>${customerMoney(order.tax)}</strong></div>${creditPaymentLine}<div class="receipt-line receipt-total"><strong>Total</strong><strong>${customerMoney(order.total)}</strong></div>${cancellationLine}<p class="muted">${order.status === 'cancelled' ? !order.supabaseOrderId ? 'Demo refund recorded on this device.' : order.cancellationResolution === 'vendor_credit' ? `Credit is available only at ${escapeHtml(order.truckName)}.` : 'Stripe refund timing depends on the customer’s bank.' : receiptOnly ? 'Paid · Customer receipt view' : 'Pickup status updates appear in your account and notification preferences.'}</p>${communication}${isOrderCancellable(order) ? `<button class="customer-small-button danger full" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order</button>` : ''}${order.status === 'completed' ? `<button class="primary-button full" data-reorder="${escapeHtml(order.id)}" type="button">Reorder This Meal</button>` : ''}</div>`);
    if (communication) loadCustomerConversation(order);
  }

  function deleteAccountModal() {
    openModal(`<p class="eyebrow">Permanent Action</p><h2 id="customerModalTitle">Delete your account?</h2><p>This permanently removes your customer account and associated data. Type <strong>DELETE</strong> to confirm.</p><form id="customerDeleteForm"><label for="deleteAccountConfirm">Confirmation</label><input id="deleteAccountConfirm" class="customer-input" autocomplete="off" required placeholder="Type DELETE"><p id="deleteAccountMessage" class="form-message"></p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Cancel</button><button class="customer-small-button danger" type="submit">Permanently Delete Account</button></div></form>`);
  }

  document.getElementById('openCustomerPortalButton').addEventListener('click', async () => {
    if (CustomerAuthService.usesSupabase()) {
      try {
        const account = currentAccount || await CustomerAuthService.getCurrentAccount();
        if (account) openCustomerAccount(account);
        else showCustomerAuth();
      } catch (error) {
        showCustomerAuth('signin');
        document.getElementById('customerSignInMessage').textContent = error.message;
      }
      return;
    }
    const session = readSession();
    const account = session ? repository.findById(session.accountId) : null;
    if (account) openCustomerAccount(account);
    else showCustomerAuth();
  });
  document.getElementById('backToVendorButton').addEventListener('click', showVendorLogin);
  document.getElementById('showCustomerSignInButton').addEventListener('click', () => showCustomerAuth('signin'));
  document.getElementById('showCreateAccountButton').addEventListener('click', () => showCustomerAuth('create'));
  document.getElementById('guestCheckoutButton').addEventListener('click', () => startGuestCheckout('nearby'));
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
      event.target.reset();
      if (account.requiresEmailVerification) {
        clearSession();
        showCustomerAuth('signin');
        document.getElementById('customerSignInMessage').textContent = 'Account created. Check your email and select the verification link before signing in.';
      } else {
        saveSession(account.id, true);
        openCustomerAccount(account);
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
      openCustomerAccount(account);
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
    showCustomerAuth(wasGuest ? 'welcome' : 'signin');
  });
  document.getElementById('customerMenuButton').addEventListener('click', event => {
    const sidebar = document.querySelector('.customer-sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('customerMobileCartButton').addEventListener('click', () => renderCustomerPage('cart'));
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
      if (order) orderModal(order);
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
      if (eventItem) {
        selectedTruckId = eventItem.truckId;
        renderCustomerPage('truckMenu');
      }
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
        checkoutMessage.textContent = 'Opening secure Stripe Checkout…';
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
            customerToast(`${orderNumberLabel(lastPlacedOrderId)} was paid with ${truck.name} credit and sent to the truck.`);
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
      const choices = selectedRequiredChoices();
      if (item && choices.length === item.requiredChoices.length && addMenuItem(item, choices)) closeModal();
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
        await CustomerAuthService.updateRecoveredPassword(nextPassword);
        closeModal();
        const account = await CustomerAuthService.getCurrentAccount();
        if (account) openCustomerAccount(account);
        customerToast('Your password has been reset.');
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
          openCustomerAccount(account);
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
    if (account) openCustomerAccount(account);
    else clearSession();
  }

  CustomerAuthService.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') setTimeout(passwordRecoveryModal, 0);
  });
  restoreCustomerSession();
})();
