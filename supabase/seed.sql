-- ============================================================
-- Демо-данные (опционально): подарки, варианты и кейс.
-- Гифки замените на свои (загрузка через админку -> Supabase Storage).
-- ============================================================

with g as (
  insert into public.gifts (name, description, gif_url, rarity, price_stars, supply_limit) values
    ('Плюшевый Мишка', 'Классика жанра', 'https://media.tenor.com/images/teddy.gif', 'common', 120, null),
    ('Кристальная Роза', 'Сверкает на солнце', 'https://media.tenor.com/images/rose.gif', 'rare', 450, 5000),
    ('Неоновый Дракон', 'Дышит кибер-огнём', 'https://media.tenor.com/images/dragon.gif', 'epic', 1200, 800),
    ('Золотая Комета', 'Одна на миллион', 'https://media.tenor.com/images/comet.gif', 'legendary', 5000, 100)
  returning id, name
)
insert into public.gift_variants (gift_id, name, rarity)
select id, v.name, v.rarity
from g
cross join lateral (values
  ('Классический', null),
  ('Полночный', 'rare')
) as v(name, rarity);

with c as (
  insert into public.cases (name, image_url, price_stars)
  values ('Стартовый кейс', null, 300)
  returning id
)
insert into public.case_items (case_id, gift_id, weight)
select c.id, g.id,
  case g.rarity
    when 'common' then 60
    when 'rare' then 28
    when 'epic' then 10
    else 2
  end
from c cross join public.gifts g;
