import WorkspaceShell from "@/components/WorkspaceShell";
import { getWorkspaceData } from "@/lib/workspace-data";
import DashboardDocumentsPanel from "@/components/DashboardDocumentsPanel";
import CheaperAlternativesPanel from "@/components/CheaperAlternativesPanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  const recurringRatio =
    data.userBills.length > 0
      ? Math.round((data.recurringBills.length / data.userBills.length) * 100)
      : 0;
  const topServices = data.serviceSummary.slice(0, 3);
  const maxTopServiceSpend = topServices[0]?.totalAmount ?? 0;

  const billByDocumentId = new Map(
    data.userBills
      .filter((bill) => bill.sourceDocumentId)
      .map((bill) => [bill.sourceDocumentId as string, bill]),
  );

  const documentRows = data.userDocs.map((doc) => {
    const bill = billByDocumentId.get(doc.id);
    return {
      id: doc.id,
      serviceName: doc.serviceName,
      originalFilename: doc.originalFilename,
      docType: doc.docType,
      categoryHint: doc.categoryHint,
      uploadedAt: doc.createdAt,
      dueDate: bill?.dueDate ?? null,
      amount: bill?.amount ?? null,
      invoiceType: bill?.invoiceType ?? null,
    };
  });

  return (
    <WorkspaceShell
      title={`Welcome, ${data.session.user.name}!`}
      description="Track your billing status from dedicated pages: invoices, documents, alerts, and services."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Invoices</h3>
          <p className="mt-2 text-3xl font-bold">{data.userBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Recurring</h3>
          <p className="mt-2 text-3xl font-bold">{data.recurringBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Alerts</h3>
          <p className="mt-2 text-3xl font-bold">{data.sidebarCounts.alerts}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">This Month Spend</h3>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(data.monthlySpend)}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Invoice Mix</h3>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative h-28 w-28 rounded-full"
              style={{
                background: `conic-gradient(
                  hsl(var(--primary)) 0 ${recurringRatio}%,
                  hsl(var(--accent)) ${recurringRatio}% 100%
                )`,
              }}
            >
              <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[hsl(var(--surface))] text-xs font-semibold">
                {recurringRatio}%
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Recurring: <span className="font-semibold">{data.recurringBills.length}</span>
              </p>
              <p>
                One-time: <span className="font-semibold">{data.oneTimeBills.length}</span>
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Top Service Spend</h3>
          <div className="mt-4 space-y-2.5">
            {topServices.length === 0 && (
              <p className="text-sm text-[hsl(var(--muted-ink))]">No data yet.</p>
            )}
            {topServices.map((service) => (
              <div key={service.serviceName}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{service.serviceName}</span>
                  <span>{formatCurrency(service.totalAmount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]"
                    style={{
                      width:
                        maxTopServiceSpend > 0
                          ? `${(service.totalAmount / maxTopServiceSpend) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <CheaperAlternativesPanel
        opportunities={data.cheaperAlternativeOpportunities}
      />

      <DashboardDocumentsPanel rows={documentRows} />
    </WorkspaceShell>
  );
}
