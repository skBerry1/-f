"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { GiftWithVariants } from "@/lib/types";
import RarityBadge from "./RarityBadge";
import GiftMedia from "./GiftMedia";
import { StarIcon } from "./icons";

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  angle: (i / 10) * Math.PI * 2,
  distance: 46 + (i % 3) * 16,
}));

export default function GiftCard({
  gift,
  authed,
}: {
  gift: GiftWithVariants;
  authed: boolean;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(
    gift.gift_variants[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const left =
    gift.supply_limit !== null ? Math.max(0, gift.supply_limit - gift.minted) : null;
  const soldOut = left !== null && left <= 0;

  async function buy() {
    if (busy || soldOut) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: gift.id, variantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        return;
      }
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      setMessage("В инвентаре! ✨");
      router.refresh();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`glass glass-hover relative flex flex-col overflow-hidden p-3 ${
        gift.rarity === "legendary" ? "shimmer-gold" : ""
      }`}
    >
      <div className="absolute left-3 top-3 z-10">
        <RarityBadge rarity={gift.rarity} />
      </div>

      {/* Медиа-зона */}
      <div className="relative mx-auto mt-6 flex h-32 w-full items-center justify-center sm:h-36">
        <motion.div whileHover={{ scale: 1.07 }} className="h-full w-full">
          <GiftMedia
            src={gift.gif_url}
            alt={gift.name}
            rarity={gift.rarity}
            className="mx-auto h-full w-auto max-w-full rounded-xl"
          />
        </motion.div>

        {/* Партиклы при покупке */}
        <AnimatePresence>
          {burst &&
            PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(p.angle) * p.distance,
                  y: Math.sin(p.angle) * p.distance,
                  scale: 0.4,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="pointer-events-none absolute left-1/2 top-1/2 text-sm"
              >
                ✨
              </motion.span>
            ))}
        </AnimatePresence>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-tight">{gift.name}</h3>

      <p className="mt-0.5 min-h-[18px] text-xs text-white/45">
        {left !== null
          ? soldOut
            ? "Тираж распродан"
            : `Осталось ${left.toLocaleString("ru-RU")} из ${gift.supply_limit!.toLocaleString("ru-RU")}`
          : "Без лимита тиража"}
      </p>

      {/* Варианты / окрасы */}
      {gift.gift_variants.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {gift.gift_variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariantId(v.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                variantId === v.id
                  ? "border-accent-blue/60 bg-accent-blue/15 text-accent-blue"
                  : "border-white/10 bg-white/[0.03] text-white/50"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[15px] font-extrabold">
          <StarIcon className="h-4 w-4 text-accent-gold" />
          {gift.price_stars.toLocaleString("ru-RU")}
        </span>
        <button
          onClick={buy}
          disabled={busy || soldOut || !authed}
          className={`${gift.rarity === "legendary" ? "btn-gold" : "btn-primary"} !min-h-[38px] px-4 text-[13px]`}
        >
          {busy ? "…" : soldOut ? "Нет в наличии" : "Купить"}
        </button>
      </div>

      {message && (
        <p className="mt-2 text-center text-xs font-semibold text-accent-blue">{message}</p>
      )}
    </motion.article>
  );
}
