import Link from "next/link";
import type { Plan, PlanConfig } from "@/lib/plans";

type Props = {
  plan: Plan;
  planConfig: PlanConfig;
  billCount: number;
};

const PLAN_BADGE: Record<Plan, string> = {
  free: "bg-[hsl(var(--muted-soft))] text-[hsl(var(--muted-ink))]",
  basic: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
  pro: "bg-[hsl(var(--primary))] text-white",
};

export default function PlanUsageCard({ plan, planConfig, billCount }: Props) {
  const max = planConfig.maxBills;
  const usedPct = max === null ? 0 : Math.min(100, (billCount / max) * 100);
  const atLimit = max !== null && billCount >= max;
  const nearLimit = max !== null && billCount >= max * 0.8;

  return (
    <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[hsl(var(--muted-ink))]">Current Plan</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                PLAN_BADGE[plan],
              ].join(" ")}
            >
              {planConfig.label}
            </span>
            {plan !== "pro" && (
              <Link
                href="/pricing"
                className="text-xs font-medium text-[hsl(var(--primary))] underline"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-[hsl(var(--muted-ink))]">Bills used</p>
          <p className="mt-1 text-lg font-bold">
            {billCount}
            <span className="text-sm font-normal text-[hsl(var(--muted-ink))]">
              {max === null ? " / ∞" : ` / ${max}`}
            </span>
          </p>
        </div>
      </div>

      {max !== null && (
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
            <div
              className={[
                "h-full rounded-full transition-all",
                atLimit
                  ? "bg-[hsl(var(--danger))]"
                  : nearLimit
                    ? "bg-[hsl(var(--warning))]"
                    : "bg-[hsl(var(--primary))]",
              ].join(" ")}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {atLimit && (
            <p className="mt-2 text-xs text-[hsl(var(--danger))]">
              You&apos;ve reached your bill limit.{" "}
              <Link href="/pricing" className="font-medium underline">
                Upgrade your plan
              </Link>{" "}
              to add more.
            </p>
          )}
          {!atLimit && nearLimit && (
            <p className="mt-2 text-xs text-[hsl(var(--warning))]">
              Approaching your limit ({billCount}/{max} bills).{" "}
              <Link href="/pricing" className="font-medium underline">
                Upgrade
              </Link>{" "}
              before you hit the cap.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["Email Alerts", planConfig.features.basicEmailAlerts],
            ["Anomaly Detection", planConfig.features.anomalyDetection],
            ["Cost Alternatives", planConfig.features.cheaperAlternatives],
            ["Export CSV/PDF", planConfig.features.exportCsv],
          ] as [string, boolean][]
        ).map(([label, enabled]) => (
          <div
            key={label}
            className={[
              "rounded-lg px-3 py-2 text-xs",
              enabled
                ? "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
                : "bg-[hsl(var(--muted-soft))] text-[hsl(var(--muted-ink))]/60",
            ].join(" ")}
          >
            <span className="font-semibold">{enabled ? "✓" : "✕"}</span>{" "}
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
