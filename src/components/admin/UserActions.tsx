"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GiftRow, UserRow } from "@/lib/types";
import { StarIcon } from "@/components/icons";

/** Карточка пользователя: выдача звёзд, выдача подарка напрямую, бан */
export default function UserActions({
  user,
  gifts,
}: {
  user: UserRow;
  gifts: GiftRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stars, setStars] = useState("");
  const [giftId, setGiftId] = useState("");

  async function post(url: string, body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMessage("Сеть недоступна");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function giveStars() {
    const amount = Math.trunc(Number(stars));
    if (!Number.isFinite(amount) || amount === 0) {
      setMessage("Введите сумму (можно отрицательную)");
      return;
    }
    if (await post("/api/admin/give-stars", { userId: user.id, amount })) {
      setStars("");
      setMessage(`Готово: ${amount > 0 ? "+" : ""}${amount} ⭐`);
    }
  }

  async function giveGift() {
    if (!giftId) {
      setMessage("Выберите подарок");
      return;
    }
    if (await post("/api/admin/give-gift", { userId: user.id, giftId })) {
      setGiftId("");
      setMessage("Подарок выдан 🎁");
    }
  }

  async function toggleBan() {
    await post("/api/admin/moderate", {
      action: user.is_banned ? "unban_user" : "ban_user",
      userId: user.id,
    });
  }

  return (
    <div className={`glass p-4 ${user.is_banned ? "opacity-70 ring-1 ring-red-400/30" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {user.first_name ?? "Без имени"}{" "}
            <span className="font-normal text-white/40">
              {user.username ? `@${user.username}` : ""} · tg {user.tg_id}
            </span>
            {user.is_banned && (
              <span className="badge ml-2 border border-red-400/40 bg-red-400/10 text-red-300">бан</span>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/45">
            <StarIcon className="h-3 w-3 text-accent-gold" />
            {user.stars.toLocaleString("ru-RU")}
          </p>
        </div>
        <button onClick={toggleBan} disabled={busy} className={user.is_banned ? "btn-ghost !min-h-[34px] px-3 text-xs" : "btn-danger !min-h-[34px] px-3 text-xs"}>
          {user.is_banned ? "Разбанить" : "Забанить"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2">
          <input
            type="number"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
            className="input !min-h-[38px] flex-1 text-sm"
            placeholder="± звёзды"
          />
          <button onClick={giveStars} disabled={busy} className="btn-primary !min-h-[38px] px-3 text-xs">
            Выдать ⭐
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={giftId}
            onChange={(e) => setGiftId(e.target.value)}
            className="input !min-h-[38px] flex-1 text-sm"
          >
            <option value="">Подарок…</option>
            {gifts.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button onClick={giveGift} disabled={busy} className="btn-primary !min-h-[38px] px-3 text-xs">
            Выдать 🎁
          </button>
        </div>
      </div>

      {message && <p className="mt-2 text-xs font-semibold text-accent-blue">{message}</p>}
    </div>
  );
}
