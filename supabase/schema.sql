-- ============================================================
-- Star Gifts Market — схема Supabase (Postgres)
-- Выполнить в SQL Editor проекта Supabase ОДИН раз.
-- Вся игровая логика (баланс, лимиты, кейсы) — атомарные
-- SQL-функции, вызываемые СЕРВЕРОМ через service role.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Таблицы
-- ------------------------------------------------------------

create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  tg_id       bigint unique not null,
  username    text,
  first_name  text,
  photo_url   text,
  stars       bigint not null default 0 check (stars >= 0),
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.gifts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  gif_url      text not null,
  rarity       text not null default 'common'
               check (rarity in ('common','rare','epic','legendary')),
  price_stars  bigint not null check (price_stars >= 0),
  supply_limit integer,               -- null = без лимита тиража
  minted       integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.gift_variants (
  id         uuid primary key default gen_random_uuid(),
  gift_id    uuid not null references public.gifts(id) on delete cascade,
  name       text not null,            -- окрас / вариант
  gif_url    text,                     -- опциональная гифка варианта
  rarity     text check (rarity in ('common','rare','epic','legendary')),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  gift_id       uuid not null references public.gifts(id),
  variant_id    uuid references public.gift_variants(id),
  tier          integer not null default 1 check (tier between 1 and 5),
  acquired_from text not null check (acquired_from in ('shop','market','case','admin')),
  is_listed     boolean not null default false,
  acquired_at   timestamptz not null default now()
);
create index if not exists inventory_user_idx on public.inventory(user_id);

