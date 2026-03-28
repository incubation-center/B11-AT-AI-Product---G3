"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  FileCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  X,
  Loader2,
  ChevronRight,
  ClipboardList,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DocType = "contract" | "bill" | "other";

export type DocRecord = {
  id: string;
  userId: string;
  serviceName: string | null;
  categoryHint: string | null;
  docType: DocType;
  originalFilename: string;
  mimeType: string;
  textLength: number;
  createdAt: string;
};

export type BillRec = {
  id: string;
  userId: string;
  serviceName: string;
  billDate: string;
  dueDate: string | null;
  amount: number;
  usage: number | null;
  isRecurring: boolean;
  invoiceType: "recurring" | "one_time";
  classificationReason: string | null;
  classificationEvidence: string[];
  classificationConfidence: number | null;
  sourceDocumentId: string | null;
  createdAt: string;
};

type ExtractResult = {
  category: string;
  next_due_date: string | null;
  amount: number | null;
  notice_period: string | null;
  penalty_rules: string[];
  hidden_rules: string[];
  evidence: string[];
};

function getInvoiceTypeLabel(bill: BillRec | null): string {
  if (!bill) {
    return "Invoice / Bill";
  }
  return bill.invoiceType === "recurring"
    ? "Recurring Invoice"
    : "One-time Invoice";
}

