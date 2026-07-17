import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { GiftWithVariants } from "@/lib/types";
import GiftCard from "@/components/GiftCard";

export const dynamic = "force-dynamic";

/** Каталог подарков */
export default async function CatalogPage() {
  const user = await getSessionUser();
  const { data } = await supabaseAdmin()
    .from("gifts")
    .select("*, gift_variants(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const gifts = (data ?? []) as GiftWithVariants[];

  return (
    <div>
      <div className="mb-5 mt-2">
        <h1 className="h-display">Каталог</h1>
        <p className="mt-1 text-sm text-white/45">
          Покупай подарки за звёзды — они появятся в твоём инвентаре
        </p>
      </div>

      {!user && (
        <div className="glass mb-5 p-4 text-sm text-white/70">
          Чтобы покупать и получить ⭐ 1000 звёзд на старт — откройте приложение
          через Telegram-бота (кнопка «Открыть маркет» в чате с ботом).
        </div>
      )}

      {gifts.length === 0 ? (
        <div className="glass p-8 text-center text-white/50">
          Каталог пока пуст — администратор скоро добавит подарки ✨
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {gifts.map((gift) => (
            <GiftCard key={gift.id} gift={gift} authed={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
