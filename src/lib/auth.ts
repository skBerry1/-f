import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import type { UserRow } from "./types";

export const SESSION_COOKIE = "sg_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 дней
const INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24; // initData не старше суток

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

/**
 * Проверка подписи Telegram WebApp initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string): TelegramWebAppUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const ok =
    expected.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
  if (!ok) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) {
    return null;
  }

  try {
    return JSON.parse(params.get("user") ?? "") as TelegramWebAppUser;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Сессии: компактный подписанный токен payload.signature (HMAC-SHA256)
// ---------------------------------------------------------------------------

/**
 * Отдельный SESSION_SECRET ЗАВОДИТЬ НЕ ОБЯЗАТЕЛЬНО:
 * если он не задан, ключ подписи cookie выводится из токена бота
 * (SHA-256 от токена; сам токен в cookie не попадает).
 */
function sessionSecret(): Buffer {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 16) return Buffer.from(explicit);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return crypto.createHash("sha256").update(`sg-session:${botToken}`).digest();
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.uid !== "string") return null;
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const, // сайт открывается внутри Telegram WebView
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Хелперы для route handlers и server components
// ---------------------------------------------------------------------------

export async function getSessionUser(): Promise<UserRow | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return null;

  const { data } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!data || (data as UserRow).is_banned) return null;
  return data as UserRow;
}

export async function requireUser(): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHORIZED");
  return user;
}

export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const { data } = await supabaseAdmin().rpc("fn_has_permission", {
    p_user_id: userId,
    p_permission: permission,
  });
  return data === true;
}

export async function requirePermission(permission: string): Promise<UserRow> {
  const user = await requireUser();
  if (!(await hasPermission(user.id, permission))) {
    throw new AuthError("FORBIDDEN");
  }
  return user;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
  }
}
