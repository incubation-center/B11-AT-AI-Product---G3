import WorkspaceShell from "@/components/WorkspaceShell";
import ReminderSettingsCard from "@/components/ReminderSettingsCard";
import EmailReminderSettingsCard from "@/components/EmailReminderSettingsCard";
import PlanUsageCard from "@/components/PlanUsageCard";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getDueReminderEmailEnabledForUser } from "@/lib/notification-preferences";
import { getReminderDeliveryHistoryForUser } from "@/lib/reminder-delivery";

function formatDateTime(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getWorkspaceData();
  const [dueReminderEmailEnabled, reminderHistory] = await Promise.all([
    getDueReminderEmailEnabledForUser(data.userId),
    getReminderDeliveryHistoryForUser({ userId: data.userId, limit: 20 }),
  ]);

  const billById = new Map(data.userBills.map((bill) => [bill.id, bill]));

  return (
    <WorkspaceShell
      title="Settings"
      description="Account and notification settings."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <PlanUsageCard
        plan={data.userPlan}
        planConfig={data.planConfig}
        billCount={data.userBills.length}
      />

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <p className="text-sm text-[hsl(var(--muted-ink))]">Signed in as</p>
        <p className="mt-1 text-lg font-semibold">{data.session.user.email}</p>
        <div className="mt-4">
          <ReminderSettingsCard initialDays={data.reminderDaysBeforeDue} />
          <EmailReminderSettingsCard initialEnabled={dueReminderEmailEnabled} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <div className="rounded-lg bg-[hsl(var(--primary))] px-4 py-3">
          <h2 className="text-xl font-semibold text-white">Reminder Email History</h2>
          <p className="mt-1 text-sm text-white/85">
            Recent due reminder emails sent to your account.
          </p>
        </div>

        {reminderHistory.length === 0 ? (
          <p className="mt-4 text-sm text-[hsl(var(--muted-ink))]">
            No reminder emails sent yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--line))] text-[hsl(var(--muted-ink))]">
                  <th className="py-2 font-medium">Service</th>
                  <th className="py-2 font-medium">Due Date</th>
                  <th className="py-2 font-medium">Reminder Date</th>
                  <th className="py-2 font-medium">Sent At</th>
                  <th className="py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {reminderHistory.map((row) => (
                  <tr key={row.id} className="border-b border-[hsl(var(--line))]/60">
                    <td className="py-2 font-medium">
                      {billById.get(row.billId)?.serviceName ?? "Unknown service"}
                    </td>
                    <td className="py-2">{row.dueDate}</td>
                    <td className="py-2">{row.reminderDate}</td>
                    <td className="py-2">{formatDateTime(row.sentAt)}</td>
                    <td className="py-2">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
