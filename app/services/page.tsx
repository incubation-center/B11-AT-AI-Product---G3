import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const data = await getWorkspaceData();
  const maxSpend = data.serviceSummary[0]?.totalAmount ?? 0;

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
                <th className="py-2 font-medium">Total Spend</th>
                <th className="py-2 font-medium">Last Bill</th>
              </tr>
            </thead>
            <tbody>
              {data.serviceSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-[hsl(var(--muted-ink))]">
                    No service data yet.
                  </td>
                </tr>
              )}
              {data.serviceSummary.map((service) => {
                const name = service.serviceName ?? "Unknown";
                const initial = name.charAt(0).toUpperCase();
                const spendPct = maxSpend > 0 ? (service.totalAmount / maxSpend) * 100 : 0;
                return (
                  <tr key={service.serviceName} className="border-b border-[hsl(var(--line))]/60">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(name)}`}>
                          {initial}
                        </span>
                        <div>
                          <p className="font-medium">{name}</p>
                          {service.recurringCount > 0 && (
                            <span className="text-xs text-[hsl(var(--chart-1))]">
                              {service.recurringCount} recurring
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-[hsl(var(--muted-ink))]">{service.invoiceCount}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-20 font-medium">{formatCurrency(service.totalAmount)}</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
                          <div
                            className="h-full rounded-full bg-[hsl(var(--chart-1))]"
                            style={{ width: `${spendPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-[hsl(var(--muted-ink))]">{service.latestBillDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
