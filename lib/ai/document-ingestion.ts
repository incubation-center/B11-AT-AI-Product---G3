import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { contractsTable } from "@/db/schema/tableSchema";
import { canAddBill } from "@/lib/plans";
import { getPlanForUser } from "@/lib/user-plan";
import {
  appendBillRecord,
  extractTextFromFileWithLayout,
  generateStrictJson,
  indexDocument,
  parseLikelyDate,
  parseLooseMoney,
  readBillRecords,
  type InvoiceType,
} from "@/lib/ai/rag-core";

type DocClassification = {
  doc_type: "contract" | "bill" | "other";
  service_name: string | null;
  category: string | null;
};

type BillExtraction = {
  amount: string | null;
  currency: "USD" | "KHR" | null;
  due_date: string | null;
  bill_date: string | null;
  usage: number | null;
  invoice_type: InvoiceType | null;
  invoice_type_reason: string | null;
  invoice_type_evidence: string[] | null;
  invoice_type_confidence: number | null;
};

type InvoiceDecision = {
  invoiceType: InvoiceType;
  reason: string;
  evidence: string[];
  confidence: number | null;
};

type ResolvedClassification = {
  docType: "contract" | "bill" | "other";
  serviceName: string | null;
  categoryHint: string | null;
};

export type IngestDocumentResult = {
  status: "indexed" | "skipped";
  reason?: "not_invoice_or_contract" | "no_payment_amount";
  message?: string;
  document_id?: string;
  service_name?: string | null;
  category?: string | null;
  doc_type?: "contract" | "bill" | "other";
  chunks_indexed?: number;
  text_length?: number;
  bill_record?: BillRecordPayload | null;
  bill_subtype?: "subscription" | "one_time" | null;
};

type BillRecordPayload = {
  id: string;
  userId: string;
  serviceName: string;
  billDate: string;
  dueDate: string | null;
  amount: number;
  currency: "USD" | "KHR";
  usage: number | null;
  isRecurring: boolean;
  invoiceType: InvoiceType;
  recurrenceStatus: "active";
  classificationReason: string | null;
  classificationEvidence: string[];
  classificationConfidence: number | null;
  sourceDocumentId: string;
  createdAt: string;
};

const NULLISH_AI_VALUES = new Set(["null", "unknown", "undefined", "n/a", "none"]);

const RECURRING_HINT_CATEGORIES = new Set([
  "rental",
  "saas",
  "utility",
  "insurance",
  "telecom",
]);

const RECURRING_SIGNAL_RULES = [
  {
    pattern:
      /\b(subscription|membership|plan|license|seat|tenant|premium)\b/i,
    evidence: "Subscription or service-plan wording found",
  },
  {
    pattern:
      /\b(monthly|yearly|annual|annually|every month|per month|per year)\b/i,
    evidence: "Repeating billing frequency found",
  },
  {
    pattern: /\b(service period|billing period|renewal|renews|auto-renew)\b/i,
    evidence: "Billing cycle or renewal language found",
  },
  {
    pattern:
      /\b(rent|rental|utility|internet|insurance|broadband|cloud service)\b/i,
    evidence: "Service category usually billed on a schedule",
  },
];

const ONE_TIME_SIGNAL_RULES = [
  {
    pattern: /\b(receipt|order number|purchase order|payment received)\b/i,
    evidence: "Receipt or completed purchase wording found",
  },
  {
    pattern: /\b(one-time|one time|single purchase|paid in full)\b/i,
    evidence: "Document explicitly describes a one-time charge",
  },
  {
    pattern:
      /\b(repair|consultation|hardware|device|item shipped|service completed)\b/i,
    evidence: "Single-delivery goods or service wording found",
  },
];

const BILL_EXTRACTION_PROMPT = [
  "Extract billing details from this invoice or bill.",
  "Return JSON with these keys:",
  "amount: total amount due as a numeric string (e.g. '26.43'). Return the raw number without currency symbols.",
  "currency: the currency of the amount - must be exactly 'USD' or 'KHR'.",
  "If the document shows a USD ($) amount use 'USD'. If the document shows KHR, Riel, or KHR amounts use 'KHR'.",
  "If both USD and KHR appear, prefer 'USD' and return the USD amount.",
  "Default to 'USD' if the currency is unclear.",
  "due_date: payment due date (YYYY-MM-DD or MM/DD/YYYY format, or null),",
  "bill_date: the invoice date or billing date (YYYY-MM-DD or MM/DD/YYYY format, or null),",
  "usage: numeric usage quantity (e.g. kWh, GB, licenses count) or null if not present,",
  "invoice_type: must be either 'recurring' or 'one_time'.",
  "Choose 'recurring' only when the document contains evidence of an ongoing billing cycle such as subscription, monthly or annual fees, service period, rental, insurance premium, utility billing, or renewal language.",
  "Choose 'one_time' for repairs, purchases, shopping receipts, orders, or invoices without clear evidence of repeat billing.",
  "If recurring evidence is absent, choose 'one_time'.",
  "invoice_type_reason: one short sentence explaining why the invoice was classified that way.",
  "invoice_type_evidence: an array of up to 3 short phrases from the document that support the classification.",
  "invoice_type_confidence: a number from 0 to 1.",
  "Return null for any field not found in the document.",
].join(" ");

