"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StopRecurringButton({ billId }: { billId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleStop() {
    if (!confirm("Stop auto-renewal for this invoice?")) return;
    setLoading(true);
    try {
      await fetch("/api/stop-recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill_id: billId }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <span className="text-xs text-[hsl(var(--muted-ink))]">Stopped</span>;
  }

  return (
    <button
      onClick={handleStop}
      disabled={loading}
      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
    >
      {loading ? "Stopping…" : "Stop"}
    </button>
  );
}
