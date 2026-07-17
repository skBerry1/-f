"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Снятие лота модератором: предмет возвращается владельцу в инвентарь */
export default function RemoveListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_listing", listingId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={remove} disabled={busy} className="btn-danger !min-h-[34px] px-3 text-xs">
      {busy ? "…" : "Снять лот"}
    </button>
  );
}
