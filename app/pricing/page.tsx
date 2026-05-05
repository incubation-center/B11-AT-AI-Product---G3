"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Plan } from "@/lib/plans";


const generateDeviceId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => characters[byte % characters.length]).join("");
};

const PRICING_CARDS: {
  key: Plan;
  label: string;
  price: string;
  period: string;
  maxBills: string;
  highlight: boolean;
  features: { text: string; included: boolean }[];
}[] = [
  {
    key: "free",
    label: "Free",
    price: "$0",
    period: "forever",
    maxBills: "10 active bills",
    highlight: false,
    features: [
      { text: "Track up to 10 active bills", included: true },
      { text: "Basic email due alerts", included: true },
      { text: "Manual bill entry", included: true },
      { text: "Anomaly detection", included: false },
      { text: "Cheaper alternatives", included: false },
      { text: "Export CSV / PDF", included: false },
      { text: "Financial Impact report", included: false },
      { text: "Team access", included: false },
    ],
  },
  {
    key: "basic",
    label: "Basic",
    price: "$0.01",
    period: "/ month",
    maxBills: "30 active bills",
    highlight: false,
    features: [
      { text: "Track up to 30 active bills", included: true },
      { text: "Basic email due alerts", included: true },
      { text: "Manual bill entry", included: true },
      { text: "Anomaly detection", included: true },
      { text: "Cheaper alternatives", included: true },
      { text: "Export CSV / PDF", included: false },
      { text: "Financial Impact report", included: false },
      { text: "Team access", included: false },
    ],
  },
  {
    key: "pro",
    label: "Pro",
    price: "$0.01",
    period: "/ month",
    maxBills: "Unlimited bills",
    highlight: true,
    features: [
      { text: "Unlimited active bills", included: true },
      { text: "Basic email due alerts", included: true },
      { text: "Manual bill entry", included: true },
      { text: "Anomaly detection", included: true },
      { text: "Cheaper alternatives", included: true },
      { text: "Export CSV / PDF", included: true },
      { text: "Financial Impact report", included: true },
      { text: "Team access", included: true },
    ],
  },
];

type QRModal = {
  plan: Plan;
  downloadQr: string;
  clientId: string;
  requestTime: string;
  token: string;
  deviceId: string;
  expireInSec: number;
};



