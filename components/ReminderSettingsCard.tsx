"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ReminderSettingsCard({
  initialDays,
}: {
  initialDays: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function save() {
    setError("");
    try {
      const response = await fetch("/api/reminder-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days_before_due: days }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to save reminder settings");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  return (
    <div className="rounded-xl bg-[hsl(var(--bg))] p-4">
      <p className="text-sm font-medium">Payment Reminder Lead Time</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-ink))]">
        Alert me before recurring invoice due dates.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <input
          id="days_before_due"
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-24 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-2 text-sm"
        />
        <span className="text-sm text-[hsl(var(--muted-ink))]">days before due date</span>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
      <Button
        className="mt-3 bg-[hsl(var(--primary))] text-white hover:opacity-90"
        onClick={save}
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save Reminder"}
      </Button>
    </div>
  );
}
