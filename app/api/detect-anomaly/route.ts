import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  appendBillRecord,
  generateStrictJson,
  parseLikelyDate,
  readBillRecords,
  semanticSearch,
  type InvoiceType,
} from "@/lib/ai/rag-core";

type DetectBody = {
  user_id: string;
  service_name: string;
  current_amount: number;
  current_usage?: number | null;
  bill_date?: string;
  due_date?: string | null;
  invoice_type?: InvoiceType;
  persist_current?: boolean;
};

type AnomalyOutput = {
  is_anomaly: boolean;
  previous_amount: number | null;
  current_amount: number;
  change_percent: number | null;
  cause_type: "usage_based" | "rate_change" | "unknown";
  cause_summary: string;
  contract_evidence: string[];
};

export const dynamic = "force-dynamic";

async function resolveUserId(bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;

  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;

  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DetectBody>;
    const userId = await resolveUserId(body.user_id);
    const serviceName = body.service_name;
    const currentAmount = body.current_amount;

    if (!userId || !serviceName || typeof currentAmount !== "number") {
      return NextResponse.json(
        { error: "user_id, service_name, current_amount are required" },
        { status: 400 },
      );
    }

    const all = await readBillRecords();
    const history = all
      .filter(
        (row) =>
          row.userId === userId &&
          row.serviceName.toLowerCase() === serviceName.toLowerCase() &&
          row.isRecurring,
      )
      .sort((a, b) => a.billDate.localeCompare(b.billDate));

    // Rolling 3-month average as baseline instead of just the previous bill
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentHistory = history.filter(
      (row) => new Date(row.billDate) >= threeMonthsAgo,
    );

    const baseline =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, r) => sum + r.amount, 0) / recentHistory.length
        : history.length > 0
          ? history[history.length - 1].amount
          : null;

    const previous = history.length > 0 ? history[history.length - 1] : null;
    const previousAmount = baseline;
    const delta = previousAmount !== null ? currentAmount - previousAmount : null;
    const changePercent =
      previousAmount !== null && previousAmount > 0
        ? (delta! / previousAmount) * 100
        : null;
    const isAnomaly =
      changePercent !== null ? Math.abs(changePercent) >= 20 : false;

    const usageHint =
      previous?.usage !== null &&
      previous?.usage !== undefined &&
      typeof body.current_usage === "number" &&
      body.current_usage > previous.usage
        ? `Current usage (${body.current_usage}) is higher than previous bill usage (${previous.usage}).`
        : "No clear usage increase signal.";

    const baselineNote =
      recentHistory.length > 1
        ? `Baseline is a ${recentHistory.length}-bill rolling average over the last 3 months ($${previousAmount?.toFixed(2)}).`
        : `Baseline is the single most recent bill ($${previousAmount?.toFixed(2)}).`;

    const contractHits = await semanticSearch({
      query:
        "price adjustment rate change tariff revision overage fee usage tier penalty",
      topK: 5,
      userId,
      serviceName,
      docType: "contract",
    });

    const evidence = contractHits.map((hit) => hit.text);
    const llmResult = await generateStrictJson<AnomalyOutput>(
      [
        "Detect anomaly and classify cause.",
        "Rules:",
        "1) usage_based if amount jump likely explained by usage increase.",
        "2) rate_change if contract evidence suggests pricing/tariff update.",
        "3) otherwise unknown.",
        "Return strict JSON with keys:",
        "is_anomaly, previous_amount, current_amount, change_percent, cause_type, cause_summary, contract_evidence.",
      ].join(" "),
      [
        `baseline_amount: ${previousAmount?.toFixed(2) ?? "null"} (${baselineNote})`,
        `current_amount: ${currentAmount}`,
        `change_percent: ${changePercent?.toFixed(2) ?? "null"}`,
        `is_anomaly_rule_result: ${isAnomaly}`,
        `usage_hint: ${usageHint}`,
        "contract_chunks:",
        ...evidence,
      ].join("\n"),
    );

    if (body.persist_current) {
      const invoiceType = body.invoice_type ?? "recurring";
      await appendBillRecord({
        id: crypto.randomUUID(),
        userId,
        serviceName,
        billDate:
          parseLikelyDate(body.bill_date ?? "") ??
          new Date().toISOString().slice(0, 10),
        dueDate: parseLikelyDate(body.due_date ?? ""),
        amount: currentAmount,
        currency: "USD",
        usage:
          typeof body.current_usage === "number" ? body.current_usage : null,
        isRecurring: invoiceType === "recurring",
        invoiceType,
        recurrenceStatus: "active" as const,
        classificationReason: null,
        classificationEvidence: [],
        classificationConfidence: null,
        sourceDocumentId: null,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(llmResult);
  } catch (error) {
    return NextResponse.json(
      {
        error: "detect_anomaly_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
