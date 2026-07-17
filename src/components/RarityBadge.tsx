import type { Rarity } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/types";

const STYLES: Record<Rarity, string> = {
  common: "bg-[#8FA0B8]/15 text-[#AEBBD0] border border-[#8FA0B8]/25",
  rare: "bg-[#5EA2FF]/15 text-[#8FC0FF] border border-[#5EA2FF]/30",
  epic: "bg-[#B06CFF]/15 text-[#CD9FFF] border border-[#B06CFF]/30",
  legendary: "bg-[#F6C453]/15 text-[#FFD97E] border border-[#F6C453]/35",
};

export default function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`badge ${STYLES[rarity]}`}>{RARITY_LABEL[rarity]}</span>;
}