function formatConfidence(confidence: number | null): string | null {
  if (typeof confidence !== "number") {
    return null;
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

export default function DocumentsGrid({
  documents,
  bills,
  userId,
}: {
  documents: DocRecord[];
  bills: BillRec[];
  userId: string;
}) {
  const router = useRouter();
  const ITEMS_PER_PAGE = 6;
  const [selected, setSelected] = useState<DocRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}?user_id=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setConfirmId(null);
      router.refresh();
    } catch {
      // silently reset on failure
    } finally {
      setDeletingId(null);
    }
  }

  const billByDocId = new Map<string, BillRec>();
  for (const b of bills) {
    if (b.sourceDocumentId) billByDocId.set(b.sourceDocumentId, b);
  }

  const now = new Date();
  const nowMs = now.getTime();

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-[hsl(var(--muted-ink))]">
        <ClipboardList className="h-12 w-12 opacity-30 mb-3" />
        <p className="text-sm font-medium">No documents yet</p>
        <p className="text-xs mt-1 opacity-70">
          Upload a bill or contract using Quick Actions above.
        </p>
      </div>
    );
  }

  const sorted = [...documents].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paged = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((doc) => {
          const bill = billByDocId.get(doc.id);
          const isOverdue = bill?.dueDate && new Date(bill.dueDate) < now;
          const isDueSoon =
            bill?.dueDate &&
            !isOverdue &&
            new Date(bill.dueDate).getTime() - nowMs < 7 * 24 * 60 * 60 * 1000;

          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(doc)}
              onKeyDown={(e) => e.key === "Enter" && setSelected(doc)}
              className="group cursor-pointer text-left rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.5)] hover:shadow-md"
            >
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    doc.docType === "bill"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : doc.docType === "contract"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-gray-500/10 text-gray-600"
                  }`}
                >
                  {doc.docType === "bill" ? (
                    <Receipt className="h-5 w-5" />
                  ) : doc.docType === "contract" ? (
                    <FileCheck className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {doc.serviceName ?? doc.originalFilename}
                  </p>
                  {doc.serviceName && (
                    <p className="text-xs text-[hsl(var(--muted-ink))] truncate mt-0.5">
                      {doc.originalFilename}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {confirmId === doc.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        disabled={deletingId === doc.id}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Delete"
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(null);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-[hsl(var(--muted-ink))] hover:bg-[hsl(var(--bg))] transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(doc.id);
                      }}
                      className="rounded-lg p-1.5 text-[hsl(var(--muted-ink))] opacity-0 group-hover:opacity-100 transition hover:bg-red-500/10 hover:text-red-500"
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-ink))] transition group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    doc.docType === "bill"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : doc.docType === "contract"
                        ? "bg-blue-500/10 text-blue-700"
                        : "bg-gray-500/10 text-gray-700"
                  }`}
                >
                  {doc.docType === "bill"
                    ? bill
                      ? getInvoiceTypeLabel(bill)
                      : "Invoice / Bill"
                    : doc.docType === "contract"
                      ? "Contract"
                      : "Document"}
                </span>

                {bill && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">
                    <DollarSign className="h-3 w-3" />
                    {bill.amount.toFixed(2)}
                  </span>
                )}

                {bill?.dueDate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isOverdue
                        ? "bg-red-500/10 text-red-600"
                        : isDueSoon
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-gray-500/10 text-gray-600"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {isOverdue
                      ? `Overdue · ${bill.dueDate}`
                      : isDueSoon
                        ? `Due soon · ${bill.dueDate}`
                        : `Due ${bill.dueDate}`}
                  </span>
                )}
              </div>

              {/* Footer */}
              <p className="mt-2.5 text-xs text-[hsl(var(--muted-ink))]">
                Uploaded {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[hsl(var(--muted-ink))]">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span className="text-xs text-[hsl(var(--muted-ink))]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <DocumentDetailModal
          doc={selected}
          bill={billByDocId.get(selected.id) ?? null}
          userId={userId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function DocumentDetailModal({
  doc,
  bill,
  userId,
  onClose,
}: {
  doc: DocRecord;
  bill: BillRec | null;
  userId: string;
  onClose: () => void;
}) {
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(
    null,
  );
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  async function handleExtract() {
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          document_id: doc.id,
          service_name: doc.serviceName ?? undefined,
          doc_type: doc.docType,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.detail ?? data?.error ?? "Extraction failed");
      setExtractResult(data as ExtractResult);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to extract");
    } finally {
      setExtracting(false);
    }
  }

  const nowDate = new Date();
  const nowMs = nowDate.getTime();
  const isOverdue = bill?.dueDate && new Date(bill.dueDate) < nowDate;
  const daysUntilDue = bill?.dueDate
    ? Math.ceil(
        (new Date(bill.dueDate).getTime() - nowMs) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-[hsl(var(--line))] px-6 py-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              doc.docType === "bill"
                ? "bg-emerald-500/10 text-emerald-600"
                : doc.docType === "contract"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-gray-500/10 text-gray-600"
            }`}
          >
            {doc.docType === "bill" ? (
              <Receipt className="h-5 w-5" />
            ) : doc.docType === "contract" ? (
              <FileCheck className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">
              {doc.serviceName ?? doc.originalFilename}
            </h2>
            <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-ink))]">
              {doc.originalFilename} ·{" "}
              {doc.docType === "bill"
                ? bill
                  ? getInvoiceTypeLabel(bill)
                  : "Invoice / Bill"
                : doc.docType === "contract"
                  ? "Contract"
                  : "Document"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-[hsl(var(--bg))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="space-y-4 overflow-y-auto p-6">
          {/* Overdue / due soon banner */}
          {bill?.dueDate && isOverdue && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-700">
                Payment overdue since {bill.dueDate}
              </p>
            </div>
          )}
          {bill?.dueDate &&
            !isOverdue &&
            daysUntilDue !== null &&
            daysUntilDue <= 7 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-amber-700">
                  Payment due in {daysUntilDue} day
                  {daysUntilDue === 1 ? "" : "s"} · {bill.dueDate}
                </p>
              </div>
            )}

          {/* General info */}
          <div className="grid grid-cols-2 gap-2">
            {doc.serviceName && (
              <InfoTile label="Service / Provider" value={doc.serviceName} />
            )}
            {doc.categoryHint && (
              <InfoTile label="Category" value={doc.categoryHint} />
            )}
            <InfoTile
              label="Document Type"
              value={
                doc.docType === "bill"
                  ? bill
                    ? getInvoiceTypeLabel(bill)
                    : "Invoice / Bill"
                  : doc.docType === "contract"
                    ? "Contract"
                    : "Document"
              }
            />
            <InfoTile
              label="Uploaded"
              value={new Date(doc.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            />
          </div>

          {/* Bill-specific details */}
          {bill && (
            <div className="space-y-2 rounded-xl border border-[hsl(var(--line))] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
                  Billing Details
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    bill.isRecurring
                      ? "bg-blue-500/10 text-blue-700"
                      : "bg-gray-500/10 text-gray-600"
                  }`}
                >
                  {bill.invoiceType === "recurring" ? "Recurring" : "One-time"}
                </span>
              </div>
              {!bill.isRecurring && (
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  This is a one-time invoice. Anomaly tracking is not applied.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <InfoTile
                  label="Amount Due"
                  value={`$${bill.amount.toFixed(2)}`}
                  highlight
                />
                {bill.billDate && (
                  <InfoTile label="Invoice Date" value={bill.billDate} />
                )}
                {bill.dueDate && (
                  <InfoTile
                    label="Payment Due"
                    value={bill.dueDate}
                    warning={!!isOverdue}
                    warningText={
                      isOverdue
                        ? "Overdue"
                        : daysUntilDue !== null && daysUntilDue <= 7
                          ? `${daysUntilDue}d left`
                          : undefined
                    }
                  />
                )}
                {bill.usage !== null && (
                  <InfoTile label="Usage" value={String(bill.usage)} />
                )}
              </div>
            </div>
          )}

          {bill && (
            <div className="space-y-3 rounded-xl border border-[hsl(var(--line))] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
                  AI Invoice Type Decision
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    bill.invoiceType === "recurring"
                      ? "bg-blue-500/10 text-blue-700"
                      : "bg-gray-500/10 text-gray-700"
                  }`}
                >
                  {bill.invoiceType === "recurring" ? "Recurring" : "One-time"}
                </span>
              </div>
              <p className="text-sm font-medium">
                {bill.classificationReason ??
                  "This legacy record does not include an AI explanation."}
              </p>
              {formatConfidence(bill.classificationConfidence) && (
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  {formatConfidence(bill.classificationConfidence)}
                </p>
              )}
              {bill.classificationEvidence.length > 0 && (
                <ul className="space-y-1">
                  {bill.classificationEvidence.map((evidence, index) => (
                    <li key={index} className="flex gap-2 text-xs">
                      <span className="mt-0.5 shrink-0 text-amber-500">-</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Extraction prompt */}
          {!extractResult && (
            <div className="rounded-xl border border-dashed border-[hsl(var(--line))] p-4 text-center">
              <p className="mb-1 text-sm font-medium">
                {doc.docType === "contract"
                  ? "Extract key contract terms"
                  : "Analyze this invoice"}
              </p>
              <p className="mb-3 text-xs text-[hsl(var(--muted-ink))]">
                {doc.docType === "contract"
                  ? "AI will surface due dates, penalties, notice periods, and hidden auto-renewal clauses."
                  : "AI will identify the category, flag unusual charges, and extract key billing details."}
              </p>
              {extractError && (
                <p className="mb-2 text-xs text-destructive">{extractError}</p>
              )}
              <Button
                onClick={handleExtract}
                disabled={extracting}
                size="sm"
                variant={doc.docType === "contract" ? "default" : "outline"}
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {doc.docType === "contract"
                      ? "Extracting terms…"
                      : "Analyzing…"}
                  </span>
                ) : doc.docType === "contract" ? (
                  "Extract Contract Terms"
                ) : (
                  "Analyze Invoice"
                )}
              </Button>
            </div>
          )}

          {/* Extract results */}
          {extractResult && (
            <div className="space-y-3 rounded-xl border border-[hsl(var(--line))] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
                AI Analysis Results
              </p>

              <div className="grid grid-cols-2 gap-2">
                <InfoTile label="Category" value={extractResult.category} />
                {extractResult.next_due_date && (
                  <InfoTile
                    label="Next Due Date"
                    value={extractResult.next_due_date}
                  />
                )}
                {extractResult.amount !== null && (
                  <InfoTile
                    label="Amount"
                    value={`$${extractResult.amount}`}
                    highlight
                  />
                )}
                {extractResult.notice_period && (
                  <InfoTile
                    label="Notice Period"
                    value={extractResult.notice_period}
                  />
                )}
              </div>

              {extractResult.penalty_rules.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[hsl(var(--muted-ink))]">
                    Penalty Rules
                  </p>
                  <ul className="space-y-1">
                    {extractResult.penalty_rules.map((rule, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="mt-0.5 shrink-0 text-amber-500">
                          •
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {extractResult.hidden_rules.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Hidden Clauses to Watch
                  </p>
                  <ul className="space-y-1">
                    {extractResult.hidden_rules.map((rule, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="mt-0.5 shrink-0 text-amber-600">
                          !
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {extractResult.evidence.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-[hsl(var(--muted-ink))] hover:text-[hsl(var(--ink))] list-none flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 transition group-open:rotate-90" />
                    Show source evidence ({extractResult.evidence.length})
                  </summary>
                  <ul className="mt-1.5 space-y-1 pl-4">
                    {extractResult.evidence.map((e, i) => (
                      <li
                        key={i}
                        className="text-xs text-[hsl(var(--muted-ink))] italic"
                      >
                        &ldquo;{e}&rdquo;
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[hsl(var(--line))] px-6 py-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  highlight,
  warning,
  warningText,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
  warningText?: string;
}) {
  return (
    <div className="rounded-lg bg-[hsl(var(--bg))] px-3 py-2">
      <p className="text-xs text-[hsl(var(--muted-ink))]">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          highlight
            ? "text-[hsl(var(--primary))]"
            : warning
              ? "text-red-600"
              : ""
        }`}
      >
        {value}
        {warningText && (
          <span className="ml-1.5 text-xs font-medium text-amber-500">
            ({warningText})
          </span>
        )}
      </p>
    </div>
  );
}
