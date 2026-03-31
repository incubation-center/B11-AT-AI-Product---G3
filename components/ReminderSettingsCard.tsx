"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Mode = "auto" | "manual";

function autoSplitDays(windowDays: number, count: number): number[] {
  const safeWindow = Math.min(30, Math.max(1, Math.round(windowDays)));
  const safeCount = Math.min(10, Math.max(1, Math.round(count)));
  if (safeCount === 1) return [safeWindow];
  const days: number[] = [];
  for (let i = 0; i < safeCount; i++) {
    const day = Math.round(safeWindow - (i * (safeWindow - 1)) / (safeCount - 1));
    if (!days.includes(day) && day >= 1) days.push(day);
  }
  return days.sort((a, b) => b - a);
}

export default function ReminderSettingsCard({
  initialDays,
}: {
  initialDays: number[];
}) {
  const [mode, setMode] = useState<Mode>("manual");
  const [manualDays, setManualDays] = useState<number[]>(
    initialDays.length > 0 ? [...initialDays].sort((a, b) => b - a) : [7],
  );
  const [windowDays, setWindowDays] = useState(
    initialDays.length > 0 ? Math.max(...initialDays) : 7,
  );
  const [reminderCount, setReminderCount] = useState(
    initialDays.length > 0 ? initialDays.length : 1,
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const previewDays = autoSplitDays(windowDays, reminderCount);
  const activeDays = mode === "auto" ? previewDays : manualDays;

  function addManualDay() {
    setManualDays((prev) => {
      const next = Math.max(1, (prev[prev.length - 1] ?? 7) - 2);
      return [...prev, next].sort((a, b) => b - a);
    });
  }

  function removeManualDay(index: number) {
    setManualDays((prev) => prev.filter((_, i) => i !== index));
  }

  function updateManualDay(index: number, value: number) {
    setManualDays((prev) => {
      const next = [...prev];
      next[index] = Math.min(30, Math.max(1, Math.round(value)));
      return next.sort((a, b) => b - a);
    });
  }

  async function save() {
    setError("");
    if (activeDays.length === 0) {
      setError("Add at least one reminder day.");
      return;
    }
    try {
      const response = await fetch("/api/reminder-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_days: activeDays }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string })?.error ?? "Failed to save reminder settings");
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
      <p className="text-sm font-medium">Payment Reminder Schedule</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-ink))]">
        Set one or more reminders before recurring invoice due dates.
      </p>

      {/* Mode toggle */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "auto"
              ? "bg-[hsl(var(--primary))] text-white"
              : "border border-[hsl(var(--line))] text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--surface))]"
          }`}
        >
          Auto-split
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "manual"
              ? "bg-[hsl(var(--primary))] text-white"
              : "border border-[hsl(var(--line))] text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--surface))]"
          }`}
        >
          Manual
        </button>
      </div>

      {mode === "auto" ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={30}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="w-20 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-2 text-sm"
            />
            <span className="text-sm text-[hsl(var(--muted-ink))]">days window before due date</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={10}
              value={reminderCount}
              onChange={(e) => setReminderCount(Number(e.target.value))}
              className="w-20 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-2 text-sm"
            />
            <span className="text-sm text-[hsl(var(--muted-ink))]">reminders evenly spaced</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewDays.map((day) => (
              <span
                key={day}
                className="rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]"
              >
                {day} day{day !== 1 ? "s" : ""} before
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {manualDays.map((day, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={30}
                value={day}
                onChange={(e) => updateManualDay(index, Number(e.target.value))}
                className="w-20 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-2 text-sm"
              />
              <span className="text-sm text-[hsl(var(--muted-ink))]">days before due date</span>
              {manualDays.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeManualDay(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addManualDay}
            className="mt-1 text-xs text-[hsl(var(--primary))] hover:underline"
          >
            + Add another reminder
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <Button
        className="mt-4 bg-[hsl(var(--primary))] text-white hover:opacity-90"
        onClick={save}
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save Reminders"}
      </Button>
    </div>
  );
}
