"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import type { CaseWithItems, GiftRow, Rarity } from "@/lib/types";
import RarityBadge from "./RarityBadge";
import GiftMedia from "./GiftMedia";
import { StarIcon } from "./icons";

const CELL = 96; // ширина ячейки рулетки, px
const REEL_LEN = 40; // сколько ячеек прокручиваем

const RARITY_RING: Record<Rarity, string> = {
  common: "ring-[#8FA0B8]/40",
  rare: "ring-[#5EA2FF]/50",
  epic: "ring-[#B06CFF]/50",
  legendary: "ring-[#F6C453]/60",
};

type WonGift = Pick<GiftRow, "id" | "name" | "gif_url" | "rarity">;

export default function CaseOpener({ box }: { box: CaseWithItems }) {
  const router = useRouter();
  const controls = useAnimationControls();
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<WonGift | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const seed = useRef(0);

  const totalWeight = box.case_items.reduce((s, i) => s + Number(i.weight), 0);

  /* Случайная лента из предметов кейса; последняя треть пересобирается
     под выигрыш после ответа сервера */
  const [reel, setReel] = useState<WonGift[]>(() => buildReel(null));

  function buildReel(winner: WonGift | null): WonGift[] {
    const pool = box.case_items.map((ci) => ({
      id: ci.gifts.id,
      name: ci.gifts.name,
      gif_url: ci.gifts.gif_url,
      rarity: ci.gifts.rarity,
    }));
    if (pool.length === 0) return [];
    const arr: WonGift[] = [];
    for (let i = 0; i < REEL_LEN; i++) {
      arr.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    if (winner) arr[REEL_LEN - 5] = winner; // остановка на этой ячейке
    return arr;
  }

  async function open() {
    if (spinning || box.case_items.length === 0) return;
    setSpinning(true);
    setWon(null);
    setMessage(null);

    try {
      const res = await fetch("/api/cases/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: box.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        setSpinning(false);
        return;
      }

      const winner: WonGift = data.gift;
      const newReel = buildReel(winner);
      setReel(newReel);
      seed.current += 1;

      // Целевой сдвиг: ячейка выигрыша под центральным маркером
      const jitter = (Math.random() - 0.5) * CELL * 0.5;
      const target = -((REEL_LEN - 5) * CELL - CELL * 1.5 + jitter);

      await controls.start({
        x: [0, target],
        transition: { duration: 4.2, ease: [0.12, 0.8, 0.16, 1] },
      });

      setWon(winner);
      router.refresh();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setSpinning(false);
    }
  }

  const odds = useMemo(
    () =>
      box.case_items
        .slice()
        .sort((a, b) => Number(b.weight) - Number(a.weight))
        .map((ci) => ({
          ...ci,
          pct: ((Number(ci.weight) / totalWeight) * 100).toFixed(1),
        })),
    [box.case_items, totalWeight]
  );

  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
        <div>
          <h2 className="h-section">{box.name}</h2>
          <p className="text-xs text-white/45">{box.case_items.length} возможных предметов</p>
        </div>
        <button onClick={open} disabled={spinning} className="btn-gold px-5">
          <StarIcon className="h-4 w-4" />
          {spinning ? "Крутим…" : `Открыть за ${box.price_stars.toLocaleString("ru-RU")}`}
        </button>
      </div>

      {/* Рулетка */}
      <div className="relative mt-4 h-[120px] overflow-hidden border-y border-white/[0.07] bg-ink-900/60">
        {/* Центральный маркер */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-[2px] -translate-x-1/2 bg-gradient-to-b from-accent-gold via-accent-gold/80 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 border-8 border-transparent border-t-accent-gold" />
        {/* Затемнение краёв */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent" />

        <motion.div
          key={seed.current}
          animate={controls}
          initial={{ x: 0 }}
          className="absolute left-1/2 top-1/2 flex -translate-y-1/2 gap-2"
        >
          {reel.map((g, i) => (
            <div
              key={`${i}-${g.id}`}
              style={{ width: CELL - 8 }}
              className={`flex h-[96px] shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.04] ring-1 ${RARITY_RING[g.rarity]} p-1.5`}
            >
              <GiftMedia src={g.gif_url} alt={g.name} rarity={g.rarity} className="h-14 w-14 rounded-lg" />
              <span className="mt-1 w-full truncate text-center text-[9px] font-semibold text-white/60">
                {g.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Шансы */}
      <div className="flex flex-wrap gap-2 p-4">
        {odds.map((ci) => (
          <span key={ci.id} className="badge border border-white/10 bg-white/[0.04] text-white/60">
            {ci.gifts.name} · {ci.pct}%
          </span>
        ))}
      </div>

      {message && (
        <p className="px-4 pb-4 text-sm font-semibold text-accent-blue">{message}</p>
      )}

      {/* Экран выигрыша */}
      <AnimatePresence>
        {won && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWon(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={`glass w-full max-w-xs p-6 text-center ${won.rarity === "legendary" ? "shimmer-gold shadow-glow-gold" : "shadow-glow"}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Выпало</p>
              <div className="mx-auto my-4 h-32 w-32">
                <GiftMedia src={won.gif_url} alt={won.name} rarity={won.rarity} className="h-full w-full rounded-2xl" />
              </div>
              <h3 className="text-lg font-extrabold">{won.name}</h3>
              <div className="mt-2 flex justify-center">
                <RarityBadge rarity={won.rarity} />
              </div>
              <button onClick={() => setWon(null)} className="btn-primary mt-5 w-full">
                В инвентарь ✨
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