create table if not exists public.market_listings (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.inventory(id),
  seller_id   uuid not null references public.users(id),
  buyer_id    uuid references public.users(id),
  price_stars bigint not null check (price_stars > 0),
  status      text not null default 'active'
              check (status in ('active','sold','cancelled','removed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index if not exists market_status_idx on public.market_listings(status);

create table if not exists public.cases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text,
  price_stars bigint not null check (price_stars > 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.case_items (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  gift_id    uuid not null references public.gifts(id),
  variant_id uuid references public.gift_variants(id),
  weight     numeric not null check (weight > 0)  -- вес вероятности
);

create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id),
  amount     bigint not null,          -- со знаком: + начисление / - списание
  type       text not null check (type in
             ('onboarding','shop_purchase','market_sale','market_purchase','case_open','admin_grant')),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

-- Гибкие роли/права: добавляйте новые роли и permission-строки
-- без изменения схемы. '*' = все права.
create table if not exists public.admin_roles (
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.role_permissions (
  role       text not null,
  permission text not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  ('admin', '*'),
  ('moderator', 'market.moderate'),
  ('moderator', 'users.ban')
on conflict do nothing;

-- ------------------------------------------------------------
-- RLS: закрываем всё. К БД ходит только сервер (service role),
-- который RLS обходит. Анонимный/клиентский доступ запрещён.
-- ------------------------------------------------------------
alter table public.users            enable row level security;
alter table public.gifts            enable row level security;
alter table public.gift_variants    enable row level security;
alter table public.inventory        enable row level security;
alter table public.market_listings  enable row level security;
alter table public.cases            enable row level security;
alter table public.case_items       enable row level security;
alter table public.transactions     enable row level security;
alter table public.admin_roles      enable row level security;
alter table public.role_permissions enable row level security;

-- ------------------------------------------------------------
-- Функции (атомарные операции, блокировки FOR UPDATE)
-- ------------------------------------------------------------

-- Онбординг: создаёт пользователя и начисляет 1000 звёзд один раз
create or replace function public.fn_ensure_user(
  p_tg_id bigint, p_username text, p_first_name text, p_photo_url text
) returns public.users language plpgsql as $$
declare v_user public.users;
begin
  select * into v_user from public.users where tg_id = p_tg_id;
  if found then
    update public.users set
      username   = coalesce(p_username, username),
      first_name = coalesce(p_first_name, first_name),
      photo_url  = coalesce(p_photo_url, photo_url)
    where id = v_user.id
    returning * into v_user;
    return v_user;
  end if;

  insert into public.users (tg_id, username, first_name, photo_url, stars)
  values (p_tg_id, p_username, p_first_name, p_photo_url, 1000)
  returning * into v_user;

  insert into public.transactions (user_id, amount, type, meta)
  values (v_user.id, 1000, 'onboarding', '{}'::jsonb);

  return v_user;
end $$;

-- Покупка в каталоге: баланс + лимит тиража проверяются в транзакции
create or replace function public.fn_purchase_gift(
  p_user_id uuid, p_gift_id uuid, p_variant_id uuid default null
) returns public.inventory language plpgsql as $$
declare v_gift public.gifts; v_user public.users; v_item public.inventory;
begin
  select * into v_gift from public.gifts
   where id = p_gift_id and is_active for update;
  if not found then raise exception 'GIFT_NOT_FOUND'; end if;

  if v_gift.supply_limit is not null and v_gift.minted >= v_gift.supply_limit then
    raise exception 'SOLD_OUT';
  end if;

  if p_variant_id is not null and not exists (
    select 1 from public.gift_variants where id = p_variant_id and gift_id = p_gift_id
  ) then raise exception 'VARIANT_NOT_FOUND'; end if;

  select * into v_user from public.users where id = p_user_id for update;
  if not found or v_user.is_banned then raise exception 'USER_BLOCKED'; end if;
  if v_user.stars < v_gift.price_stars then raise exception 'NOT_ENOUGH_STARS'; end if;

  update public.users set stars = stars - v_gift.price_stars where id = p_user_id;
  update public.gifts set minted = minted + 1 where id = p_gift_id;

  insert into public.inventory (user_id, gift_id, variant_id, acquired_from)
  values (p_user_id, p_gift_id, p_variant_id, 'shop')
  returning * into v_item;

  insert into public.transactions (user_id, amount, type, meta)
  values (p_user_id, -v_gift.price_stars, 'shop_purchase',
          jsonb_build_object('gift_id', p_gift_id, 'item_id', v_item.id));

  return v_item;
end $$;

-- Выставить предмет на маркет
create or replace function public.fn_create_listing(
  p_user_id uuid, p_item_id uuid, p_price bigint
) returns public.market_listings language plpgsql as $$
declare v_item public.inventory; v_listing public.market_listings;
begin
  if p_price <= 0 then raise exception 'BAD_PRICE'; end if;

  select * into v_item from public.inventory
   where id = p_item_id and user_id = p_user_id for update;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if v_item.is_listed then raise exception 'ALREADY_LISTED'; end if;

  update public.inventory set is_listed = true where id = p_item_id;

  insert into public.market_listings (item_id, seller_id, price_stars)
  values (p_item_id, p_user_id, p_price)
  returning * into v_listing;

  return v_listing;
end $$;

-- Снять лот (владелец — 'cancelled', модератор — 'removed')
create or replace function public.fn_close_listing(
  p_listing_id uuid, p_actor_id uuid, p_as_moderator boolean default false
) returns void language plpgsql as $$
declare v_listing public.market_listings;
begin
  select * into v_listing from public.market_listings
   where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception 'LISTING_NOT_ACTIVE'; end if;
  if not p_as_moderator and v_listing.seller_id <> p_actor_id then
    raise exception 'NOT_YOUR_LISTING';
  end if;

  update public.market_listings
     set status = case when p_as_moderator then 'removed' else 'cancelled' end,
         closed_at = now()
   where id = p_listing_id;

  update public.inventory set is_listed = false where id = v_listing.item_id;
end $$;

-- Покупка лота на маркете: перевод звёзд + передача предмета
create or replace function public.fn_buy_listing(
  p_buyer_id uuid, p_listing_id uuid
) returns public.inventory language plpgsql as $$
declare v_listing public.market_listings; v_buyer public.users; v_item public.inventory;
begin
  select * into v_listing from public.market_listings
   where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception 'LISTING_NOT_ACTIVE'; end if;
  if v_listing.seller_id = p_buyer_id then raise exception 'OWN_LISTING'; end if;

  select * into v_buyer from public.users where id = p_buyer_id for update;
  if not found or v_buyer.is_banned then raise exception 'USER_BLOCKED'; end if;
  if v_buyer.stars < v_listing.price_stars then raise exception 'NOT_ENOUGH_STARS'; end if;

  update public.users set stars = stars - v_listing.price_stars where id = p_buyer_id;
  update public.users set stars = stars + v_listing.price_stars where id = v_listing.seller_id;

  update public.inventory
     set user_id = p_buyer_id, is_listed = false, acquired_from = 'market'
   where id = v_listing.item_id
  returning * into v_item;

  update public.market_listings
     set status = 'sold', buyer_id = p_buyer_id, closed_at = now()
   where id = p_listing_id;

  insert into public.transactions (user_id, amount, type, meta) values
    (p_buyer_id, -v_listing.price_stars, 'market_purchase',
     jsonb_build_object('listing_id', p_listing_id, 'item_id', v_listing.item_id)),
    (v_listing.seller_id, v_listing.price_stars, 'market_sale',
     jsonb_build_object('listing_id', p_listing_id, 'item_id', v_listing.item_id));

  return v_item;
end $$;

-- Прокачка (бесплатная): шанс успеха падает с уровнем.
-- tier 1->2: 100%, 2->3: 65%, 3->4: 40%, 4->5: 20%. Максимум — tier 5.
create or replace function public.fn_upgrade_item(
  p_user_id uuid, p_item_id uuid
) returns jsonb language plpgsql as $$
declare v_item public.inventory; v_chance numeric; v_success boolean;
begin
  select * into v_item from public.inventory
   where id = p_item_id and user_id = p_user_id for update;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if v_item.is_listed then raise exception 'ITEM_LISTED'; end if;
  if v_item.tier >= 5 then raise exception 'MAX_TIER'; end if;

  v_chance := case v_item.tier
    when 1 then 1.00
    when 2 then 0.65
    when 3 then 0.40
    else 0.20
  end;

  v_success := random() < v_chance;
  if v_success then
    update public.inventory set tier = tier + 1
     where id = p_item_id returning * into v_item;
  end if;

  return jsonb_build_object('success', v_success, 'tier', v_item.tier);
end $$;

-- Открытие кейса: списание звёзд + взвешенный рандом — всё на сервере
create or replace function public.fn_open_case(
  p_user_id uuid, p_case_id uuid
) returns jsonb language plpgsql as $$
declare
  v_case public.cases; v_user public.users;
  v_total numeric; v_roll numeric;
  v_ci_id uuid; v_gift_id uuid; v_variant_id uuid;
  v_item public.inventory; v_balance bigint;
begin
  select * into v_case from public.cases where id = p_case_id and is_active;
  if not found then raise exception 'CASE_NOT_FOUND'; end if;

  select * into v_user from public.users where id = p_user_id for update;
  if not found or v_user.is_banned then raise exception 'USER_BLOCKED'; end if;
  if v_user.stars < v_case.price_stars then raise exception 'NOT_ENOUGH_STARS'; end if;

  select sum(weight) into v_total from public.case_items where case_id = p_case_id;
  if v_total is null or v_total <= 0 then raise exception 'CASE_EMPTY'; end if;

  v_roll := random() * v_total;

  select t.id, t.gift_id, t.variant_id
    into v_ci_id, v_gift_id, v_variant_id
  from (
    select id, gift_id, variant_id,
           sum(weight) over (order by id) as cum
    from public.case_items where case_id = p_case_id
  ) t
  where t.cum >= v_roll
  order by t.cum
  limit 1;

  update public.users set stars = stars - v_case.price_stars
   where id = p_user_id returning stars into v_balance;

  insert into public.inventory (user_id, gift_id, variant_id, acquired_from)
  values (p_user_id, v_gift_id, v_variant_id, 'case')
  returning * into v_item;

  insert into public.transactions (user_id, amount, type, meta)
  values (p_user_id, -v_case.price_stars, 'case_open',
          jsonb_build_object('case_id', p_case_id, 'won_item_id', v_item.id,
                             'gift_id', v_gift_id));

  return jsonb_build_object(
    'item_id', v_item.id,
    'gift_id', v_gift_id,
    'variant_id', v_variant_id,
    'case_item_id', v_ci_id,
    'balance', v_balance
  );
end $$;

-- Админ: начисление/списание звёзд (с логом в transactions)
create or replace function public.fn_adjust_stars(
  p_user_id uuid, p_amount bigint, p_meta jsonb default '{}'::jsonb
) returns bigint language plpgsql as $$
declare v_balance bigint;
begin
  update public.users set stars = stars + p_amount
   where id = p_user_id returning stars into v_balance;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  insert into public.transactions (user_id, amount, type, meta)
  values (p_user_id, p_amount, 'admin_grant', p_meta);

  return v_balance;
end $$;

-- Админ: выдать подарок напрямую (в обход покупки и лимита)
create or replace function public.fn_grant_gift(
  p_user_id uuid, p_gift_id uuid, p_variant_id uuid default null
) returns public.inventory language plpgsql as $$
declare v_item public.inventory;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;
  if not exists (select 1 from public.gifts where id = p_gift_id) then
    raise exception 'GIFT_NOT_FOUND';
  end if;

  update public.gifts set minted = minted + 1 where id = p_gift_id;

  insert into public.inventory (user_id, gift_id, variant_id, acquired_from)
  values (p_user_id, p_gift_id, p_variant_id, 'admin')
  returning * into v_item;

  return v_item;
end $$;

-- Проверка права (гибкая модель ролей)
create or replace function public.fn_has_permission(
  p_user_id uuid, p_permission text
) returns boolean language sql stable as $$
  select exists (
    select 1
    from public.admin_roles ar
    join public.role_permissions rp on rp.role = ar.role
    where ar.user_id = p_user_id
      and (rp.permission = '*' or rp.permission = p_permission)
  );
$$;

-- ------------------------------------------------------------
-- Storage: бакет для гифок подарков (публичное чтение,
-- запись только через service role из админ-API)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gifts', 'gifts', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- После первого /start в боте назначьте себя админом:
-- insert into public.admin_roles (user_id, role)
-- select id, 'admin' from public.users where tg_id = <ВАШ_TELEGRAM_ID>;
-- ------------------------------------------------------------
