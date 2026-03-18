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

export default async function CalendarPage() {
  const data = await getWorkspaceData();

  return (
    <WorkspaceShell
      title="Calendar"
      description="Upcoming recurring payment dates."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <p className="mb-3 text-sm text-[hsl(var(--muted-ink))]">
          Calendar reminders are based on your setting:{" "}
          <span className="font-medium text-[hsl(var(--ink))]">
            {data.reminderDaysBeforeDue} day
            {data.reminderDaysBeforeDue === 1 ? "" : "s"}
          </span>{" "}
          before due date.
        </p>
        <div className="space-y-2">
          {data.upcomingPayments.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-ink))]">
              No upcoming recurring payments detected.
            </p>
          )}
          {data.upcomingPayments.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between rounded-xl bg-[hsl(var(--bg))] px-4 py-3"
            >
              <div>
                <p className="font-medium">{bill.serviceName}</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  Due {bill.dueDate}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(bill.amount)}</p>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
