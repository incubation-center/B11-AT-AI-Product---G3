import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  appendBillRecord,
  generateStrictJson,
  indexDocument,
  type InvoiceType,
  extractTextFromFileWithLayout,
  parseLikelyDate,
  parseLooseMoney,
  readBillRecords,
} from "@/lib/ai/rag-core";
import { getPlanForUser } from "@/lib/user-plan";
import { canAddBill } from "@/lib/plans";
import { db } from "@/db/drizzle";
import { contractsTable } from "@/db/schema/tableSchema";
import { and, eq } from "drizzle-orm";

async function removeDocument({ docId, userId }: { docId: string; userId: string }) {
  await db.delete(contractsTable).where(
    and(eq(contractsTable.id, docId), eq(contractsTable.userId, userId)),
  );
}

type DocClassification = {
  doc_type: "contract" | "bill" | "other";
  service_name: string | null;
  category: string | null;
};

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
        service_name: parsed.service_name || null,
        category: parsed.category || null,
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

  // Try to extract service/company name from the text using common patterns
  let serviceName: string | null = null;
  const patterns = [
    // "From: Microsoft" or "Provider: Microsoft"
    /(?:from|provider|vendor|company|billed by|bill from|invoice from)[\s:]+([A-Z][A-Za-z0-9 &.,'-]{2,40})/i,
    // Company name at start of line followed by "Corporation", "Inc", "Ltd" etc.
    /^([A-Z][A-Za-z0-9 &'-]{2,40})\s+(?:Corporation|Inc\.?|Ltd\.?|LLC|Co\.)/m,
    // Large company names that commonly appear at top of invoices
    /\b(Microsoft|Google|Amazon|Apple|Adobe|Netflix|Spotify|Dropbox|Slack|Zoom|GitHub|Atlassian|Salesforce|HubSpot|Shopify|Stripe|Twilio|AWS|Azure)\b/i,
    // "From" address block at top
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

type BillExtraction = {
  amount: string | null;
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

export const dynamic = "force-dynamic";

async function resolveUserId(
  formUserId: FormDataEntryValue | null,
): Promise<string | null> {
  if (formUserId) return String(formUserId);

  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;

  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required (multipart/form-data)" },
        { status: 400 },
      );
    }

    const userId = await resolveUserId(form.get("user_id"));
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "user_id is required (form field, x-user-id header, or authenticated session)",
        },
        { status: 401 },
      );
    }

    const overrideDocType = form.get("doc_type");
    const overrideServiceName = form.get("service_name");
    const overrideCategoryHint = form.get("category_hint");
    const hasManualOverrides = overrideDocType && overrideServiceName;

    const extractedText = await extractTextFromFileWithLayout(
      file,
      !hasManualOverrides,
    );

    let docType: "contract" | "bill" | "other";
    let serviceName: string | null;
    let categoryHint: string | null;

    if (hasManualOverrides) {
      docType = (
        ["contract", "bill", "other"].includes(
          String(overrideDocType).toLowerCase(),
        )
          ? String(overrideDocType).toLowerCase()
          : "contract"
      ) as "contract" | "bill" | "other";
      serviceName = String(overrideServiceName);
      categoryHint = overrideCategoryHint ? String(overrideCategoryHint) : null;
    } else {
      const classification = parseClassification(extractedText);
      docType = classification.doc_type;
      serviceName = classification.service_name;
      categoryHint = classification.category;
    }

    // Only store contracts and bills — skip unrecognized documents
    if (docType === "other") {
      return NextResponse.json({
        status: "skipped",
        reason: "not_invoice_or_contract",
        message: "This document does not appear to be an invoice, bill, or contract. Nothing was saved.",
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

    const [userPlan, allBills] = await Promise.all([
      getPlanForUser(userId),
      readBillRecords(),
    ]);
    const userBillCount = allBills.filter((b) => b.userId === userId).length;
    if (!canAddBill(userPlan, userBillCount)) {
      const { PLANS } = await import("@/lib/plans");
      const max = PLANS[userPlan].maxBills;
      return NextResponse.json(
        {
          error: "plan_limit_reached",
          detail: `Your ${userPlan} plan allows up to ${max} bills. Upgrade to add more.`,
          current: userBillCount,
          max,
          plan: userPlan,
        },
        { status: 402 },
      );
    }

    let billRecord = null;
    if (docType === "bill" && serviceName) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const billData = await generateStrictJson<BillExtraction>(
          [
            "Extract billing details from this invoice or bill.",
            "Return JSON with these keys:",
            "amount: total amount due including taxes as a numeric string (e.g. '26.43'),",
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
          ].join(" "),
          extractedText.slice(0, 14000),
        );

        const amount = billData.amount
          ? parseLooseMoney(billData.amount)
          : null;
        const dueDate = billData.due_date
          ? parseLikelyDate(billData.due_date)
          : null;
        const billDate = billData.bill_date
          ? (parseLikelyDate(billData.bill_date) ??
            new Date().toISOString().slice(0, 10))
          : new Date().toISOString().slice(0, 10);
        const usage =
          typeof billData.usage === "number" ? billData.usage : null;
        const invoiceDecision = resolveInvoiceDecision(
          billData,
          extractedText,
          categoryHint,
        );
        const isRecurring = invoiceDecision.invoiceType === "recurring";

        if (amount !== null) {
          billRecord = {
            id: crypto.randomUUID(),
            userId,
            serviceName,
            billDate,
            dueDate,
            amount,
            usage,
            isRecurring,
            invoiceType: invoiceDecision.invoiceType,
            recurrenceStatus: "active" as const,
            classificationReason: invoiceDecision.reason,
            classificationEvidence: invoiceDecision.evidence,
            classificationConfidence: invoiceDecision.confidence,
            sourceDocumentId: indexed.document.id,
            createdAt: new Date().toISOString(),
          };
          await appendBillRecord(billRecord);
        } else {
          // No amount found — remove the indexed document so it doesn't show in documents list
          await removeDocument({ docId: indexed.document.id, userId });
          return NextResponse.json({
            status: "skipped",
            reason: "no_payment_amount",
            message: "No invoice amount was found. This does not appear to be a valid invoice.",
          });
        }
      } catch {
        billRecord = null;
      }
    }

    return NextResponse.json({
      status: "indexed",
      document_id: indexed.document.id,
      user_id: indexed.document.userId,
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "ingest_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
