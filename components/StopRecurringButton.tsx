"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StopRecurringButton({ billId }: { billId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  async function handleConfirm() {
    setShowDialog(false);
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
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={loading}
        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {loading ? "Stopping…" : "Stop"}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-[hsl(var(--surface))] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[hsl(var(--ink))]">Stop Auto-Renewal</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-ink))]">
              Are you sure you want to stop auto-renewal for this invoice? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-xl border border-[hsl(var(--line))] px-4 py-2 text-sm font-medium text-[hsl(var(--ink))] hover:bg-[hsl(var(--muted-soft))]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