export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [qrModal, setQrModal] = useState<QRModal | null>(null);
  const [pollStatus, setPollStatus] = useState<"waiting" | "confirmed" | "expired">("waiting");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((data: { plan?: Plan }) => {
        if (data.plan) setCurrentPlan(data.plan);
      })
      .catch(() => null);
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(modal: QRModal) {
    stopPolling();
    const deadline = Date.now() + modal.expireInSec * 1000;

    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPolling();
        setPollStatus("expired");
        return;
      }
      try {
        const res = await fetch("/api/payway/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: modal.clientId,
            device_id: modal.deviceId,
            request_time: modal.requestTime,
            token: modal.token,
            plan: modal.plan,
          }),
        });
        const json = (await res.json()) as { confirmed?: boolean };
        if (json.confirmed) {
          stopPolling();
          setPollStatus("confirmed");
          setTimeout(() => {
            router.push(`/settings?upgraded=${modal.plan}`);
          }, 3000);
        }
      } catch {
        // keep polling
      }
    }, 5000);
  }

  async function selectPlan(plan: Plan) {
    // if (currentPlan && isDowngrade(currentPlan, plan)) {
    //   setError("To downgrade your plan, please contact us at soengsokheng096@gmail.com.");
    //   return;
    // }
    setLoading(plan);
    setError(null);
    try {
      if (plan === "free") {
        const res = await fetch("/api/user/plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setError(json.error ?? "Failed to update plan.");
          return;
        }
        router.push("/settings");
        return;
      }

      // Paid plans → ABA PayWay
      const res = await fetch("/api/payway/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Failed to generate QR.");
        return;
      }
      const data = (await res.json()) as {
        download_qr: string;
        client_id: string;
        request_time: string;
        token: string;
        expire_in_sec: number;
      };
      const modal: QRModal = {
        plan,
        downloadQr: data.download_qr,
        clientId: data.client_id,
        requestTime: data.request_time,
        token: data.token,
        deviceId: generateDeviceId(),
        expireInSec: data.expire_in_sec,
      };
      setPollStatus("waiting");
      setQrModal(modal);
      startPolling(modal);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function closeModal() {
    stopPolling();
    setQrModal(null);
    setPollStatus("waiting");
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">Choose your plan</h1>
          <p className="mt-3 text-[hsl(var(--muted-ink))]">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-xl bg-[hsl(var(--danger-soft))] px-4 py-3 text-center text-sm text-[hsl(var(--danger))]">
            {error}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_CARDS.map((plan) => (
            <article
              key={plan.key}
              className={[
                "relative flex flex-col rounded-2xl border p-6 shadow-sm",
                plan.highlight
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                  : "border-[hsl(var(--line))] bg-[hsl(var(--surface))]",
              ].join(" ")}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <p
                  className={[
                    "text-sm font-semibold uppercase tracking-wider",
                    plan.highlight ? "text-white/80" : "text-[hsl(var(--muted-ink))]",
                  ].join(" ")}
                >
                  {plan.label}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span
                    className={[
                      "text-4xl font-bold",
                      plan.highlight ? "text-white" : "",
                    ].join(" ")}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={[
                      "mb-1 text-sm",
                      plan.highlight ? "text-white/70" : "text-[hsl(var(--muted-ink))]",
                    ].join(" ")}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={[
                    "mt-1 text-sm",
                    plan.highlight ? "text-white/80" : "text-[hsl(var(--muted-ink))]",
                  ].join(" ")}
                >
                  {plan.maxBills}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={[
                      "flex items-center gap-2.5 text-sm",
                      !f.included
                        ? plan.highlight
                          ? "text-white/40"
                          : "text-[hsl(var(--muted-ink))]/50"
                        : plan.highlight
                          ? "text-white"
                          : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        f.included
                          ? plan.highlight
                            ? "bg-white text-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
                          : plan.highlight
                            ? "bg-white/20 text-white/50"
                            : "bg-[hsl(var(--muted-soft))] text-[hsl(var(--muted-ink))]",
                      ].join(" ")}
                    >
                      {f.included ? "✓" : "✕"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => selectPlan(plan.key)}
                disabled={loading !== null || currentPlan === plan.key}
                className={[
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity",
                  currentPlan === plan.key
                    ? "cursor-default bg-green-400 text-white"
                    : plan.highlight
                      ? "bg-white text-[hsl(var(--primary))] hover:opacity-90"
                      : "bg-[hsl(var(--primary))] text-white hover:opacity-90",
                ].join(" ")}
              >
                {loading === plan.key
                  ? "Loading…"
                  : currentPlan === plan.key
                    ? "In Use"
                    : plan.key === "free"
                      ? "Get Started"
                      : `Upgrade to ${plan.label}`}
              </button>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-[hsl(var(--muted-ink))]">
          Already have an account?{" "}
          <Link href="/dashboard" className="font-medium underline">
            Go to dashboard
          </Link>
        </p>
      </div>

      {/* QR Payment Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[hsl(var(--surface))] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {qrModal.plan.charAt(0).toUpperCase() + qrModal.plan.slice(1)} Plan
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--muted-soft))]"
              >
                ✕
              </button>
            </div>

            {pollStatus === "confirmed" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--success-soft))] text-2xl text-[hsl(var(--success))]">
                  ✓
                </span>
                <p className="font-semibold text-[hsl(var(--success))]">Payment confirmed!</p>
                <p className="text-sm text-[hsl(var(--muted-ink))]">Redirecting…</p>
              </div>
            ) : pollStatus === "expired" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="font-semibold text-[hsl(var(--danger))]">QR code expired.</p>
                <button
                  onClick={() => {
                    closeModal();
                    void selectPlan(qrModal.plan);
                  }}
                  className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-white"
                >
                  Generate new QR
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center rounded-xl bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrModal.downloadQr}
                    alt="ABA PayWay QR payment code"
                    width={260}
                    height={260}
                  />
                </div>
                <p className="mt-4 text-center text-sm text-[hsl(var(--muted-ink))]">
                  Scan with your <strong>ABA</strong> or banking app
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-ink))]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
                  Waiting for payment…
                </div>
                <p className="mt-2 text-center text-xs text-[hsl(var(--muted-ink))]">
                  QR expires in {Math.round(qrModal.expireInSec / 60)} minutes
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
