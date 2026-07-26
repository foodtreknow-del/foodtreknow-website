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
    { id: 'fresh-lemonade', category: 'Drinks', name: 'Fresh-Squeezed Lemonade', description: 'Bright, cold lemonade made fresh throughout the day.', price: 4, calories: 180, available: true, icon: '🍋', featured: false, special: false, popular: true, requiredChoices: [{ id: 'size', name: 'Choose a size', options: [{ id: 'regular', name: 'Regular', price: 0 }, { id: 'large', name: 'Large', price: 1.5 }] }] },
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
    const location = savedLocation || { method: 'current', label: 'Current Location' };
    if (location.method === 'city') {
      const city = String(location.city || '').toLowerCase();
      const center = city.includes('durham') ? SAMPLE_LOCATION_CENTERS.durham : city.includes('cary') ? SAMPLE_LOCATION_CENTERS.cary : SAMPLE_LOCATION_CENTERS.raleigh;
      return { ...center, label: location.city || 'Saved City' };
    }
    if (location.method === 'zip') {
      const zip = String(location.zip || '');
      const center = zip.startsWith('277') ? SAMPLE_LOCATION_CENTERS.durham : zip.startsWith('27513') ? SAMPLE_LOCATION_CENTERS.cary : SAMPLE_LOCATION_CENTERS.raleigh;
      return { ...center, label: `ZIP ${zip}` };
    }
    return { ...SAMPLE_LOCATION_CENTERS.raleigh, label: location.label || 'Current Location' };
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
      return TRUCKS
        .filter(truck => truck.operatingDays.includes(date.getDay()))
        .map(truck => {
          const distance = distanceInMiles(location, truck);
          return {
            ...truck,
            distance,
            distanceLabel: `${distance.toFixed(1)} mi`,
            driveTime: `${Math.max(4, Math.round(distance * 2.2))} min drive`,
            operatingStatus: operatingStatus(truck, date),
            pickupLabel: `About ${truck.pickupMinutes} min`
          };
        })
        .filter(truck => truck.distance <= radiusMiles)
        .sort((first, second) => first.distance - second.distance);
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
    window.scrollTo(0, 0);
  }

  function persistCurrentAccount() {
    if (currentAccount) saveCustomerState(currentAccount);
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
    document.querySelectorAll('.customer-nav-link').forEach(button => button.classList.toggle('active', button.dataset.customerPage === currentPage));
    updateCartBadge();
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

  function selectedNearbyRadius() {
    const savedRadius = Number(currentAccount.nearbyRadiusMiles);
    return NEARBY_RADIUS_OPTIONS.includes(savedRadius) ? savedRadius : 5;
  }

  function nearbyTruckCard(truck) {
    return `<article class="nearby-truck-card" data-open-truck-profile="${truck.id}">
      <div class="nearby-truck-logo" aria-hidden="true">${truck.icon || '🚚'}</div>
      <div class="nearby-truck-main">
        <div class="nearby-truck-heading"><div><p>${escapeHtml(truck.cuisine)}</p><h2>${escapeHtml(truck.name)}</h2></div><span class="nearby-distance">${escapeHtml(truck.distanceLabel)}</span></div>
        <div class="nearby-truck-details">
          <span><small>Drive time</small><strong>🚗 ${escapeHtml(truck.driveTime)}</strong></span>
          <span><small>Hours today</small><strong>${escapeHtml(truck.operatingStatus)}</strong></span>
          <span><small>Estimated pickup</small><strong>⏱ ${escapeHtml(truck.pickupLabel)}</strong></span>
        </div>
        ${truck.currentEvent ? `<div class="nearby-event-note"><span aria-hidden="true">🎪</span><div><small>Current Event</small><strong>${escapeHtml(truck.currentEvent)}</strong></div></div>` : ''}
      </div>
      <div class="nearby-truck-actions">
        <button class="primary-button" data-nearby-order="${truck.id}" type="button">Order Now</button>
        <button class="secondary-button" data-nearby-directions="${truck.id}" type="button">Directions</button>
      </div>
    </article>`;
  }

  function renderNearbyTrucks() {
    const radius = selectedNearbyRadius();
    const location = resolveSampleCustomerLocation(currentAccount.preferredLocation);
    const trucks = TruckDataService.searchNearby({ location, radiusMiles: radius });
    const radiusOptions = NEARBY_RADIUS_OPTIONS.map(option => `<option value="${option}" ${option === radius ? 'selected' : ''}>${option}</option>`).join('');
    const pins = trucks.slice(0, 5).map((truck, index) => `<span class="nearby-map-pin pin-${index + 1}" title="${escapeHtml(truck.name)}">${index + 1}</span>`).join('');
    return `<div class="nearby-search-page">
      ${pageHeader('Explore Nearby', 'Find Food Trucks Near Your Location', `Using ${escapeHtml(preferredLocationLabel())}`, '<button class="secondary-button" data-home-page="overview" type="button">← Back to Home</button>')}
      <section class="nearby-search-controls" aria-label="Nearby truck search controls">
        <div><span class="nearby-location-icon" aria-hidden="true">📍</span><span><small>Searching near</small><strong>${escapeHtml(location.label)}</strong></span><button data-customer-action="change-location" type="button">Change Location</button></div>
        <label for="nearbyRadiusSelect"><span>Showing Trucks Within:</span><span class="nearby-radius-input"><select id="nearbyRadiusSelect" data-nearby-radius aria-label="Search radius in miles">${radiusOptions}</select><strong>Miles</strong></span></label>
      </section>

      <div class="nearby-search-layout">
        <aside id="nearbyMapContainer" class="nearby-map-shell" data-map-provider="google-maps" data-map-ready="false" aria-label="Future map area">
          <div class="nearby-map-heading"><strong>Map Preview</strong><span>Live map coming in a future phase</span></div>
          <div class="nearby-map-canvas">
            <div class="nearby-map-road road-one"></div><div class="nearby-map-road road-two"></div><div class="nearby-map-road road-three"></div>
            ${pins}
            <div class="nearby-map-center" title="Your saved location"><span>📍</span><strong>You</strong></div>
          </div>
          <div class="nearby-map-footer"><span>${trucks.length} truck${trucks.length === 1 ? '' : 's'} shown</span><span>${radius}-mile radius</span></div>
        </aside>

        <section class="nearby-results" aria-live="polite">
          <div class="nearby-results-heading"><div><p class="eyebrow">Nearest First</p><h2>${trucks.length} truck${trucks.length === 1 ? '' : 's'} operating today</h2></div><span>Within ${radius} miles</span></div>
          <div class="nearby-truck-list">${trucks.length ? trucks.map(nearbyTruckCard).join('') : `<div class="customer-card nearby-empty-state"><span>🚚</span><h2>No operating trucks within ${radius} miles</h2><p>Increase your search radius to see more food trucks.</p></div>`}</div>
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

  function menuForTruck(truckId = selectedTruck().id) {
    const baseMenu = ORDERING_MENU_ITEMS.map(item => ({ ...item, truckId }));
    if (truckId !== TRUCK.id) {
      const cuisineMenu = [
        ...(TRUCK_MENUS[truckId] || []),
        ...(TRUCK_ENTREE_EXTRAS[truckId] || []),
        ...(TRUCK_ADDITIONAL_ENTREES[truckId] || []),
        ...(TRUCK_MENU_EXTRAS[truckId] || [])
      ];
      return (cuisineMenu.length ? cuisineMenu : ORDERING_MENU_ITEMS).map(item => ({ ...item, truckId }));
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
    return [...connectedMenu, ...vendorOnlyItems];
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
    return `<button class="ordering-item-card ${compact ? 'compact' : ''} ${item.available ? '' : 'sold-out'}" data-add-menu-item="${item.id}" type="button" ${item.available ? '' : 'disabled'}>
      <span class="ordering-item-photo" aria-hidden="true">${item.icon}${item.available ? '' : '<b>Sold Out</b>'}</span>
      <span class="ordering-item-copy"><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span><em>${item.calories ? `${item.calories} cal · ` : ''}${customerMoney(item.price)}</em><span class="menu-item-add-label">${requiresChoice ? 'Choose options' : '+ Add'}${cartQuantity ? `<b>${cartQuantity} in cart</b>` : ''}</span></span>
    </button>`;
  }

  function renderTruckProfile() {
    const truck = selectedTruck();
    const details = truckExperienceDetails(truck);
    const menu = menuForTruck();
    const saved = currentAccount.favoriteTrucks.includes(truck.id);
    const profileCollections = [
      ['Featured Items', menu.filter(item => item.featured && item.available)],
      ["Today's Specials", menu.filter(item => item.special && item.available)],
      ['Popular Items', menu.filter(item => item.popular && item.available)]
    ];
    return `<div class="ordering-page truck-profile-page">
      <button class="ordering-back-button" data-customer-page-back="nearby" type="button">← Nearby Trucks</button>
      <section class="truck-profile-hero">
        <div class="truck-profile-logo" aria-hidden="true">${truck.icon || '🚚'}</div>
        <div class="truck-profile-identity"><p>${escapeHtml(truck.cuisine)}</p><h1>${escapeHtml(truck.name)}</h1><div class="truck-rating"><strong>★ ${details.rating}</strong><span>${details.reviews} reviews</span></div></div>
        <button class="truck-profile-favorite ${saved ? 'saved' : ''}" data-toggle-truck-favorite="${truck.id}" type="button">${saved ? '♥ Favorited' : '♡ Favorite'}</button>
        <div class="truck-profile-facts">
          <span><small>Distance</small><strong>${escapeHtml(details.distanceLabel)}</strong></span>
          <span><small>Drive Time</small><strong>${escapeHtml(details.driveTime)}</strong></span>
          <span><small>Status & Hours</small><strong>${escapeHtml(details.status)}</strong></span>
          <span><small>Pickup Time</small><strong>About ${truck.pickupMinutes} min</strong></span>
          ${truck.currentEvent ? `<span><small>Current Event</small><strong>🎪 ${escapeHtml(truck.currentEvent)}</strong></span>` : ''}
        </div>
        <div class="truck-profile-actions">
          <button class="primary-button" data-ordering-action="open-menu" type="button">Order Now</button>
          <button class="secondary-button" data-ordering-action="directions" type="button">Directions</button>
          <button class="secondary-button" data-ordering-action="call" type="button">Call</button>
          <button class="secondary-button" data-ordering-action="share" type="button">Share</button>
        </div>
      </section>
      ${profileCollections.map(([title, items]) => `<section class="ordering-showcase"><div class="ordering-section-heading"><div><p class="eyebrow">From the menu</p><h2>${title}</h2></div><button data-ordering-action="open-menu" type="button">View Full Menu →</button></div><div class="ordering-showcase-grid">${items.slice(0, 3).map(item => orderingItemCard(item, true)).join('')}</div></section>`).join('')}
      <section class="truck-about-card"><div><p class="eyebrow">Our Story</p><h2>About This Truck</h2></div><p>${escapeHtml(truck.name)} serves bold, made-to-order ${truck.cuisine.toLowerCase()} with locally sourced ingredients and friendly neighborhood service. Follow today’s stop, order ahead, and pick up when your meal is ready.</p></section>
    </div>`;
  }

  function renderTruckMenu() {
    const truck = selectedTruck();
    const menu = menuForTruck();
    const categories = [...new Set(menu.map(item => item.category))];
    const hasThisTruckCart = currentAccount.cart.truckId === truck.id;
    const cartCount = hasThisTruckCart ? currentAccount.cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    const cartSubtotal = hasThisTruckCart ? cartTotals().subtotal : 0;
    return `<div class="ordering-page full-menu-page">
      <header class="menu-experience-header">
        <button class="ordering-back-button" data-customer-page-back="truckProfile" type="button">← Truck Profile</button>
        <div><p class="eyebrow">${escapeHtml(truck.cuisine)}</p><h1>${escapeHtml(truck.name)} Menu</h1><p>Tap an item to add it · Keep scrolling while you build your order</p></div>
        <button class="menu-cart-button" data-ordering-action="open-cart" type="button"><span>🛒</span> Cart <b data-live-cart-count>${cartCount}</b></button>
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
    if (!item || !item.available) return false;
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

  function updateContinuousMenuCart() {
    const count = currentAccount.cart.truckId === selectedTruckId ? currentAccount.cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0) : 0;
    const subtotal = count ? cartTotals().subtotal : 0;
    accountContent.querySelectorAll('[data-live-cart-count]').forEach(element => { element.textContent = String(count); });
    accountContent.querySelectorAll('[data-live-cart-noun]').forEach(element => { element.textContent = count === 1 ? 'item' : 'items'; });
    accountContent.querySelectorAll('[data-live-cart-total]').forEach(element => { element.textContent = customerMoney(subtotal); });
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
    const tax = Number((subtotal * 0.06).toFixed(2));
    const serviceFee = subtotal ? 1.49 : 0;
    return { subtotal, tax, serviceFee, total: Number((subtotal + tax + serviceFee).toFixed(2)) };
  }

  function unavailableCartItems() {
    if (!currentAccount?.cart?.items?.length || !currentAccount.cart.truckId) return [];
    const currentMenu = new Map(menuForTruck(currentAccount.cart.truckId).map(item => [item.id, item]));
    return currentAccount.cart.items.filter(item => currentMenu.get(item.menuItemId)?.available === false);
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
        <section class="checkout-card"><span class="checkout-step">4</span><div class="checkout-card-content"><h2>Payment Method</h2>${defaultPayment ? `<label class="checkout-choice"><input name="paymentMethod" value="${defaultPayment.id}" type="radio" checked><span><strong>${escapeHtml(defaultPayment.brand)} ••••${escapeHtml(defaultPayment.last4)}</strong><small>${defaultPayment.isDefault ? 'Default payment method' : `Expires ${escapeHtml(defaultPayment.expiry)}`}</small></span></label>` : '<p>Pay at pickup (prototype).</p>'}<button class="checkout-link" data-customer-action="view-payments" type="button">Manage Payment Methods</button></div></section>
        <section class="checkout-card checkout-fields"><span class="checkout-step">5</span><div class="checkout-card-content"><label for="checkoutPromoCode"><strong>Promo Code</strong></label><div class="promo-row"><input id="checkoutPromoCode" class="customer-input" placeholder="Enter code"><button class="secondary-button" data-ordering-action="apply-promo" type="button">Apply</button></div><label for="checkoutOrderNotes"><strong>Order Notes</strong></label><textarea id="checkoutOrderNotes" class="customer-textarea" rows="3" maxlength="300" placeholder="Notes for the truck team"></textarea><p id="checkoutMessage" class="form-message"></p></div></section>
      </div><aside class="checkout-order-summary"><p class="order-number-banner"><small>Order Number</small><strong>${orderNumberLabel(currentAccount.cart.orderNumber)}</strong></p><p class="eyebrow">Final Summary</p><h2>${escapeHtml(truck.name)}</h2>${currentAccount.cart.items.map(item => `<div class="checkout-item-line"><span>${item.quantity}× ${escapeHtml(item.name)}</span><strong>${customerMoney(cartItemUnitPrice(item) * item.quantity)}</strong></div>`).join('')}${checkoutSummaryMarkup(totals)}<button class="primary-button full" type="submit">Place Order</button><button class="secondary-button full" data-customer-page-back="cart" type="button">Back to Cart</button></aside></div></form>
    </div>`;
  }

  function confirmationOrder() {
    return currentAccount.orders.find(order => order.id === lastPlacedOrderId) || currentAccount.orders[0];
  }

  function isOrderCancellable(order) {
    return Boolean(order && ['received', 'new'].includes(order.status));
  }

  function cancelOrderModal(order) {
    if (!isOrderCancellable(order)) {
      customerToast('This order is already being prepared and can no longer be cancelled automatically.');
      return;
    }
    openModal(`<div class="cancel-order-modal"><p class="eyebrow">Cancel ${orderNumberLabel(order.id)}</p><h2 id="customerModalTitle">Cancel this order?</h2><p>${escapeHtml(order.truckName)} has received your order but has not started preparing it.</p><div class="refund-summary"><span>Full refund</span><strong>${customerMoney(order.total)}</strong></div><p class="muted">The cancellation and full refund are recorded in this browser-local beta. No real payment processor is connected yet.</p><div class="customer-form-actions"><button class="secondary-button" data-close-customer-modal type="button">Keep My Order</button><button class="customer-small-button danger" data-confirm-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order &amp; Refund</button></div></div>`);
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
      settings: renderSettings
    };
    accountContent.innerHTML = (renderers[page] || renderers.overview)();
    updateCartBadge();
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
    return `<article class="customer-card customer-order-card"><div><span class="status-pill ${isPast ? 'past' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(order.statusLabel)}</span><h3>${escapeHtml(order.truckName)} · ${orderNumberLabel(order.id)}</h3><p class="muted">${formatDate(order.createdAt)}</p><div class="order-item-summary">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(' · ')}</div>${order.status === 'cancelled' ? `<p class="refund-confirmation">Full refund: ${customerMoney(order.refund?.amount || order.total)}</p>` : ''}</div><div><div class="order-total">${customerMoney(order.total)}</div><div class="customer-card-actions"><button class="customer-small-button" data-order-details="${escapeHtml(order.id)}" type="button">Order Details</button>${isOrderCancellable(order) ? `<button class="customer-small-button danger" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order</button>` : ''}${order.status === 'completed' ? `<button class="customer-small-button" data-receipt="${escapeHtml(order.id)}" type="button">Receipt</button><button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Reorder</button><button class="customer-small-button" data-toggle-order-favorite="${escapeHtml(order.id)}" type="button">${isFavorite ? '♥ Saved' : '♡ Save Favorite'}</button>` : ''}${order.status === 'cancelled' ? `<button class="customer-small-button primary" data-reorder="${escapeHtml(order.id)}" type="button">Order Again</button>` : ''}</div></div></article>`;
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
    const latestOrder = currentAccount.orders[0];
    const rows = [
      ['orderUpdates', 'Order Updates', 'Status changes, pickup readiness, and order confirmations.'],
      ['promotions', 'Promotions', 'Occasional offers and FoodTrekNow news.'],
      ['favoriteTrucks', 'Favorite Truck Notifications', 'Opening hours, new menu items, and availability from saved trucks.'],
      ['push', 'Push Notifications', 'UI-only preference until push delivery is connected.']
    ];
    return `${pageHeader('Stay in the Loop', 'Notifications', 'Choose which updates you would like to receive.')}${latestOrder ? `<section class="customer-card order-notification-card"><p class="eyebrow">Latest Order Update</p><h2>${orderNumberLabel(latestOrder.id)} · ${escapeHtml(latestOrder.statusLabel)}</h2><p>${escapeHtml(latestOrder.truckName)} is keeping this same number through pickup.</p></section>` : ''}<section class="customer-card">${rows.map(([key, title, copy]) => `<div class="setting-row"><div><strong>${title}</strong><small>${copy}</small></div><label class="customer-switch" aria-label="${title}"><input type="checkbox" data-notification-setting="${key}" ${preferences[key] ? 'checked' : ''}><span></span></label></div>`).join('')}</section>`;
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
    openModal(`<div class="customer-receipt"><div class="receipt-brand"><p class="eyebrow">${receiptOnly ? 'Receipt' : 'Order Details'}</p><h2 id="customerModalTitle">${escapeHtml(order.truckName)}</h2><p>${orderNumberLabel(order.id)} · ${formatDate(order.createdAt)}</p><span class="status-pill ${['completed', 'cancelled'].includes(order.status) ? 'past' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(order.statusLabel)}</span></div><h3>Items</h3>${itemLines}<div class="receipt-line"><span>Subtotal</span><strong>${customerMoney(order.subtotal)}</strong></div><div class="receipt-line"><span>Tax</span><strong>${customerMoney(order.tax)}</strong></div><div class="receipt-line receipt-total"><strong>Total</strong><strong>${customerMoney(order.total)}</strong></div>${order.status === 'cancelled' ? `<div class="receipt-line refund-line"><strong>Full Refund</strong><strong>−${customerMoney(order.refund?.amount || order.total)}</strong></div>` : ''}<p class="muted">${order.status === 'cancelled' ? 'Refund recorded to the original payment method in this browser-local beta.' : receiptOnly ? 'Paid · Customer receipt view' : 'Pickup status updates appear in your account and notification preferences.'}</p>${isOrderCancellable(order) ? `<button class="customer-small-button danger full" data-cancel-order="${escapeHtml(order.id)}" type="button">Cancel Order &amp; Full Refund</button>` : ''}${order.status === 'completed' ? `<button class="primary-button full" data-reorder="${escapeHtml(order.id)}" type="button">Reorder This Meal</button>` : ''}</div>`);
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
    const wasGuest = Boolean(currentAccount?.isGuest);
    clearSession();
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    currentAccount = null;
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
        renderCustomerPage('truckProfile');
      }
      return;
    }
    const nearbyDirections = event.target.closest('[data-nearby-directions]');
    if (nearbyDirections) {
      const truck = TRUCKS.find(item => item.id === nearbyDirections.dataset.nearbyDirections);
      if (truck) customerToast(`Directions to ${truck.name} will be available with Google Maps.`);
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
      renderCustomerPage('truckProfile');
      return;
    }
    const addMenuItemButton = event.target.closest('[data-add-menu-item]');
    if (addMenuItemButton) {
      const item = menuForTruck().find(menuItem => menuItem.id === addMenuItemButton.dataset.addMenuItem);
      if (item?.requiredChoices?.length) requiredOptionsModal(item);
      else addMenuItem(item);
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
      if (item) item.quantity = Math.max(1, Math.min(99, item.quantity + Number(cartQuantity.dataset.quantityChange || 0)));
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
      if (!currentAccount.cart.items.length) currentAccount.cart.truckId = null;
      CustomerOrderingService.saveCart(currentAccount, currentAccount.cart);
      renderCustomerPage('cart');
      return;
    }
    const orderAgain = event.target.closest('[data-order-again]');
    if (orderAgain) {
      const order = currentAccount.orders.find(item => item.id === orderAgain.dataset.orderAgain);
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
        renderCustomerPage('truckProfile');
      }
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
      CustomerOrderingService.placeOrder(currentAccount, order);
      syncPlacedOrderToVendor(order);
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
    const cancelOrder = event.target.closest('[data-cancel-order]');
    if (cancelOrder) cancelOrderModal(currentAccount.orders.find(order => String(order.id) === String(cancelOrder.dataset.cancelOrder)));
    const confirmCancelOrder = event.target.closest('[data-confirm-cancel-order]');
    if (confirmCancelOrder) {
      const order = CustomerOrderingService.cancelOrder(currentAccount, confirmCancelOrder.dataset.confirmCancelOrder);
      if (!order) {
        closeModal();
        customerToast('This order can no longer be cancelled automatically.');
        return;
      }
      syncCancelledOrderToVendor(order);
      lastPlacedOrderId = order.id;
      closeModal();
      orderHistoryFilter = 'past';
      renderCustomerPage('orders');
      customerToast(`${orderNumberLabel(order.id)} cancelled. Full refund: ${customerMoney(order.refund.amount)}.`);
    }
  });

  modalContent.addEventListener('submit', async event => {
    event.preventDefault();
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
      renderCustomerPage(currentPage === 'nearby' ? 'nearby' : 'overview');
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
  } else if (sessionStorage.getItem(GUEST_SESSION_KEY) === 'true' && localStorage.getItem('ftnVendorLoggedIn') !== 'true') {
    openCustomerAccount(readGuestCustomer(), 'nearby');
  }
})();
