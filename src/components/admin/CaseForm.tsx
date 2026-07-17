"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GiftRow } from "@/lib/types";

type ItemDraft = { giftId: string; weight: string };

/** Конструктор кейса: предметы + веса (вероятности считаются от суммы весов) */
export default function CaseForm({ gifts }: { gifts: GiftRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ giftId: "", weight: "" }]);

  const totalWeight = items.reduce((s, i) => s + (Number(i.weight) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = items
      .map((i) => ({ giftId: i.giftId, weight: Number(i.weight) }))
      .filter((i) => i.giftId && i.weight > 0);
    if (clean.length === 0) {
      setMessage("Добавьте хотя бы один предмет с весом > 0");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceStars: Math.max(0, Math.trunc(Number(price)) || 0),
          isActive: true,
          items: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        return;
      }
      setMessage("Кейс создан ✅");
      setName("");
      setPrice("");
      setItems([{ giftId: "", weight: "" }]);
      router.refresh();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-3 p-4">
      <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Название кейса" required />
      <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} className="input" placeholder="Цена открытия ⭐" required />

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-white/50">
          Предметы и веса {totalWeight > 0 && `(сумма: ${totalWeight})`}
        </label>
        <button
          type="button"
          onClick={() => setItems((arr) => [...arr, { giftId: "", weight: "" }])}
          className="btn-ghost !min-h-[32px] px-3 text-xs"
        >
          + предмет
        </button>
      </div>

      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <select
            value={it.giftId}
            onChange={(e) =>
              setItems((arr) => arr.map((x, j) => (j === i ? { ...x, giftId: e.target.value } : x)))
            }
            className="input !min-h-[40px] flex-1 text-sm"
          >
            <option value="">Подарок…</option>
            {gifts.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={it.weight}
            onChange={(e) =>
              setItems((arr) => arr.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))
            }
            className="input !min-h-[40px] w-24 text-sm"
            placeholder="вес"
          />
          <span className="flex w-14 items-center justify-center text-xs text-white/40">
            {totalWeight > 0 && Number(it.weight) > 0
              ? `${((Number(it.weight) / totalWeight) * 100).toFixed(1)}%`
              : "—"}
          </span>
          <button
            type="button"
            onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
            className="btn-danger !min-h-[40px] px-3 text-xs"
          >
            ✕
          </button>
        </div>
      ))}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Создаём…" : "Создать кейс"}
      </button>
      {message && <p className="text-center text-xs font-semibold text-accent-blue">{message}</p>}
    </form>
  );
}
