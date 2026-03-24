import WorkspaceShell from "@/components/WorkspaceShell";
import ReminderSettingsCard from "@/components/ReminderSettingsCard";
import EmailReminderSettingsCard from "@/components/EmailReminderSettingsCard";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getDueReminderEmailEnabledForUser } from "@/lib/notification-preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getWorkspaceData();
  const dueReminderEmailEnabled = await getDueReminderEmailEnabledForUser(
    data.userId,
  );

  return (
    <WorkspaceShell
      title="Settings"
      description="Account and notification settings."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <p className="text-sm text-[hsl(var(--muted-ink))]">Signed in as</p>
        <p className="mt-1 text-lg font-semibold">{data.session.user.email}</p>
        <div className="mt-4 rounded-xl bg-[hsl(var(--bg))] p-4 text-sm text-[hsl(var(--muted-ink))]">
          Notification rules, export preferences, and billing thresholds can be
          configured here next.
        </div>
        <div className="mt-4">
          <ReminderSettingsCard initialDays={data.reminderDaysBeforeDue} />
          <EmailReminderSettingsCard initialEnabled={dueReminderEmailEnabled} />
        </div>
      </section>
    </WorkspaceShell>
  );
}
