"use client";

import { useMemo, useState } from "react";

type DocType = "contract" | "bill" | "other";
type InvoiceType = "recurring" | "one_time" | null;
type DueDateSort = "earliest" | "latest";
type DocFilter = "all" | DocType;

export type DashboardDocumentRow = {
  id: string;
  serviceName: string | null;
  originalFilename: string;
  docType: DocType;
  categoryHint: string | null;
  uploadedAt: string;
  dueDate: string | null;
  amount: number | null;
  invoiceType: InvoiceType;
};

function formatCurrency(amount: number | null): string {
  if (typeof amount !== "number") return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardDocumentsPanel({
  rows,
}: {
  rows: DashboardDocumentRow[];
}) {
  const [query, setQuery] = useState("");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [dueSort, setDueSort] = useState<DueDateSort>("earliest");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    const byFilter = rows.filter((row) =>
      docFilter === "all" ? true : row.docType === docFilter,
    );

    const byQuery = byFilter.filter((row) => {
      if (!lowered) return true;
      return (
        row.originalFilename.toLowerCase().includes(lowered) ||
        (row.serviceName ?? "").toLowerCase().includes(lowered) ||
        (row.categoryHint ?? "").toLowerCase().includes(lowered) ||
        (row.dueDate ?? "").toLowerCase().includes(lowered)
      );
    });

    return byQuery.sort((a, b) => {
      const aHasDue = !!a.dueDate;
      const bHasDue = !!b.dueDate;
      if (aHasDue && bHasDue) {
        const aDue = new Date(a.dueDate as string).getTime();
        const bDue = new Date(b.dueDate as string).getTime();
        return dueSort === "earliest" ? aDue - bDue : bDue - aDue;
      }
      if (aHasDue && !bHasDue) return -1;
      if (!aHasDue && bHasDue) return 1;
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
  }, [rows, query, docFilter, dueSort]);

  return (
    <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
      <div className="flex flex-col gap-3 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Uploaded Documents</h2>
          <p className="mt-1 text-sm text-white/85">
            Search, filter, and order by due date.
          </p>
        </div>
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search service, file, category, due date..."
          className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--bg))] px-3 py-2 text-sm"
        />
        <select
          value={docFilter}
          onChange={(event) => setDocFilter(event.target.value as DocFilter)}
          className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--bg))] px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="bill">Bill</option>
          <option value="contract">Contract</option>
          <option value="other">Other</option>
        </select>
        <select
          value={dueSort}
          onChange={(event) => setDueSort(event.target.value as DueDateSort)}
          className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--bg))] px-3 py-2 text-sm"
        >
          <option value="earliest">Due date: Earliest</option>
          <option value="latest">Due date: Latest</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--line))] text-[hsl(var(--muted-ink))]">
              <th className="py-2 font-medium">Service</th>
              <th className="py-2 font-medium">File</th>
              <th className="py-2 font-medium">Doc Type</th>
              <th className="py-2 font-medium">Invoice Type</th>
              <th className="py-2 font-medium">Amount</th>
              <th className="py-2 font-medium">Due Date</th>
              <th className="py-2 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-[hsl(var(--muted-ink))]">
                  No documents match your current filters.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-[hsl(var(--line))]/60">
                <td className="py-2 font-medium">{row.serviceName ?? "-"}</td>
                <td className="py-2">{row.originalFilename}</td>
                <td className="py-2 capitalize">{row.docType}</td>
                <td className="py-2">
                  {row.invoiceType === "recurring"
                    ? "Recurring"
                    : row.invoiceType === "one_time"
                      ? "One-time"
                      : "-"}
                </td>
                <td className="py-2">{formatCurrency(row.amount)}</td>
                <td className="py-2">{formatDate(row.dueDate)}</td>
                <td className="py-2">{formatDate(row.uploadedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
