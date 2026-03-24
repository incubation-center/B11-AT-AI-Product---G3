import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

function percent(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getWorkspaceData();
  const totalBills = data.userBills.length;
  const recurringShare =
    totalBills > 0 ? (data.recurringBills.length / totalBills) * 100 : 0;
  const oneTimeShare = 100 - recurringShare;

  const topServices = data.serviceSummary.slice(0, 5);
  const maxServiceTotal = topServices[0]?.totalAmount ?? 0;

  const dueSoonCount = data.dueReminders.filter(
    (item) => item.status === "due_soon",
  ).length;
  const dueTodayCount = data.dueReminders.filter(
    (item) => item.status === "due_today",
  ).length;
  const overdueCount = data.dueReminders.filter(
    (item) => item.status === "overdue",
  ).length;
  const totalDueStatus = dueSoonCount + dueTodayCount + overdueCount;

  const dueSoonWidth = totalDueStatus > 0 ? (dueSoonCount / totalDueStatus) * 100 : 0;
  const dueTodayWidth = totalDueStatus > 0 ? (dueTodayCount / totalDueStatus) * 100 : 0;
  const overdueWidth = totalDueStatus > 0 ? (overdueCount / totalDueStatus) * 100 : 0;

  return (
    <WorkspaceShell
      title="Reports"
      description="Quick distribution and spending metrics."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="grid gap-4 sm:grid-cols-3">
        <ReportTile
          label="Recurring Share"
          value={percent(data.recurringBills.length, data.userBills.length)}
        />
        <ReportTile
          label="One-time Share"
          value={percent(data.oneTimeBills.length, data.userBills.length)}
        />
        <ReportTile
          label="Contracts Indexed"
          value={String(data.contractCount)}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-ink))]">Invoice Mix</p>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-36 w-36 rounded-full border-8 border-[hsl(var(--primary))] bg-[hsl(var(--surface))]">
              <div className="absolute inset-4 flex items-center justify-center rounded-full bg-[hsl(var(--surface))] text-sm font-semibold">
                {totalBills}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                Recurring: {data.recurringBills.length} ({Math.round(recurringShare)}%)
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                One-time: {data.oneTimeBills.length} ({Math.round(oneTimeShare)}%)
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-ink))]">Due Reminder Status</p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
            <div className="flex h-full w-full">
              <div style={{ width: `${dueSoonWidth}%` }} className="bg-[hsl(var(--success))]" />
              <div style={{ width: `${dueTodayWidth}%` }} className="bg-[hsl(var(--warning))]" />
              <div style={{ width: `${overdueWidth}%` }} className="bg-[hsl(var(--danger))]" />
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <p className="rounded-lg bg-[hsl(var(--success-soft))] px-3 py-2">
              Due soon: <span className="font-semibold">{dueSoonCount}</span>
            </p>
            <p className="rounded-lg bg-[hsl(var(--warning-soft))] px-3 py-2">
              Due today: <span className="font-semibold">{dueTodayCount}</span>
            </p>
            <p className="rounded-lg bg-[hsl(var(--danger-soft))] px-3 py-2">
              Overdue: <span className="font-semibold">{overdueCount}</span>
            </p>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
        <p className="text-sm text-[hsl(var(--muted-ink))]">Top Services by Spend</p>
        <div className="mt-4 space-y-3">
          {topServices.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-ink))]">
              No service spending data yet.
            </p>
          )}
          {topServices.map((service) => (
            <div key={service.serviceName}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <p className="font-medium">{service.serviceName}</p>
                <p className="text-[hsl(var(--muted-ink))]">
                  {formatCurrency(service.totalAmount)}
                </p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--primary))]"
                  style={{
                    width:
                      maxServiceTotal > 0
                        ? `${(service.totalAmount / maxServiceTotal) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}

function ReportTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
      <p className="text-sm text-[hsl(var(--muted-ink))]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}
