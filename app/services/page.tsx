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

export default async function ServicesPage() {
  const data = await getWorkspaceData();

  return (
    <WorkspaceShell
      title="Services"
      description="Inspect billing grouped by provider."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--line))] text-[hsl(var(--muted-ink))]">
                <th className="py-2 font-medium">Service</th>
                <th className="py-2 font-medium">Invoices</th>
                <th className="py-2 font-medium">Recurring</th>
                <th className="py-2 font-medium">Total</th>
                <th className="py-2 font-medium">Last Bill</th>
              </tr>
            </thead>
            <tbody>
              {data.serviceSummary.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-[hsl(var(--muted-ink))]">
                    No service data yet.
                  </td>
                </tr>
              )}
              {data.serviceSummary.map((service) => (
                <tr key={service.serviceName} className="border-b border-[hsl(var(--line))]/60">
                  <td className="py-2 font-medium">{service.serviceName}</td>
                  <td className="py-2">{service.invoiceCount}</td>
                  <td className="py-2">{service.recurringCount}</td>
                  <td className="py-2">{formatCurrency(service.totalAmount)}</td>
                  <td className="py-2">{service.latestBillDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
