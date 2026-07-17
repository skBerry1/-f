"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantDraft = { name: string; rarity: string };

/** Создание подарка: загрузка гиф в Storage + варианты/окрасы + лимит тиража */
export default function GiftForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  async function uploadGif(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка загрузки");
        return;
      }
      setGifUrl(data.url);
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          gifUrl: gifUrl || form.get("gifUrlManual"),
          rarity: form.get("rarity"),
          priceStars: form.get("price"),
          supplyLimit: form.get("supplyLimit") || null,
          variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? "Ошибка");
        return;
      }
      setMessage("Подарок создан ✅");
      setGifUrl("");
      setVariants([]);
      (e.target as HTMLFormElement).reset?.();
      router.refresh();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-3 p-4">
      <input name="name" className="input" placeholder="Название" required />
      <input name="description" className="input" placeholder="Описание (необязательно)" />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-white/50">Гифка подарка</label>
        <input
          type="file"
          accept="image/gif,image/png,image/webp,image/jpeg,video/webm"
          onChange={(e) => e.target.files?.[0] && uploadGif(e.target.files[0])}
          className="text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
        />
        {uploading && <p className="text-xs text-accent-blue">Загружаем…</p>}
        {gifUrl && <p className="break-all text-xs text-emerald-400">✓ {gifUrl}</p>}
        <input name="gifUrlManual" className="input" placeholder="…или вставьте URL гифки вручную" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select name="rarity" className="input" defaultValue="common">
          <option value="common">Обычный</option>
          <option value="rare">Редкий</option>
          <option value="epic">Эпик</option>
          <option value="legendary">Легенда</option>
        </select>
        <input name="price" type="number" min={0} className="input" placeholder="Цена ⭐" required />
      </div>
      <input name="supplyLimit" type="number" min={1} className="input" placeholder="Лимит тиража (пусто = без лимита)" />

      {/* Варианты / окрасы */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white/50">Варианты / окрасы</label>
          <button
            type="button"
            onClick={() => setVariants((v) => [...v, { name: "", rarity: "" }])}
            className="btn-ghost !min-h-[32px] px-3 text-xs"
          >
            + добавить
          </button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Название варианта"
              value={v.name}
              onChange={(e) =>
                setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
            />
            <select
              className="input w-32"
              value={v.rarity}
              onChange={(e) =>
                setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, rarity: e.target.value } : x)))
              }
            >
              <option value="">—</option>
              <option value="rare">Редкий</option>
              <option value="epic">Эпик</option>
              <option value="legendary">Легенда</option>
            </select>
            <button
              type="button"
              onClick={() => setVariants((arr) => arr.filter((_, j) => j !== i))}
              className="btn-danger !min-h-[44px] px-3 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="submit" disabled={busy || uploading} className="btn-primary">
        {busy ? "Создаём…" : "Создать подарок"}
      </button>
      {message && <p className="text-center text-xs font-semibold text-accent-blue">{message}</p>}
    </form>
  );
}
