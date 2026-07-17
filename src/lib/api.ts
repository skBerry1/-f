import { NextResponse } from "next/server";
import { AuthError } from "./auth";

/** Человечные сообщения для ошибок, которые бросают SQL-функции */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Откройте приложение через Telegram-бота",
  FORBIDDEN: "Недостаточно прав",
  GIFT_NOT_FOUND: "Подарок не найден или снят с продажи",
  VARIANT_NOT_FOUND: "Вариант не найден",
  SOLD_OUT: "Тираж распродан",
  NOT_ENOUGH_STARS: "Недостаточно звёзд",
  USER_BLOCKED: "Аккаунт заблокирован",
  USER_NOT_FOUND: "Пользователь не найден",
  ITEM_NOT_FOUND: "Предмет не найден",
  ITEM_LISTED: "Снимите предмет с маркета перед прокачкой",
  ALREADY_LISTED: "Предмет уже выставлен на маркет",
  MAX_TIER: "Достигнут максимальный уровень",
  LISTING_NOT_ACTIVE: "Лот уже неактивен",
  NOT_YOUR_LISTING: "Это не ваш лот",
  OWN_LISTING: "Нельзя купить свой же лот",
  BAD_PRICE: "Некорректная цена",
  CASE_NOT_FOUND: "Кейс не найден",
  CASE_EMPTY: "Кейс пока пуст",
};

export function apiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.code, message: ERROR_MESSAGES[err.code] },
      { status: err.code === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  const raw = err instanceof Error ? err.message : String(err);
  const code = Object.keys(ERROR_MESSAGES).find((c) => raw.includes(c));
  if (code) {
    return NextResponse.json(
      { error: code, message: ERROR_MESSAGES[code] },
      { status: 400 }
    );
  }
  console.error("API error:", err);
  return NextResponse.json(
    { error: "INTERNAL", message: "Что-то пошло не так, попробуйте ещё раз" },
    { status: 500 }
  );
}
