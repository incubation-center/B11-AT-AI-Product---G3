import { NextResponse } from "next/server";
import { appendExecutionLog } from "@/lib/ai/rag-core";

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

type DispatchAction = {
  skill: "just-fucking-cancel" | "ai-pdf-builder";
  reason: string;
  payload: Record<string, unknown>;
};

export const dynamic = "force-dynamic";

function includesAny(source: string, words: string[]): boolean {
  const s = source.toLowerCase();
  return words.some((word) => s.includes(word));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteBody;
    const actions: DispatchAction[] = [];
    const rawIntent = [body.intent ?? "", body.user_request ?? ""].join(" ");

    const wantsCancel =
      Boolean(body.findings?.wants_termination) ||
      includesAny(rawIntent, ["cancel", "terminate", "end service", "stop subscription"]);

    if (wantsCancel) {
      actions.push({
        skill: "just-fucking-cancel",
        reason: "User intent indicates service termination.",
        payload: {
          user_id: body.user_id ?? "demo-user",
          service_name: body.service_name ?? null,
        },
      });
    }

    const needsLetter =
      Boolean(body.findings?.anomaly) ||
      includesAny(rawIntent, ["dispute", "complaint", "letter", "refund"]);

    if (needsLetter || wantsCancel) {
      actions.push({
        skill: "ai-pdf-builder",
        reason: wantsCancel
          ? "Generate cancellation letter."
          : "Generate billing dispute letter.",
        payload: {
          document_type: wantsCancel ? "cancellation_letter" : "dispute_letter",
          user_id: body.user_id ?? "demo-user",
          service_name: body.service_name ?? null,
          findings: body.findings ?? {},
        },
      });
    }

    const responsePayload = {
      execution_id: crypto.randomUUID(),
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
