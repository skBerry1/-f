"use client";

import { useState } from "react";
import type { Rarity } from "@/lib/types";

const FALLBACK_BG: Record<Rarity, string> = {
  common: "from-[#8FA0B8]/20 to-[#8FA0B8]/5",
  rare: "from-[#5EA2FF]/25 to-[#5EA2FF]/5",
  epic: "from-[#B06CFF]/25 to-[#B06CFF]/5",
  legendary: "from-[#F6C453]/25 to-[#F6C453]/5",
};

/**
 * Гифка подарка с грациозным фолбэком: если файл недоступен
 * (например, в демо-данных), показываем градиент редкости с 🎁.
 */
export default function GiftMedia({
  src,
  alt,
  rarity,
  className = "",
}: {
  src: string;
  alt: string;
  rarity: Rarity;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${FALLBACK_BG[rarity]} ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-4xl drop-shadow-lg">🎁</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- анимированные гифки без оптимизации
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
