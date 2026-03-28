import { NextResponse } from "next/server";
import { appendExecutionLog, generateStrictJson } from "@/lib/ai/rag-core";

type ExecuteBody = {
  user_id?: string;
  service_name?: string;
  intent?: string;
  user_request?: string;
  findings?: {
    anomaly?: boolean;
    wants_termination?: boolean;
    category?: string;
  };
};

type IntentClassification = {
  intent_type: "cancel" | "dispute" | "negotiate" | "inquiry" | "none";
  urgency: "immediate" | "considering" | "hypothetical";
  confidence: number;
  reason: string;
};

type DispatchAction = {
  skill: "cancel_subscription" | "ai-pdf-builder";
  reason: string;
  payload: Record<string, unknown>;
};

export const dynamic = "force-dynamic";

async function classifyIntent(
  rawText: string,
  findings: ExecuteBody["findings"],
): Promise<IntentClassification> {
  const fallback: IntentClassification = {
    intent_type: findings?.wants_termination ? "cancel" : "none",
    urgency: "considering",
    confidence: 0.5,
    reason: "Fallback classification used.",
  };

  if (!rawText.trim() && !findings?.wants_termination && !findings?.anomaly) {
    return fallback;
  }

  try {
    const result = await generateStrictJson<IntentClassification>(
      [
        "Classify the user's intent from their message and findings context.",
        "intent_type: one of cancel | dispute | negotiate | inquiry | none.",
        "  cancel = user wants to stop or terminate a service.",
        "  dispute = user wants to challenge a charge or get a refund.",
        "  negotiate = user wants a lower price or discount.",
        "  inquiry = user is asking a question, not acting.",
        "  none = no actionable intent detected.",
        "urgency: immediate (act now) | considering (thinking about it) | hypothetical (if/maybe).",
        "confidence: 0.0 to 1.0.",
        "reason: one sentence explaining the classification.",
        "Return strict JSON only.",
      ].join(" "),
      [
        `user_message: ${rawText || "(none)"}`,
        `anomaly_detected: ${findings?.anomaly ?? false}`,
        `wants_termination_flag: ${findings?.wants_termination ?? false}`,
        `category: ${findings?.category ?? "unknown"}`,
      ].join("\n"),
    );
    return result;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteBody;
    const rawIntent = [body.intent ?? "", body.user_request ?? ""].join(" ").trim();
    const findings = body.findings ?? {};

    const classification = await classifyIntent(rawIntent, findings);

    const actions: DispatchAction[] = [];

    const wantsCancel =
      classification.intent_type === "cancel" &&
      (classification.urgency === "immediate" || classification.confidence >= 0.7);

    const wantsDispute =
      classification.intent_type === "dispute" ||
      Boolean(findings.anomaly);

    const wantsNegotiate = classification.intent_type === "negotiate";

    if (wantsCancel) {
      actions.push({
        skill: "cancel_subscription",
        reason: `Cancel intent detected (confidence: ${Math.round(classification.confidence * 100)}%). ${classification.reason}`,
        payload: {
          user_id: body.user_id ?? "demo-user",
          service_name: body.service_name ?? null,
          urgency: classification.urgency,
        },
      });
    }

    if (wantsCancel || wantsDispute || wantsNegotiate) {
      const documentType = wantsCancel
        ? "cancellation_letter"
        : wantsNegotiate
          ? "negotiation_letter"
          : "dispute_letter";

      actions.push({
        skill: "ai-pdf-builder",
        reason: `Generate ${documentType.replace("_", " ")} based on detected intent.`,
        payload: {
          document_type: documentType,
          user_id: body.user_id ?? "demo-user",
          service_name: body.service_name ?? null,
          findings,
          intent_classification: classification,
        },
      });
    }

    const responsePayload = {
      execution_id: crypto.randomUUID(),
      intent_classification: classification,
      actions,
      status: actions.length > 0 ? "queued" : "no_action",
    };

    await appendExecutionLog(responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      {
        error: "execute_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
