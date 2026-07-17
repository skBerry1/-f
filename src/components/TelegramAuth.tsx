"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        setBackgroundColor?: (c: string) => void;
        setHeaderColor?: (c: string) => void;
      };
    };
  }
}

/**
 * Автоматическая авторизация внутри Telegram Mini App:
 * берём initData из WebApp SDK и обмениваем на httpOnly-cookie сессию.
 * Подпись initData проверяется НА СЕРВЕРЕ.
 */
export default function TelegramAuth({ authed }: { authed: boolean }) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa) return;
    wa.ready();
    wa.expand();
    wa.setBackgroundColor?.("#0B0C14");
    wa.setHeaderColor?.("#0B0C14");

    if (authed || attempted.current || !wa.initData) return;
    attempted.current = true;

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: wa.initData }),
    })
      .then((r) => {
        if (r.ok) router.refresh();
      })
      .catch(() => {});
  }, [authed, router]);

  return null;
}
