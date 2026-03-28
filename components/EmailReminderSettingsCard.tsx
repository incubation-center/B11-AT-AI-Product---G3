"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function EmailReminderSettingsCard({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function save() {
    setError("");
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_reminder_email_enabled: enabled,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to save email reminder settings");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save email reminder settings",
      );
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-[hsl(var(--bg))] p-4">
      <p className="text-sm font-medium">Email Due Reminders</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-ink))]">
        Receive automated email reminders for upcoming recurring bills.
      </p>
      <label
        htmlFor="due_reminder_email_enabled"
        className="mt-3 flex items-center gap-2 text-sm"
      >
        <input
          id="due_reminder_email_enabled"
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-4 w-4 rounded border border-[hsl(var(--line))]"
        />
        Enable reminder emails
      </label>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <Button
        className="mt-3 bg-[hsl(var(--primary))] text-white hover:opacity-90"
        onClick={save}
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save Email Settings"}
      </Button>
    </div>
  );
}