async function removeDocument({ docId, userId }: { docId: string; userId: string }) {
  await db.delete(contractsTable).where(
    and(eq(contractsTable.id, docId), eq(contractsTable.userId, userId)),
  );
}

function normalizeAiText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || NULLISH_AI_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function parseClassification(text: string): DocClassification {
  const jsonMatch = text.match(
    /---CLASSIFICATION---\s*(\{[\s\S]*?\})\s*---END---/,
  );
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as DocClassification;
      return {
        doc_type: ["contract", "bill", "other"].includes(parsed.doc_type)
          ? parsed.doc_type
          : "other",
        service_name: normalizeAiText(parsed.service_name),
        category: normalizeAiText(parsed.category),
      };
    } catch {
      /* fall through */
    }
  }

  const lower = text.toLowerCase();
  const isBill =
    /invoice|receipt|bill|statement|amount\s*due|total\s*due|grand\s*total/i.test(
      lower,
    );

  let serviceName: string | null = null;
  const patterns = [
    /(?:from|provider|vendor|company|billed by|bill from|invoice from)[\s:]+([A-Z][A-Za-z0-9 &.,'-]{2,40})/i,
    /^([A-Z][A-Za-z0-9 &'-]{2,40})\s+(?:Corporation|Inc\.?|Ltd\.?|LLC|Co\.)/m,
    /\b(Microsoft|Google|Amazon|Apple|Adobe|Netflix|Spotify|Dropbox|Slack|Zoom|GitHub|Atlassian|Salesforce|HubSpot|Shopify|Stripe|Twilio|AWS|Azure)\b/i,
    /^([A-Z][A-Za-z0-9 &'-]{2,30})\s*\n/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      serviceName = match[1].trim();
      break;
    }
  }

  return {
    doc_type: isBill ? "bill" : "contract",
    service_name: serviceName,
    category: null,
  };
}

function resolveClassification(params: {
  extractedText: string;
  docType?: string | null;
  serviceName?: string | null;
  categoryHint?: string | null;
}): ResolvedClassification {
  if (params.docType && params.serviceName) {
    const raw = params.docType.toLowerCase();
    return {
      docType: (["contract", "bill", "other"].includes(raw) ? raw : "contract") as ResolvedClassification["docType"],
      serviceName: normalizeAiText(params.serviceName),
      categoryHint: normalizeAiText(params.categoryHint),
    };
  }

  const classification = parseClassification(params.extractedText);
  return {
    docType: classification.doc_type,
    serviceName: classification.service_name,
    categoryHint: classification.category,
  };
}

async function checkPlanLimit(
  userId: string,
): Promise<{ allowed: boolean; error?: object }> {
  const { PLANS } = await import("@/lib/plans");
  const [userPlan, allBills] = await Promise.all([
    getPlanForUser(userId),
    readBillRecords(),
  ]);
  const userBillCount = allBills.filter((b) => b.userId === userId).length;
  if (!canAddBill(userPlan, userBillCount)) {
    const max = PLANS[userPlan].maxBills;
    return {
      allowed: false,
      error: {
        error: "plan_limit_reached",
        detail: `Your ${userPlan} plan allows up to ${max} bills. Upgrade to add more.`,
        current: userBillCount,
        max,
        plan: userPlan,
      },
    };
  }
  return { allowed: true };
}

function normalizeInvoiceType(value: unknown): InvoiceType | null {
  return value === "recurring" || value === "one_time" ? value : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value >= 0 && value <= 1) {
    return Number(value.toFixed(2));
  }
  if (value > 1 && value <= 100) {
    return Number((value / 100).toFixed(2));
  }
  return null;
}

function buildHeuristicInvoiceDecision(
  text: string,
  categoryHint: string | null,
): InvoiceDecision {
  const recurringEvidence = RECURRING_SIGNAL_RULES.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ evidence }) => evidence);
  const oneTimeEvidence = ONE_TIME_SIGNAL_RULES.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ evidence }) => evidence);

  const recurringScore =
    recurringEvidence.length +
    (categoryHint &&
    RECURRING_HINT_CATEGORIES.has(categoryHint.toLowerCase())
      ? 2
      : 0);
  const oneTimeScore = oneTimeEvidence.length;

  if (recurringScore > oneTimeScore) {
    return {
      invoiceType: "recurring",
      reason:
        "Recurring billing language was found, so this invoice is treated as part of an ongoing payment cycle.",
      evidence: recurringEvidence.slice(0, 3),
      confidence: recurringScore >= 3 ? 0.88 : 0.72,
    };
  }

  const fallbackEvidence =
    oneTimeEvidence.length > 0
      ? oneTimeEvidence
      : ["No recurring billing period or renewal language found"];

  return {
    invoiceType: "one_time",
    reason:
      "The invoice is treated as one-time because no clear recurring billing cycle was found in the document.",
    evidence: fallbackEvidence.slice(0, 3),
    confidence: oneTimeEvidence.length > 0 ? 0.83 : 0.64,
  };
}

