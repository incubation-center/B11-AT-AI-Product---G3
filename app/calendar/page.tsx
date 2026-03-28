import WorkspaceShell from "@/components/WorkspaceShell";
import BillingCalendar from "@/components/BillingCalendar";
import { getWorkspaceData } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const data = await getWorkspaceData();

  const billsWithDueDates = data.userBills.filter((b) => b.dueDate);

  return (
    <WorkspaceShell
      title="Calendar"
      description="Upcoming recurring payment dates."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <BillingCalendar
        bills={billsWithDueDates}
        dueReminders={data.dueReminders}
        reminderDaysBeforeDue={data.reminderDaysBeforeDue}
      />
    </WorkspaceShell>
  );
}
