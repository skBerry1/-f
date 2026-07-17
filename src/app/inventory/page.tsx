import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { InventoryItem } from "@/lib/types";
import InventoryCard from "@/components/InventoryCard";

export const dynamic = "force-dynamic";

/** Инвентарь пользователя */
export default async function InventoryPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="glass mt-6 p-8 text-center text-white/60">
        Откройте приложение через Telegram-бота, чтобы увидеть свой инвентарь.
      </div>
    );
  }

  const { data } = await supabaseAdmin()
    .from("inventory")
    .select("*, gifts(*), gift_variants(*)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false });

  const items = (data ?? []) as InventoryItem[];

  return (
    <div>
      <div className="mb-5 mt-2">
        <h1 className="h-display">Инвентарь</h1>
        <p className="mt-1 text-sm text-white/45">
          {items.length > 0
            ? `У тебя ${items.length} предм.: продавай на маркете или прокачивай уровень`
            : "Здесь появятся твои подарки"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="glass p-8 text-center text-white/50">
          Пока пусто. Загляни в каталог или открой кейс 🎁
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
