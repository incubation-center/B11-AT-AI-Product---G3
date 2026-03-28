"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Plan = "free" | "basic" | "pro";

const PLANS: {
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
    price: "$9",
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
    price: "$19",
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

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((data: { plan?: Plan }) => {
        if (data.plan) setCurrentPlan(data.plan);
      })
      .catch(() => null);
  }, []);

  async function selectPlan(plan: Plan) {
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

      // Paid plans → Stripe Checkout
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Failed to start checkout.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">Choose your plan</h1>
          <p className="mt-3 text-[hsl(var(--muted-ink))]">
            Start free. Upgrade when you need more.
          </p>
          <p className="mt-3 inline-block rounded-full bg-[hsl(var(--warning-soft))] px-4 py-1 text-xs font-medium text-[hsl(var(--warning))]">
            Test mode — use card <strong>4242 4242 4242 4242</strong>, any future date, any CVC.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-xl bg-[hsl(var(--danger-soft))] px-4 py-3 text-center text-sm text-[hsl(var(--danger))]">
            {error}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
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
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60",
                  currentPlan === plan.key
                    ? "cursor-default bg-green-500 text-white"
                    : plan.highlight
                      ? "bg-white text-[hsl(var(--primary))] hover:opacity-90"
                      : "bg-[hsl(var(--primary))] text-white hover:opacity-90",
                ].join(" ")}
              >
                {loading === plan.key
                  ? "Updating…"
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
    </div>
  );
}
