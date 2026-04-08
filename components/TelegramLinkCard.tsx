"use client";

import { useState } from "react";

export default function TelegramLinkCard({ isLinked }: { isLinked: boolean }) {
  const [linked, setLinked] = useState(isLinked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link-token", { method: "POST" });
      const data = await res.json();
      if (data.start_link) {
        window.open(data.start_link, "_blank");
        // Poll link status after user returns
        const interval = setInterval(async () => {
          const statusRes = await fetch("/api/telegram/link-status");
          const status = await statusRes.json();
          if (status.linked) {
            setLinked(true);
            clearInterval(interval);
          }
        }, 3000);
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(interval), 120000);
      }
    } catch {
      setError("Failed to generate link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--bg))] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Telegram Notifications</p>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-ink))]">
            {linked
              ? "Your Telegram account is linked. You will receive bill reminders on Telegram."
              : "Link your Telegram account to receive bill reminders in chat."}
          </p>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <div className="ml-4 shrink-0">
          {linked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              ✓ Linked
            </span>
          ) : (
            <button
              onClick={handleLink}
              disabled={loading}
              className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Link Telegram"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
