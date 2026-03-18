import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

function percent(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getWorkspaceData();

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
