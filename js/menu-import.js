(function (root) {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value).toLowerCase();
  const aliases = {
    category: ['category', 'menu category'], name: ['name', 'item', 'item name', 'menu item'], description: ['description', 'item description'],
    price: ['price', 'base price'], available: ['available', 'availability'], featured: ['featured'], sizeOptions: ['size options', 'sizes', 'size pricing'],
    addOnLabel: ['add-on label', 'addon label', 'option label', 'condiment label'], addOns: ['add-ons', 'addons', 'options', 'condiments'], image: ['image url', 'image']
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], value = '', quoted = false;
    const source = String(text ?? '').replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
        else if (character === '"') quoted = false;
        else value += character;
      } else if (character === '"') quoted = true;
      else if (character === ',') { row.push(value); value = ''; }
      else if (character === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
      else value += character;
    }
    row.push(value.replace(/\r$/, ''));
    if (row.some(cell => clean(cell))) rows.push(row);
    return rows;
  }

  function optionList(value) {
    if (!clean(value)) return [];
    const options = clean(value).split('|').map(part => {
      const separator = part.lastIndexOf(':');
      const name = clean(separator >= 0 ? part.slice(0, separator) : part);
      const price = Number(clean(separator >= 0 ? part.slice(separator + 1) : '0').replace(/^\$/, ''));
      return { name, price };
    });
    const names = new Set();
    return options.filter(option => option.name && Number.isFinite(option.price) && option.price >= 0 && !names.has(key(option.name)) && names.add(key(option.name)));
  }

  function booleanValue(value, fallback) {
    if (!clean(value)) return fallback;
    return !['false', 'no', 'n', '0', 'sold out', 'unavailable'].includes(key(value));
  }

  function importMenuCsv(text, existingItems = [], existingCategories = [], mode = 'merge') {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('The CSV file must include a header row and at least one menu item.');
    const headers = rows[0].map(key);
    const column = field => headers.findIndex(header => (aliases[field] || []).includes(header));
    if (column('name') < 0 || column('category') < 0) throw new Error('The CSV needs Item Name and Category columns.');
    const sourceItems = mode === 'replace' ? [] : existingItems.map(item => ({ ...item }));
    const categories = mode === 'replace' ? [] : [...existingCategories];
    let nextId = existingItems.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1;
    let added = 0, updated = 0, skipped = 0;
    const errors = [];
    rows.slice(1).forEach((row, offset) => {
      if (!row.some(cell => clean(cell))) return;
      const get = field => { const index = column(field); return index < 0 ? '' : row[index]; };
      const name = clean(get('name')), category = clean(get('category'));
      const priceText = clean(get('price')).replace(/^\$/, '');
      const price = priceText === '' ? 0 : Number(priceText);
      const sizeOptions = optionList(get('sizeOptions'));
      if (!name || !category || !Number.isFinite(price) || price < 0) {
        skipped += 1;
        errors.push(`Row ${offset + 2}: enter an item name, category, and valid non-negative price.`);
        return;
      }
      const categoryMatch = categories.find(item => key(item) === key(category));
      const resolvedCategory = categoryMatch || category;
      if (!categoryMatch) categories.push(category);
      const existing = sourceItems.find(item => key(item.name) === key(name) && key(item.category) === key(resolvedCategory));
      const item = { id: existing?.id || nextId++, name, category: resolvedCategory, description: clean(get('description')),
        price: sizeOptions.length ? Math.min(...sizeOptions.map(option => option.price)) : price,
        available: booleanValue(get('available'), true), featured: booleanValue(get('featured'), false), image: clean(get('image')) || existing?.image || '',
        sizeOptions, addOnLabel: clean(get('addOnLabel')) || 'Add-ons', addOns: optionList(get('addOns')), order: existing?.order || sourceItems.length + 1 };
      if (existing) { Object.assign(existing, item); updated += 1; }
      else { sourceItems.push(item); added += 1; }
    });
    sourceItems.forEach((item, index) => { item.order = index + 1; });
    return { items: sourceItems, categories, summary: { added, updated, skipped }, errors };
  }

  const template = 'Category,Item Name,Description,Base Price,Available,Featured,Size Options,Add-on Label,Add-ons,Image URL\nEntrees,Steak Dinner,Grilled steak with two sides,24.00,Yes,Yes,8 oz:24.00|12 oz:31.00,Add to your meal,Crab:12.00|Mushrooms:2.00,\nDrinks,Milkshake,Hand-spun milkshake,6.00,Yes,No,Small:6.00|Medium:7.50|Large:9.00,Choose a flavor,Vanilla:0|Chocolate:0|Strawberry:0,';
  root.FoodTrekNowMenuImport = { parseCsv, importMenuCsv, template };
})(typeof window === 'undefined' ? globalThis : window);
