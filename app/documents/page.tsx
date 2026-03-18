import WorkspaceShell from "@/components/WorkspaceShell";
import QuickActions from "@/components/QuickActions";
import DocumentsGrid from "@/components/DocumentsGrid";
import { getWorkspaceData } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const data = await getWorkspaceData();

  return (
    <WorkspaceShell
      title="Documents"
      description="Upload and inspect contracts, invoices, and receipts."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold">Quick Actions</h2>
        <QuickActions userId={data.userId} />
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your Documents</h2>
          <span className="rounded-full bg-[hsl(var(--bg))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-ink))]">
            {data.userDocs.length} total
          </span>
        </div>
        <DocumentsGrid
          documents={data.userDocs}
          bills={data.userBills}
          userId={data.userId}
        />
      </section>
    </WorkspaceShell>
  );
}
