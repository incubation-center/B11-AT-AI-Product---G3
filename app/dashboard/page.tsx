import Link from "next/link";
import { ReceiptText, RefreshCw, TriangleAlert, DollarSign } from "lucide-react";
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

  const isNewUser = data.userBills.length === 0 && data.userDocs.length === 0;

  return (
    <WorkspaceShell
      title={`Welcome, ${data.session.user.name}!`}
      description="Track your billing status from dedicated pages: invoices, documents, alerts, and services."
      userName={data.session.user.name || "User"}
      sidebarCounts={data.sidebarCounts}
    >
      {isNewUser && (
        <section className="mb-6 rounded-2xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 p-6">
          <h2 className="text-lg font-semibold">Get started in 3 steps</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
            Duey helps you track bills, detect anomalies, and never miss a payment. Here&apos;s how to begin:
          </p>
          <ol className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">1</span>
              <div>
                <p className="text-sm font-medium">Upload a bill or invoice</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">Go to Documents and upload a PDF — AI will extract amounts, due dates, and classify it automatically.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">2</span>
              <div>
                <p className="text-sm font-medium">Review your invoices</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">Check the Invoices page to see recurring vs one-time bills and manage auto-renewal.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">3</span>
              <div>
                <p className="text-sm font-medium">Set up reminders</p>
                <p className="text-xs text-[hsl(var(--muted-ink))]">Head to Settings to configure email or Telegram reminders before due dates.</p>
              </div>
            </li>
          </ol>
          <Link
            href="/documents"
            className="mt-5 inline-block rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Upload your first document
          </Link>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-[hsl(var(--muted-ink))]">Invoices</h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent-soft))]">
              <ReceiptText className="h-4 w-4 text-[hsl(var(--primary))]" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">{data.userBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-[hsl(var(--muted-ink))]">Recurring</h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--chart-soft))]">
              <RefreshCw className="h-4 w-4 text-[hsl(var(--chart-1))]" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">{data.recurringBills.length}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-[hsl(var(--muted-ink))]">Alerts</h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--warning-soft))]">
              <TriangleAlert className="h-4 w-4 text-[hsl(var(--warning))]" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">{data.sidebarCounts.alerts}</p>
        </article>
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-[hsl(var(--muted-ink))]">This Month Spend</h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--success-soft))]">
              <DollarSign className="h-4 w-4 text-[hsl(var(--success))]" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(data.monthlySpend)}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">Invoice Mix</h3>
          {data.userBills.length === 0 ? (
            <p className="mt-6 text-sm text-[hsl(var(--muted-ink))]">No invoices yet — upload a document to get started.</p>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative h-28 w-28 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--chart-1)) 0 ${recurringRatio}%, hsl(var(--chart-2)) ${recurringRatio}% 100%)`,
                }}
              >
                <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[hsl(var(--surface))] text-xs font-semibold">
                  {recurringRatio}%
                </div>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-1))]" />
                  Recurring: <span className="font-semibold">{data.recurringBills.length}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />
                  One-time: <span className="font-semibold">{data.oneTimeBills.length}</span>
                </p>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
                  <div className="flex h-full w-full">
                    <div className="h-full bg-[hsl(var(--chart-1))]" style={{ width: `${recurringRatio}%` }} />
                    <div className="h-full bg-[hsl(var(--chart-2))]" style={{ width: `${100 - recurringRatio}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 shadow-sm">
          <h3 className="text-sm text-[hsl(var(--muted-ink))]">
            Top Service Spend
          </h3>
          <div className="mt-4 space-y-2.5">
            {topServices.length === 0 && (
              <p className="text-sm text-[hsl(var(--muted-ink))]">
                No data yet.
              </p>
            )}
            {topServices.map((service) => (
              <div key={service.serviceName}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{service.serviceName ?? "Unknown"}</span>
                  <span>{formatCurrency(service.totalAmount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted-soft))]">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--chart-1))]"
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

      {data.planConfig.features.cheaperAlternatives ? (
        <CheaperAlternativesPanel
          opportunities={data.cheaperAlternativeOpportunities}
        />
      ) : (
        <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium">Cost Optimization</p>
            <span className="rounded-full bg-[hsl(var(--primary))] px-2.5 py-0.5 text-xs font-semibold text-white">
              Basic+
            </span>
          </div>
          <p className="mt-2 text-sm text-[hsl(var(--muted-ink))]">
            Discover cheaper alternatives for your subscriptions and see how
            much you could save each year.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Upgrade to Basic
          </Link>
        </section>
      )}

      <DashboardDocumentsPanel rows={documentRows} />
    </WorkspaceShell>
  );
}
