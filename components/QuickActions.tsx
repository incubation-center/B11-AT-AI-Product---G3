"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type UploadResult = {
  document_id: string;
  chunks_indexed: number;
  doc_type: string;
  service_name: string | null;
  bill_subtype: "subscription" | "one_time" | null;
  bill_record?: {
    amount: number;
    billDate: string;
    dueDate: string | null;
    invoiceType: "recurring" | "one_time";
    classificationReason: string | null;
    classificationEvidence: string[];
    classificationConfidence: number | null;
  } | null;
};

type AnomalyResult = {
  is_anomaly: boolean;
  change_percent: number | null;
  cause_type: string;
  cause_summary: string;
};

type ExtractResult = {
  category: string;
  next_due_date: string | null;
  amount: number | null;
  notice_period: string | null;
  penalty_rules: string[];
  hidden_rules: string[];
};

type Modal = "contract" | "bill" | null;

function getInvoiceTypeLabel(
  invoiceType: "recurring" | "one_time" | undefined,
): string {
  return invoiceType === "recurring" ? "Recurring" : "One-time";
}

function formatConfidence(confidence: number | null | undefined): string | null {
  if (typeof confidence !== "number") {
    return null;
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

export default function QuickActions({ userId }: { userId: string }) {
  const [modal, setModal] = useState<Modal>(null);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setModal("contract")}
        className="w-full rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4 text-left transition hover:bg-[hsl(var(--bg))] hover:border-[hsl(var(--primary)/0.4)]"
      >
        <div className="flex items-center gap-2 mb-1">
          <Upload className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h3 className="font-semibold">Upload Document</h3>
        </div>
        <p className="text-sm text-[hsl(var(--muted-ink))]">
          Drop any bill, invoice, or contract — AI will automatically detect the
          type, extract key info, and check for anomalies
        </p>
      </button>

      {modal === "contract" && (
        <UploadModal
          userId={userId}
          title="Upload Document"
          description="Upload a PDF or image. AI will detect the document type and extract everything automatically."
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function UploadModal({
  userId,
  title,
  description,
  onClose,
  onDone,
}: {
  userId: string;
  title: string;
  description: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "analyzing" | "extracting" | "done" | "error"
  >("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(
    null,
  );
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(
    null,
  );
  const [detectedDocType, setDetectedDocType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isDragging = useRef(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    isDragging.current = false;
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("user_id", userId);

      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: form,
      });
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) {
        throw new Error(
          ingestData?.detail ||
            ingestData?.error ||
            "Failed to upload document",
        );
      }
      const result = ingestData as UploadResult;
      setUploadResult(result);
      setDetectedDocType(result.doc_type);

      if (result.doc_type === "contract") {
        setStatus("extracting");
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            document_id: result.document_id,
            service_name: result.service_name || undefined,
            doc_type: "contract",
          }),
        });
        if (extractRes.ok) {
          setExtractResult(await extractRes.json());
        } else {
          const extractErr = await extractRes.json().catch(() => ({}));
          toast.warning(
            extractErr?.error === "no_indexed_chunks_found_for_filters"
              ? "Indexed but no text chunks found to extract from."
              : `Extraction warning: ${extractErr?.detail ?? "Could not extract terms"}`,
          );
        }
      }

      if (
        result.doc_type === "bill" &&
        result.service_name &&
        result.bill_record?.amount &&
        result.bill_record.invoiceType === "recurring"
      ) {
        setStatus("analyzing");
        const anomalyRes = await fetch("/api/detect-anomaly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            service_name: result.service_name,
            current_amount: result.bill_record.amount,
            bill_date: result.bill_record.billDate,
            due_date: result.bill_record.dueDate,
            invoice_type: result.bill_record.invoiceType,
          }),
        });
        if (anomalyRes.ok) {
          setAnomalyResult(await anomalyRes.json());
        }
      }

      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      toast.error(msg);
      setStatus("error");
    }
  }

  const isLoading =
    status === "uploading" || status === "analyzing" || status === "extracting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--line))] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-[hsl(var(--muted-ink))]">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-[hsl(var(--bg))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {status === "done" ? (
            <DoneView
              uploadResult={uploadResult!}
              anomalyResult={anomalyResult}
              extractResult={extractResult}
              docType={detectedDocType ?? "other"}
              onClose={onDone ?? onClose}
              onUploadAnother={() => {
                setFile(null);
                setUploadResult(null);
                setAnomalyResult(null);
                setExtractResult(null);
                setDetectedDocType(null);
                setStatus("idle");
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  isDragging.current = true;
                }}
                onDragLeave={() => {
                  isDragging.current = false;
                }}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-[hsl(var(--line))] p-8 text-center transition hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--bg))]"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={isLoading}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-[hsl(var(--muted-ink))]">
                      {(file.size / 1024).toFixed(1)} KB — click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[hsl(var(--muted-ink))]">
                    <Upload className="h-8 w-8" />
                    <p className="text-sm font-medium">
                      Drop file here or click to browse
                    </p>
                    <p className="text-xs">PDF or image (JPG, PNG)</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {status === "error" && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={!file || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {status === "uploading"
                      ? "Uploading & analyzing…"
                      : status === "extracting"
                        ? "Extracting terms…"
                        : "Checking for anomalies…"}
                  </span>
                ) : (
                  "Upload & Analyze"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function DoneView({
  uploadResult,
  anomalyResult,
  extractResult,
  docType,
  onClose,
  onUploadAnother,
}: {
  uploadResult: UploadResult;
  anomalyResult: AnomalyResult | null;
  extractResult: ExtractResult | null;
  docType: string;
  onClose: () => void;
  onUploadAnother: () => void;
}) {
  const typeLabel =
    docType === "contract"
      ? "Contract"
      : docType === "bill" && uploadResult.bill_subtype === "one_time"
        ? "Invoice"
        : docType === "bill"
          ? "Invoice"
          : "Document";
  const invoiceTypeLabel = uploadResult.bill_record
    ? getInvoiceTypeLabel(uploadResult.bill_record.invoiceType)
    : null;
  const confidenceLabel = formatConfidence(
    uploadResult.bill_record?.classificationConfidence,
  );

  // Determine the right sub-label for the success banner
  const subLabel =
    docType === "bill" && uploadResult.bill_subtype === "one_time"
      ? "Invoice Type: One-time - recurring monitoring is disabled"
      : docType === "bill" && !uploadResult.bill_record
        ? "Indexed - no payment amount found in document"
        : null;
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {/* Success banner */}
      <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="font-medium text-sm">
            {typeLabel} uploaded successfully
          </p>
          <p className="text-xs text-[hsl(var(--muted-ink))] mt-0.5">
            Detected as <span className="font-semibold">{typeLabel}</span> ·{" "}
            {uploadResult.chunks_indexed} chunks indexed
            {uploadResult.service_name ? ` · ${uploadResult.service_name}` : ""}
          </p>
          {invoiceTypeLabel && (
            <p className="text-xs mt-1 text-[hsl(var(--muted-ink))]">
              Invoice Type: <span className="font-semibold">{invoiceTypeLabel}</span>
              {confidenceLabel ? ` - ${confidenceLabel}` : ""}
            </p>
          )}
          {subLabel && (
            <p className="text-xs mt-1 text-[hsl(var(--muted-ink))] italic">
              {subLabel}
            </p>
          )}
        </div>
      </div>

      {/* One-time invoice notice */}
      {docType === "bill" &&
        uploadResult.bill_subtype === "one_time" &&
        uploadResult.bill_record && (
          <div className="rounded-xl border border-[hsl(var(--line))] p-4 space-y-2">
            <p className="text-xs font-medium text-[hsl(var(--muted-ink))] uppercase tracking-wide">
              Purchase Details
            </p>
            <div className="flex justify-between text-sm">
              <span>Amount paid</span>
              <span className="font-semibold">
                ${uploadResult.bill_record.amount.toFixed(2)}
              </span>
            </div>
            {uploadResult.bill_record.dueDate && (
              <div className="flex justify-between text-sm">
                <span>Date</span>
                <span className="font-semibold">
                  {uploadResult.bill_record.dueDate}
                </span>
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-ink))] pt-1">
              This looks like a one-time invoice. It has been saved for your
              records but will not trigger recurring anomaly checks.
            </p>
          </div>
        )}

      {docType === "bill" && uploadResult.bill_record && (
        <div className="rounded-xl border border-[hsl(var(--line))] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-[hsl(var(--muted-ink))] uppercase tracking-wide">
              AI Invoice Type Decision
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                uploadResult.bill_record.invoiceType === "recurring"
                  ? "bg-blue-500/10 text-blue-700"
                  : "bg-gray-500/10 text-gray-700"
              }`}
            >
              {invoiceTypeLabel}
            </span>
          </div>
          <p className="text-sm font-medium">
            {uploadResult.bill_record.classificationReason ??
              "No invoice type explanation was returned."}
          </p>
          {uploadResult.bill_record.classificationEvidence.length > 0 && (
            <ul className="space-y-1">
              {uploadResult.bill_record.classificationEvidence.map(
                (evidence, index) => (
                  <li key={index} className="flex gap-2 text-xs">
                    <span className="text-amber-500 shrink-0">-</span>
                    <span>{evidence}</span>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}

      {/* No billing info found */}
      {docType === "bill" && !uploadResult.bill_record && (
        <div className="rounded-xl border border-dashed border-[hsl(var(--line))] p-4">
          <p className="text-sm font-medium">No payment amount found</p>
          <p className="text-xs text-[hsl(var(--muted-ink))] mt-1">
            The document was indexed and is searchable, but no invoice amount or
            due date could be extracted. This may be an informational document.
          </p>
        </div>
      )}

      {/* Contract extraction results */}
      {extractResult && (
        <div className="rounded-xl border border-[hsl(var(--line))] p-4 space-y-3">
          <p className="text-xs font-medium text-[hsl(var(--muted-ink))] uppercase tracking-wide">
            AI Extraction Results
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-[hsl(var(--muted-ink))]">Category</p>
              <p className="font-semibold">{extractResult.category}</p>
            </div>
            {extractResult.next_due_date && (
              <div>
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  Next Due Date
                </p>
                <p className="font-semibold">{extractResult.next_due_date}</p>
              </div>
            )}
            {extractResult.amount !== null && (
              <div>
                <p className="text-xs text-[hsl(var(--muted-ink))]">Amount</p>
                <p className="font-semibold">${extractResult.amount}</p>
              </div>
            )}
            {extractResult.notice_period && (
              <div>
                <p className="text-xs text-[hsl(var(--muted-ink))]">
                  Notice Period
                </p>
                <p className="font-semibold">{extractResult.notice_period}</p>
              </div>
            )}
          </div>

          {extractResult.penalty_rules.length > 0 && (
            <div>
              <p className="text-xs text-[hsl(var(--muted-ink))] mb-1">
                Penalty Rules
              </p>
              <ul className="space-y-1">
                {extractResult.penalty_rules.map((rule, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extractResult.hidden_rules.length > 0 && (
            <div>
              <p className="text-xs text-[hsl(var(--muted-ink))] mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> Hidden
                Clauses
              </p>
              <ul className="space-y-1">
                {extractResult.hidden_rules.map((rule, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className="text-amber-500 shrink-0">!</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Invoice summary */}
      {uploadResult.bill_record && (
        <div className="rounded-xl border border-[hsl(var(--line))] p-4 space-y-2">
          <p className="text-xs font-medium text-[hsl(var(--muted-ink))] uppercase tracking-wide">
            Invoice Summary
          </p>
          <div className="flex justify-between text-sm">
            <span>Amount</span>
            <span className="font-semibold">
              ${uploadResult.bill_record.amount.toFixed(2)}
            </span>
          </div>
          {uploadResult.bill_record.dueDate && (
            <div className="flex justify-between text-sm">
              <span>Due date</span>
              <span className="font-semibold">
                {uploadResult.bill_record.dueDate}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Invoice date</span>
            <span className="font-semibold">
              {uploadResult.bill_record.billDate}
            </span>
          </div>
        </div>
      )}

      {/* Anomaly result */}
      {anomalyResult && (
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            anomalyResult.is_anomaly
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {anomalyResult.is_anomaly ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <p className="text-sm font-medium">
              {anomalyResult.is_anomaly
                ? "Anomaly detected"
                : "Bill looks normal"}
            </p>
            {anomalyResult.change_percent !== null && (
              <span
                className={`ml-auto text-xs font-semibold ${
                  anomalyResult.is_anomaly
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
              >
                {anomalyResult.change_percent > 0 ? "+" : ""}
                {anomalyResult.change_percent.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-[hsl(var(--muted-ink))]">
            {anomalyResult.cause_summary}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" onClick={onUploadAnother}>
          Upload Another
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
