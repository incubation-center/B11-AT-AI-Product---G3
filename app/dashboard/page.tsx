import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getWorkspaceData();

  return (
    <WorkspaceShell
      title={`Welcome, ${data.session.user.name}!`}
      description="Track your billing status from dedicated pages: invoices, documents, alerts, and services."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Invoices</h3>
          <p className="mt-2 text-3xl font-bold">{data.userBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Recurring</h3>
          <p className="mt-2 text-3xl font-bold">{data.recurringBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Alerts</h3>
          <p className="mt-2 text-3xl font-bold">{data.sidebarCounts.alerts}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">This Month Spend</h3>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(data.monthlySpend)}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Quick Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[hsl(var(--bg))] p-4">
            <p className="text-xs text-[hsl(var(--muted-ink))]">Upcoming Payments</p>
            <p className="mt-1 text-2xl font-semibold">{data.upcomingPayments.length}</p>
          </div>
          <div className="rounded-xl bg-[hsl(var(--bg))] p-4">
            <p className="text-xs text-[hsl(var(--muted-ink))]">Low Confidence AI</p>
            <p className="mt-1 text-2xl font-semibold">{data.lowConfidenceCount}</p>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
