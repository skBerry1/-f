"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { InventoryItem } from "@/lib/types";
import RarityBadge from "./RarityBadge";
import GiftMedia from "./GiftMedia";
import { StarIcon } from "./icons";

const UPGRADE_CHANCE: Record<number, string> = {
  1: "100%",
  2: "65%",
  3: "40%",
  4: "20%",
};

export default function InventoryCard({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const gift = item.gifts;
  const rarity = item.gift_variants?.rarity ?? gift.rarity;

  async function post(url: string, body: object): Promise<any> {
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
        return null;
      }
      return data;
    } catch {
      setMessage("Сеть недоступна");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function upgrade() {
    const data = await post("/api/inventory/upgrade", { itemId: item.id });
    if (!data) return;
    setMessage(data.success ? `Успех! Теперь уровень ${data.tier} ⚡` : "Не повезло, попробуй ещё 🎲");
    router.refresh();
  }

  async function sell() {
    const p = Math.floor(Number(price));
    if (!Number.isFinite(p) || p <= 0) {
      setMessage("Введите цену в звёздах");
      return;
    }
    const data = await post("/api/market/list", { itemId: item.id, price: p });
    if (!data) return;
    setSellOpen(false);
    router.refresh();
  }

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="glass glass-hover relative flex flex-col overflow-hidden p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <RarityBadge rarity={rarity} />
        <span className="badge border border-white/10 bg-white/[0.05] text-white/70">
          ⚡ Ур. {item.tier}
        </span>
      </div>

      <div className="mx-auto my-3 h-28 w-full">
        <GiftMedia
          src={item.gift_variants?.gif_url ?? gift.gif_url}
          alt={gift.name}
          rarity={rarity}
          className="mx-auto h-full w-auto max-w-full rounded-xl"
        />
      </div>

      <h3 className="text-[15px] font-bold leading-tight">{gift.name}</h3>
      <p className="mt-0.5 text-xs text-white/45">
        {item.gift_variants ? item.gift_variants.name : "Базовый вариант"}
      </p>

      {item.is_listed ? (
        <p className="mt-3 rounded-xl border border-accent-blue/25 bg-accent-blue/10 px-3 py-2 text-center text-xs font-semibold text-accent-blue">
          Выставлен на маркете
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setSellOpen(true)} disabled={busy} className="btn-ghost !min-h-[38px] text-[13px]">
            Продать
          </button>
          <button
            onClick={upgrade}
            disabled={busy || item.tier >= 5}
            className="btn-primary !min-h-[38px] text-[13px]"
            title={item.tier < 5 ? `Шанс успеха: ${UPGRADE_CHANCE[item.tier]}` : "Максимальный уровень"}
          >
            {item.tier >= 5 ? "Макс." : `Прокачать ${UPGRADE_CHANCE[item.tier]}`}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-2 text-center text-xs font-semibold text-accent-blue">{message}</p>
      )}

      {/* Модалка продажи */}
      <AnimatePresence>
        {sellOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-center gap-3 bg-ink-950/92 p-4 backdrop-blur-sm"
          >
            <p className="text-sm font-bold">Цена в звёздах</p>
            <div className="relative">
              <StarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-gold" />
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input !pl-9"
                placeholder="100"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSellOpen(false)} className="btn-ghost !min-h-[40px] text-[13px]">
                Отмена
              </button>
              <button onClick={sell} disabled={busy} className="btn-primary !min-h-[40px] text-[13px]">
                Выставить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
