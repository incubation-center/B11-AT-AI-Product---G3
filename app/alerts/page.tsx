import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getReminderLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`;
  if (daysUntilDue === 0) return "Due today";
  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
}

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
            {data.reminderDaysBeforeDue.join(", ")} day
            {data.reminderDaysBeforeDue.length === 1 && data.reminderDaysBeforeDue[0] === 1 ? "" : "s"}
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
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1 rounded-full bg-[hsl(var(--primary))]" />
          <div>
            <h2 className="text-base font-semibold text-[hsl(var(--ink))]">Due Reminders</h2>
            <p className="text-xs text-[hsl(var(--muted-ink))]">In-system reminders for recurring invoices within your reminder window.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.dueReminders.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-ink))]">
              No due reminders right now.
            </p>
          )}
          {data.dueReminders.map((item) => (
            <div
              key={item.billId}
              className="flex items-center justify-between rounded-xl bg-[hsl(var(--bg))] px-4 py-3"
            >
              <div>
                <p className="font-medium">{item.serviceName}</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  Due {item.dueDate} • {getReminderLabel(item.daysUntilDue)}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(item.amount)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1 rounded-full bg-[hsl(var(--primary))]" />
          <div>
            <h2 className="text-base font-semibold text-[hsl(var(--ink))]">Needs Review</h2>
            <p className="text-xs text-[hsl(var(--muted-ink))]">AI classifications under 70% confidence.</p>
          </div>
        </div>
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
