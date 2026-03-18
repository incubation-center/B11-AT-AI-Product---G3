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

export default async function InvoicesPage() {
  const data = await getWorkspaceData();

  const sorted = [...data.userBills].sort((a, b) => b.billDate.localeCompare(a.billDate));

  return (
    <WorkspaceShell
      title="Invoices"
      description="Review recurring and one-time invoices in one table."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[hsl(var(--bg))] px-4 py-3">
            <p className="text-xs text-[hsl(var(--muted-ink))]">All</p>
            <p className="text-xl font-semibold">{data.userBills.length}</p>
          </div>
          <div className="rounded-xl bg-[hsl(var(--bg))] px-4 py-3">
            <p className="text-xs text-[hsl(var(--muted-ink))]">Recurring</p>
            <p className="text-xl font-semibold">{data.recurringBills.length}</p>
          </div>
          <div className="rounded-xl bg-[hsl(var(--bg))] px-4 py-3">
            <p className="text-xs text-[hsl(var(--muted-ink))]">One-time</p>
            <p className="text-xl font-semibold">{data.oneTimeBills.length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--line))] text-[hsl(var(--muted-ink))]">
                <th className="py-2 font-medium">Service</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Amount</th>
                <th className="py-2 font-medium">Bill Date</th>
                <th className="py-2 font-medium">Due Date</th>
                <th className="py-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-[hsl(var(--muted-ink))]">
                    No invoices yet.
                  </td>
                </tr>
              )}
              {sorted.map((bill) => (
                <tr key={bill.id} className="border-b border-[hsl(var(--line))]/60">
                  <td className="py-2 font-medium">{bill.serviceName}</td>
                  <td className="py-2">{bill.invoiceType === "recurring" ? "Recurring" : "One-time"}</td>
                  <td className="py-2">{formatCurrency(bill.amount)}</td>
                  <td className="py-2">{bill.billDate}</td>
                  <td className="py-2">{bill.dueDate ?? "-"}</td>
                  <td className="py-2">
                    {typeof bill.classificationConfidence === "number"
                      ? `${Math.round(bill.classificationConfidence * 100)}%`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
