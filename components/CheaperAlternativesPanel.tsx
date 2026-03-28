"use client";

import { useEffect, useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import type { CheaperAlternativeOpportunity } from "@/lib/workspace-data";

type AiAlternative = {
  provider: string;
  plan: string;
  monthly_price: number;
  risk: "low" | "medium" | "high";
  reason: string;
  switching_cost: string;
};

type AiRefreshState = {
  status: "idle" | "loading" | "done" | "error";
  alternatives: AiAlternative[];
  from_cache: boolean;
  error: string | null;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function riskClassName(risk: "low" | "medium" | "high"): string {
  if (risk === "low") return "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]";
  if (risk === "medium") return "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]";
  return "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))]";
}

const DOWN_REASONS = [
  { value: "not_relevant", label: "Not relevant" },
  { value: "missing_features", label: "Missing features" },
  { value: "savings_too_small", label: "Savings too small" },
  { value: "prefer_current", label: "Prefer current service" },
  { value: "other", label: "Other" },
] as const;

type VoteState = {
  state: "idle" | "saving" | "saved" | "error";
  vote: "up" | "down" | null;
  message: string;
};

export default function CheaperAlternativesPanel({
  opportunities,
}: {
  opportunities: CheaperAlternativeOpportunity[];
}) {
  const ITEMS_PER_PAGE = 2;
  const [voteStateByKey, setVoteStateByKey] = useState<Record<string, VoteState>>({});
  const [reasonByKey, setReasonByKey] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [aiByKey, setAiByKey] = useState<Record<string, AiRefreshState>>({});

  async function refreshWithAI(
    item: CheaperAlternativeOpportunity,
    forceRefresh = false,
  ) {
    const key = item.opportunityKey;
    setAiByKey((prev) => ({
      ...prev,
      [key]: { status: "loading", alternatives: [], from_cache: false, error: null },
    }));
    try {
      const res = await fetch("/api/ai-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: item.serviceName,
          current_monthly: item.currentEstimatedMonthly,
          force_refresh: forceRefresh,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as {
        alternatives: AiAlternative[];
        from_cache: boolean;
      };
      setAiByKey((prev) => ({
        ...prev,
        [key]: {
          status: "done",
          alternatives: data.alternatives,
          from_cache: data.from_cache,
          error: null,
        },
      }));
    } catch {
      setAiByKey((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          alternatives: [],
          from_cache: false,
          error: "Could not load AI suggestions. Try again.",
        },
      }));
    }
  }

  const totalPages = Math.max(1, Math.ceil(opportunities.length / ITEMS_PER_PAGE));

  const pagedOpportunities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return opportunities.slice(start, start + ITEMS_PER_PAGE);
  }, [opportunities, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [opportunities.length]);

  async function submitFeedback(
    item: CheaperAlternativeOpportunity,
    vote: "up" | "down",
  ) {
    const key = item.opportunityKey;
    setVoteStateByKey((prev) => ({
      ...prev,
      [key]: { state: "saving", vote, message: "" },
    }));

    try {
      const response = await fetch("/api/cheaper-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_key: item.opportunityKey,
          service_name: item.serviceName,
          alternative_provider: item.alternative.provider,
          alternative_plan: item.alternative.plan,
          vote,
          reason: vote === "down" ? reasonByKey[key] ?? "not_relevant" : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feedback");
      }

      setVoteStateByKey((prev) => ({
        ...prev,
        [key]: {
          state: "saved",
          vote,
          message: "Thanks, feedback saved.",
        },
      }));
    } catch {
      setVoteStateByKey((prev) => ({
        ...prev,
        [key]: {
          state: "error",
          vote,
          message: "Could not save feedback. Try again.",
        },
      }));
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
      <div className="flex flex-col gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Cheaper Alternatives</h2>
          <p className="mt-1 text-sm text-white/85">
            Fast suggestions with pricing, savings, and confidence.
          </p>
        </div>
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
          {opportunities.length} opportunities
        </span>
      </div>

      {opportunities.length === 0 ? (
        <p className="mt-4 text-sm text-[hsl(var(--muted-ink))]">
          No high-confidence opportunities yet. Upload more recurring invoices or add feedback to improve suggestion quality.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-[hsl(var(--muted-ink))]">
            Showing latest 2 services per page ({currentPage}/{totalPages})
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
          {pagedOpportunities.map((item) => {
            const currentVoteState = voteStateByKey[item.opportunityKey] ?? {
              state: "idle",
              vote: item.feedbackSummary.userVote,
              message: "",
            };

            return (
              <article
                key={item.opportunityKey}
                className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    Switch <span className="font-semibold">{item.serviceName}</span> to{" "}
                    <span className="font-semibold">
                      {item.alternative.provider} ({item.alternative.plan})
                    </span>{" "}
                    and save {formatCurrency(item.estimatedMonthlySavings)}/mo.
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${riskClassName(item.alternative.risk)}`}>
                    {item.alternative.risk} risk
                  </span>
                </div>

                <p className="mt-2 text-sm text-[hsl(var(--muted-ink))]">{item.alternative.reason}</p>

                <div className="mt-3 grid gap-2 rounded-lg bg-[hsl(var(--surface))] p-3 sm:grid-cols-2">
                  <p className="text-xs text-[hsl(var(--muted-ink))]">
                    Current est. monthly
                    <span className="mt-0.5 block text-sm font-semibold text-[hsl(var(--ink))]">
                      {formatCurrency(item.currentEstimatedMonthly)}
                    </span>
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-ink))]">
                    Alternative monthly
                    <span className="mt-0.5 block text-sm font-semibold text-[hsl(var(--ink))]">
                      {formatCurrency(item.alternative.monthlyPrice)}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[hsl(var(--success-soft))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--success))]">
                    {formatCurrency(item.estimatedYearlySavings)}/yr
                  </span>
                  <span className="rounded-full bg-[hsl(var(--bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-ink))]">
                    {Math.round(item.confidence * 100)}% confidence
                  </span>
                  <span className="rounded-full bg-[hsl(var(--bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-ink))]">
                    {item.feedbackSummary.upvotes} helpful
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Mark as helpful"
                      title="Helpful"
                      className={`rounded-lg border p-2 transition-colors disabled:opacity-60 ${
                        currentVoteState.vote === "up"
                          ? "border-[hsl(var(--success))] bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
                          : "border-[hsl(var(--line))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--bg))]"
                      }`}
                      onClick={() => submitFeedback(item, "up")}
                      disabled={currentVoteState.state === "saving"}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Mark as not useful"
                      title="Not useful"
                      className={`rounded-lg border p-2 transition-colors disabled:opacity-60 ${
                        currentVoteState.vote === "down"
                          ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))]"
                          : "border-[hsl(var(--line))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--bg))]"
                      }`}
                      onClick={() => submitFeedback(item, "down")}
                      disabled={currentVoteState.state === "saving"}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>

                  <select
                    className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-2.5 py-1.5 text-xs"
                    value={reasonByKey[item.opportunityKey] ?? item.feedbackSummary.userReason ?? "not_relevant"}
                    onChange={(event) =>
                      setReasonByKey((prev) => ({
                        ...prev,
                        [item.opportunityKey]: event.target.value,
                      }))
                    }
                  >
                    {DOWN_REASONS.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </div>

                {currentVoteState.message ? (
                  <p className="mt-2 text-xs text-[hsl(var(--muted-ink))]">{currentVoteState.message}</p>
                ) : null}

                <details className="mt-3 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
                    Why this score
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>Price advantage score: {Math.round(item.confidenceBreakdown.priceAdvantage * 100)}%</li>
                    <li>Data coverage score: {Math.round(item.confidenceBreakdown.dataCoverage * 100)}%</li>
                    <li>Category match score: {Math.round(item.confidenceBreakdown.categoryMatch * 100)}%</li>
                    <li>Price freshness score: {Math.round(item.confidenceBreakdown.priceFreshness * 100)}%</li>
                    <li>Feedback signal score: {Math.round(item.confidenceBreakdown.feedbackSignal * 100)}%</li>
                    <li>
                      Baseline price: {formatCurrency(item.alternative.billedAmount)} per{" "}
                      {item.alternative.billingCycle} (updated {item.alternative.priceUpdatedAt})
                    </li>
                  </ul>
                </details>

                {/* AI-powered live suggestions */}
                <div className="mt-3 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg))] p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-ink))]">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Live Suggestions
                    </p>
                    <div className="flex gap-1.5">
                      {aiByKey[item.opportunityKey]?.status === "done" && (
                        <button
                          type="button"
                          onClick={() => refreshWithAI(item, true)}
                          className="text-xs text-[hsl(var(--muted-ink))] underline"
                        >
                          Refresh
                        </button>
                      )}
                      {(!aiByKey[item.opportunityKey] || aiByKey[item.opportunityKey]?.status === "idle") && (
                        <button
                          type="button"
                          onClick={() => refreshWithAI(item)}
                          className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Ask AI
                        </button>
                      )}
                    </div>
                  </div>

                  {aiByKey[item.opportunityKey]?.status === "loading" && (
                    <p className="mt-2 text-xs text-[hsl(var(--muted-ink))]">Generating suggestions…</p>
                  )}

                  {aiByKey[item.opportunityKey]?.status === "error" && (
                    <p className="mt-2 text-xs text-[hsl(var(--danger))]">
                      {aiByKey[item.opportunityKey].error}
                    </p>
                  )}

                  {aiByKey[item.opportunityKey]?.status === "done" && (
                    <div className="mt-2 space-y-2">
                      {aiByKey[item.opportunityKey].from_cache && (
                        <p className="text-xs text-[hsl(var(--muted-ink))]/70">Served from cache (≤7 days old)</p>
                      )}
                      {aiByKey[item.opportunityKey].alternatives.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--muted-ink))]">
                          No cheaper alternatives found for this service at the current price.
                        </p>
                      ) : (
                        aiByKey[item.opportunityKey].alternatives.map((alt) => (
                          <div
                            key={`${alt.provider}-${alt.plan}`}
                            className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold">
                                {alt.provider} — {alt.plan}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[hsl(var(--success))]">
                                  {formatCurrency(alt.monthly_price)}/mo
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${riskClassName(alt.risk)}`}>
                                  {alt.risk}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-ink))]">{alt.reason}</p>
                            <p className="mt-0.5 text-xs text-[hsl(var(--muted-ink))]/70">
                              Switch: {alt.switching_cost}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
