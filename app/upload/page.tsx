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
      <div className="space-y-8">
        {/* Upload */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
            Quick Actions
          </h2>
          <div className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5">
            <QuickActions userId={data.userId} />
          </div>
        </div>

        {/* Documents */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
              Your Documents
            </h2>
            <span className="rounded-full border border-[hsl(var(--line))] px-2.5 py-0.5 text-xs text-[hsl(var(--muted-ink))]">
              {data.userDocs.length} total
            </span>
          </div>
          <DocumentsGrid
            documents={data.userDocs}
            bills={data.userBills}
            userId={data.userId}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
