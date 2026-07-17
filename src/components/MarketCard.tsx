"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { MarketListing } from "@/lib/types";
import RarityBadge from "./RarityBadge";
import GiftMedia from "./GiftMedia";
import { StarIcon } from "./icons";

export default function MarketCard({
  listing,
  isMine,
}: {
  listing: MarketListing;
  isMine: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const item = listing.inventory;
  const gift = item.gifts;
  const rarity = item.gift_variants?.rarity ?? gift.rarity;
  const sellerName = listing.seller.username
    ? `@${listing.seller.username}`
    : listing.seller.first_name ?? "аноним";

  async function act(url: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article whileHover={{ y: -3 }} className="glass glass-hover flex flex-col p-3">
      <div className="flex items-start justify-between gap-2">
        <RarityBadge rarity={rarity} />
        <span className="badge border border-white/10 bg-white/[0.05] text-white/60">⚡ {item.tier}</span>
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
        {item.gift_variants?.name ?? "Базовый"} · продавец {sellerName}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[15px] font-extrabold">
          <StarIcon className="h-4 w-4 text-accent-gold" />
          {listing.price_stars.toLocaleString("ru-RU")}
        </span>
        {isMine ? (
          <button onClick={() => act("/api/market/cancel")} disabled={busy} className="btn-ghost !min-h-[38px] px-4 text-[13px]">
            Снять лот
          </button>
        ) : (
          <button onClick={() => act("/api/market/buy")} disabled={busy} className="btn-primary !min-h-[38px] px-4 text-[13px]">
            {busy ? "…" : "Купить"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-2 text-center text-xs font-semibold text-accent-blue">{message}</p>
      )}
    </motion.article>
  );
}