function resolveInvoiceDecision(
  billData: BillExtraction,
  extractedText: string,
  categoryHint: string | null,
): InvoiceDecision {
  const invoiceType = normalizeInvoiceType(billData.invoice_type);
  const reason =
    typeof billData.invoice_type_reason === "string"
      ? billData.invoice_type_reason.trim()
      : "";
  const evidence = Array.isArray(billData.invoice_type_evidence)
    ? billData.invoice_type_evidence.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const confidence = normalizeConfidence(billData.invoice_type_confidence);

  if (invoiceType && reason) {
    return {
      invoiceType,
      reason,
      evidence:
        evidence.length > 0
          ? evidence.slice(0, 3)
          : buildHeuristicInvoiceDecision(extractedText, categoryHint).evidence,
      confidence,
    };
  }

  return buildHeuristicInvoiceDecision(extractedText, categoryHint);
}

async function extractBillDetails(
  extractedText: string,
  categoryHint: string | null,
): Promise<{ billData: BillExtraction; invoiceDecision: InvoiceDecision; amount: number | null }> {
  await new Promise((r) => setTimeout(r, 1000));
  const billData = await generateStrictJson<BillExtraction>(
    BILL_EXTRACTION_PROMPT,
    extractedText.slice(0, 14000),
  );
  const amount = billData.amount ? parseLooseMoney(billData.amount) : null;
  const invoiceDecision = resolveInvoiceDecision(billData, extractedText, categoryHint);
  return { billData, invoiceDecision, amount };
}

function buildBillRecord(params: {
  userId: string;
  serviceName: string;
  documentId: string;
  billData: BillExtraction;
  invoiceDecision: InvoiceDecision;
  amount: number;
}): BillRecordPayload {
  const { userId, serviceName, documentId, billData, invoiceDecision, amount } = params;
  const dueDate = billData.due_date ? parseLikelyDate(billData.due_date) : null;
  const billDate =
    (billData.bill_date ? parseLikelyDate(billData.bill_date) : null) ??
    new Date().toISOString().slice(0, 10);

  return {
    id: crypto.randomUUID(),
    userId,
    serviceName,
    billDate,
    dueDate,
    amount,
    currency: billData.currency === "KHR" ? "KHR" : "USD",
    usage: typeof billData.usage === "number" ? billData.usage : null,
    isRecurring: invoiceDecision.invoiceType === "recurring",
    invoiceType: invoiceDecision.invoiceType,
    recurrenceStatus: "active",
    classificationReason: invoiceDecision.reason,
    classificationEvidence: invoiceDecision.evidence,
    classificationConfidence: invoiceDecision.confidence,
    sourceDocumentId: documentId,
    createdAt: new Date().toISOString(),
  };
}

export async function ingestDocumentForUser(params: {
  userId: string;
  file: File;
  docType?: string | null;
  serviceName?: string | null;
  categoryHint?: string | null;
}): Promise<IngestDocumentResult> {
  const { userId, file } = params;
  const hasManualOverrides = Boolean(params.docType && params.serviceName);
  const extractedText = await extractTextFromFileWithLayout(file, !hasManualOverrides);
  const { docType, serviceName, categoryHint } = resolveClassification({
    extractedText,
    docType: params.docType,
    serviceName: params.serviceName,
    categoryHint: params.categoryHint,
  });

  if (docType === "other") {
    return {
      status: "skipped",
      reason: "not_invoice_or_contract",
      message: "This document does not appear to be an invoice, bill, or contract. Nothing was saved.",
    };
  }

  const planCheck = await checkPlanLimit(userId);
  if (!planCheck.allowed) {
    throw Object.assign(new Error("plan_limit_reached"), {
      status: 402,
      payload: planCheck.error,
    });
  }

  const indexed = await indexDocument({
    userId,
    serviceName,
    categoryHint,
    docType,
    originalFilename: file.name,
    mimeType: file.type,
    extractedText,
  });

  let billRecord: BillRecordPayload | null = null;
  if (docType === "bill" && serviceName) {
    try {
      const { billData, invoiceDecision, amount } = await extractBillDetails(
        extractedText,
        categoryHint,
      );

      if (amount !== null) {
        billRecord = buildBillRecord({
          userId,
          serviceName,
          documentId: indexed.document.id,
          billData,
          invoiceDecision,
          amount,
        });
        await appendBillRecord(billRecord);
      } else {
        await removeDocument({ docId: indexed.document.id, userId });
        return {
          status: "skipped",
          reason: "no_payment_amount",
          message: "No invoice amount was found. This does not appear to be a valid invoice.",
        };
      }
    } catch {
      billRecord = null;
    }
  }

  return {
    status: "indexed",
    document_id: indexed.document.id,
    service_name: indexed.document.serviceName,
    category: categoryHint,
    doc_type: indexed.document.docType,
    chunks_indexed: indexed.chunkCount,
    text_length: indexed.document.textLength,
    bill_record: billRecord,
    bill_subtype: billRecord
      ? billRecord.invoiceType === "recurring"
        ? "subscription"
        : "one_time"
      : null,
  };
}
