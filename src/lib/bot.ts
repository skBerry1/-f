import { Bot, InlineKeyboard } from "grammy";
import { supabaseAdmin } from "./supabase";

/**
 * Telegram-бот (grammY). Запускается БЕЗ long polling — только через
 * webhookCallback в /api/bot/webhook (см. src/app/api/bot/webhook/route.ts).
 */
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN ?? "unset");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function webAppKeyboard() {
  return new InlineKeyboard().webApp("⭐ Открыть маркет", APP_URL);
}

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const { data: user, error } = await supabaseAdmin().rpc("fn_ensure_user", {
    p_tg_id: from.id,
    p_username: from.username ?? null,
    p_first_name: from.first_name ?? null,
    p_photo_url: null,
  });
  if (error) {
    console.error("fn_ensure_user failed:", error);
    await ctx.reply("⚠️ Ошибка регистрации, попробуйте позже.");
    return;
  }

  const isNew =
    user && Date.now() - new Date(user.created_at).getTime() < 15_000;

  await ctx.reply(
    (isNew
      ? `🎉 Добро пожаловать, ${from.first_name}!\n\n` +
        `Тебе начислено ⭐ 1000 звёзд на старт.\n`
      : `С возвращением, ${from.first_name}!\n` +
        `Твой баланс: ⭐ ${user?.stars ?? 0}\n`) +
      `\nЖми кнопку ниже — сайт откроется как Mini App,\n` +
      `авторизация пройдёт автоматически — без паролей.`,
    { reply_markup: webAppKeyboard() }
  );
});

bot.command("balance", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const { data } = await supabaseAdmin()
    .from("users")
    .select("stars")
    .eq("tg_id", from.id)
    .maybeSingle();
  await ctx.reply(
    data ? `Твой баланс: ⭐ ${data.stars}` : "Сначала отправь /start",
    { reply_markup: data ? webAppKeyboard() : undefined }
  );
});

/**
 * Админ-команда: /give_stars <tg_id> <сумма>
 * Основная админка — на сайте (/admin), это дубль для быстрых выдач.
 */
bot.command("give_stars", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const sb = supabaseAdmin();

  const { data: admin } = await sb
    .from("users")
    .select("id")
    .eq("tg_id", from.id)
    .maybeSingle();
  if (!admin) return;

  const { data: allowed } = await sb.rpc("fn_has_permission", {
    p_user_id: admin.id,
    p_permission: "stars.grant",
  });
  if (allowed !== true) {
    await ctx.reply("⛔ Команда доступна только администраторам.");
    return;
  }

  const [tgIdRaw, amountRaw] = (ctx.match ?? "").trim().split(/\s+/);
  const tgId = Number(tgIdRaw);
  const amount = Number(amountRaw);
  if (!Number.isFinite(tgId) || !Number.isFinite(amount) || amount === 0) {
    await ctx.reply("Формат: /give_stars <tg_id> <сумма>");
    return;
  }

  const { data: target } = await sb
    .from("users")
    .select("id, first_name")
    .eq("tg_id", tgId)
    .maybeSingle();
  if (!target) {
    await ctx.reply("Пользователь с таким tg_id не найден.");
    return;
  }

  const { data: balance, error } = await sb.rpc("fn_adjust_stars", {
    p_user_id: target.id,
    p_amount: amount,
    p_meta: { by: "bot", admin_tg_id: from.id },
  });
  if (error) {
    await ctx.reply(`⚠️ Ошибка: ${error.message}`);
    return;
  }
  await ctx.reply(
    `✅ ${target.first_name ?? tgId}: ${amount > 0 ? "+" : ""}${amount} ⭐ (баланс: ${balance})`
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Команды:\n" +
      "/start — регистрация и вход в маркет\n" +
      "/balance — баланс звёзд\n" +
      "/give_stars <tg_id> <сумма> — выдача звёзд (только админ)",
    { reply_markup: webAppKeyboard() }
  );
});
