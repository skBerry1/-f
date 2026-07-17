# ⭐ Star Gifts Market

Сайт + Telegram-бот + админка в ОДНОМ Next.js-проекте на Vercel.
Маркет подарков за звёзды: каталог, инвентарь, маркетплейс, кейсы, прокачка.

## Архитектура

```
Vercel проект (один репозиторий)
├── src/app                    → страницы (каталог / инвентарь / маркет / кейсы / профиль)
├── src/app/admin              → админ-панель (доступ по ролям из БД)
├── src/app/api/bot/webhook    → Telegram-бот (grammY, webhookCallback, без long polling)
├── src/app/api/...            → API покупки/продажи/прокачки/кейсов (вся валидация на сервере)
└── Supabase (Postgres + Storage) — общая БД для всего
```

Ключевые решения по безопасности:

- Клиент НИКОГДА не ходит в Supabase напрямую. RLS закрыт для всех; все операции идут через серверные API-роуты с service role key.
- Баланс, лимиты тиража, шансы кейсов — атомарные SQL-функции с `FOR UPDATE` (гонки и дабл-спенд исключены на уровне БД).
- Авторизация — Telegram WebApp `initData` с проверкой HMAC-подписи на сервере, далее httpOnly-cookie сессия. Никаких паролей в чате.
- Webhook бота можно дополнительно защитить `secret_token` (необязательно, переменная `BOT_WEBHOOK_SECRET`).
- Гибкие роли: `admin_roles` + `role_permissions` (право `*` = всё). Новые права добавляются строками в БД без миграций.

## Дизайн-система

- Фон `#0B0C14` (графит с сине-фиолетовым подтоном) + мягкие радиальные градиентные пятна.
- Акцентный градиент голубой `#5EA2FF` → фиолетовый `#8B6CFF`; золото `#F6C453` для legendary.
- Glassmorphism: `rgba(255,255,255,.04)` + `backdrop-blur` + обводка 1px `rgba(255,255,255,.08)`.
- Шрифт Manrope (next/font), заголовки с tracking -0.02em.
- Редкости: common `#8FA0B8` / rare `#5EA2FF` / epic `#B06CFF` / legendary `#F6C453`.
- Мобильный приоритет: нижняя таб-навигация, safe-area отступы, тач-зоны >= 44px. На десктопе — верхняя навигация и сетка 2–5 колонок.
- Анимации framer-motion: hover/tap на карточках, партиклы при покупке, горизонтальная рулетка при открытии кейса.

## Установка за 5 шагов

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. В SQL Editor выполните `supabase/schema.sql` (таблицы + функции + RLS + бакет storage).
3. Опционально — `supabase/seed.sql` для демо-данных.

### 2. Telegram-бот

1. Создайте бота у [@BotFather](https://t.me/BotFather) → получите токен.
2. Там же: `/setmenubutton` → укажите URL вашего деплоя — кнопка меню откроет сайт как Mini App.

### 3. Vercel — переменные окружения

Обязательных всего 4:

| Переменная | Откуда |
|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `NEXT_PUBLIC_APP_URL` | https://ваш-домен.vercel.app (без слэша) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role, СЕКРЕТ) |

Необязательные (можно вообще не заводить):

| Переменная | Зачем |
|---|---|
| `BOT_WEBHOOK_SECRET` | доп. защита вебхука; если задана — добавьте `&secret_token=...` в setWebhook |
| `SESSION_SECRET` | свой ключ подписи cookie; по умолчанию выводится из токена бота |

### 4. Деплой

```bash
npm install
npm run dev        # локально (нужен .env по образцу .env.example)
# деплой: git push в репозиторий, подключённый к Vercel
```

### 5. Регистрация webhook (один раз после деплоя)

Нужны только токен бота и ссылка на сайт — откройте эту ссылку в браузере (можно прямо с телефона):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ваш-домен>.vercel.app/api/bot/webhook
```

Проверить: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

Если задавали `BOT_WEBHOOK_SECRET` — добавьте к первой ссылке `&secret_token=<BOT_WEBHOOK_SECRET>`.

### Назначить себя админом

Отправьте боту `/start`, затем в SQL Editor:

```sql
insert into public.admin_roles (user_id, role)
select id, 'admin' from public.users where tg_id = <ВАШ_TELEGRAM_ID>;
```

После этого в профиле появится ссылка на `/admin`, а в боте заработает `/give_stars <tg_id> <сумма>`.

## Как работает авторизация

1. Пользователь открывает сайт из бота (кнопка Mini App).
2. Клиент отправляет `window.Telegram.WebApp.initData` на `POST /api/auth/telegram`.
3. Сервер проверяет HMAC-SHA256 подпись initData токеном бота и свежесть `auth_date`.
4. Создаёт/обновляет пользователя (`fn_ensure_user`, +1000 звёзд при первом входе) и ставит подписанную httpOnly-cookie на 30 дней.
5. Все игровые API читают сессию из cookie — клиентским данным не доверяем.

## Структура API

| Роут | Назначение |
|---|---|
| `POST /api/auth/telegram` | вход по initData |
| `POST /api/auth/logout` | выход |
| `GET  /api/me` | текущий пользователь + баланс |
| `POST /api/shop/buy` | покупка подарка из каталога |
| `POST /api/market/list` | выставить предмет |
| `POST /api/market/buy` | купить лот |
| `POST /api/market/cancel` | снять свой лот |
| `POST /api/inventory/upgrade` | прокачка предмета |
| `POST /api/cases/open` | открыть кейс |
| `POST /api/bot/webhook` | апдейты Telegram |
| `POST /api/admin/*` | админ-операции (проверка прав через fn_has_permission) |

## Правило прокачки

Апгрейд бесплатный, tier 1–5. Шанс успеха: 1→2 — 100%, 2→3 — 65%, 3→4 — 40%, 4→5 — 20%. При неудаче предмет не теряется. Шансы зашиты в `fn_upgrade_item` — меняются одним UPDATE функции без редеплоя.
