import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const data = await getWorkspaceData();

  const lowConfidenceBills = data.userBills.filter(
    (bill) =>
      typeof bill.classificationConfidence === "number" &&
      bill.classificationConfidence < 0.7,
  );

  return (
    <WorkspaceShell
      title="Alerts"
      description="Review due reminders, anomaly signals, and low-confidence classifications."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <p className="mb-3 text-sm text-[hsl(var(--muted-ink))]">
          Reminder window:{" "}
          <span className="font-medium text-[hsl(var(--ink))]">
            {data.reminderDaysBeforeDue} day
            {data.reminderDaysBeforeDue === 1 ? "" : "s"}
          </span>{" "}
          before due date.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <AlertCard label="Due/Overdue" value={data.dueAlerts.length} />
          <AlertCard label="Anomalies" value={data.anomalyCount} />
          <AlertCard label="Low Confidence" value={data.lowConfidenceCount} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Needs Review</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
          AI classifications under 70% confidence.
        </p>
        <div className="mt-4 space-y-2">
          {lowConfidenceBills.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-ink))]">
              No low-confidence invoices.
            </p>
          )}
          {lowConfidenceBills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between rounded-xl bg-[hsl(var(--bg))] px-4 py-3"
            >
              <div>
                <p className="font-medium">{bill.serviceName}</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  {bill.classificationReason ?? "No explanation"}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {Math.round((bill.classificationConfidence ?? 0) * 100)}%
              </p>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}

function AlertCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl bg-[hsl(var(--bg))] p-4">
      <p className="text-xs text-[hsl(var(--muted-ink))]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}
