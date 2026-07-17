"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Включить/скрыть подарок в каталоге */
export default function GiftToggle({
  giftId,
  isActive,
}: {
  giftId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch("/api/admin/gifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={isActive ? "btn-ghost !min-h-[34px] px-3 text-xs" : "btn-primary !min-h-[34px] px-3 text-xs"}
    >
      {isActive ? "Скрыть" : "Включить"}
    </button>
  );
}
