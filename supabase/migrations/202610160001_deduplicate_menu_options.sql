-- Remove existing duplicate menu choices while keeping the first configured
-- spelling and price. The clients also enforce this rule for future updates.

update public.menu_items as menu_item
set size_options = coalesce((
      select jsonb_agg(deduplicated.option_value order by deduplicated.first_position)
      from (
        select distinct on (lower(btrim(option_value ->> 'name')))
          option_value,
          position as first_position
        from jsonb_array_elements(
          case when jsonb_typeof(menu_item.size_options) = 'array' then menu_item.size_options else '[]'::jsonb end
        ) with ordinality as configured(option_value, position)
        where btrim(coalesce(option_value ->> 'name', '')) <> ''
        order by lower(btrim(option_value ->> 'name')), position
      ) as deduplicated
    ), '[]'::jsonb),
    add_ons = coalesce((
      select jsonb_agg(deduplicated.option_value order by deduplicated.first_position)
      from (
        select distinct on (lower(btrim(option_value ->> 'name')))
          option_value,
          position as first_position
        from jsonb_array_elements(
          case when jsonb_typeof(menu_item.add_ons) = 'array' then menu_item.add_ons else '[]'::jsonb end
        ) with ordinality as configured(option_value, position)
        where btrim(coalesce(option_value ->> 'name', '')) <> ''
        order by lower(btrim(option_value ->> 'name')), position
      ) as deduplicated
    ), '[]'::jsonb);
