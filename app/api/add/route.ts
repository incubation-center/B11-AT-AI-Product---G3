import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  appendBillRecord,
  parseLikelyDate,
  type InvoiceType,
} from "@/lib/ai/rag-core";

type AddBody = {
  user_id?: string;
  service_name?: string;
  amount?: number;
  due_date?: string | null;
  bill_date?: string;
  usage?: number | null;
  invoice_type?: InvoiceType;
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

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Number(value.toFixed(2));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Number(parsed.toFixed(2));
    }
  }
  return null;
}

function normalizeInvoiceType(value: unknown): InvoiceType {
  return value === "one_time" ? "one_time" : "recurring";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddBody;
    const userId = await resolveUserId(body.user_id);
    const serviceName = body.service_name?.trim();
    const amount = parseAmount(body.amount);

    if (!userId) {
      return NextResponse.json(
        {
          error: "user_id is required (body, x-user-id header, or authenticated session)",
        },
        { status: 401 },
      );
    }

    if (!serviceName) {
      return NextResponse.json(
        { error: "service_name is required" },
        { status: 400 },
      );
    }

    if (amount === null) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 },
      );
    }

    const invoiceType = normalizeInvoiceType(body.invoice_type);
    const billDate =
      parseLikelyDate(body.bill_date ?? "") ?? new Date().toISOString().slice(0, 10);
    const dueDate = body.due_date ? parseLikelyDate(body.due_date) : null;

    const record = {
      id: crypto.randomUUID(),
      userId,
      serviceName,
      billDate,
      dueDate,
      amount,
      usage: typeof body.usage === "number" ? body.usage : null,
      isRecurring: invoiceType === "recurring",
      invoiceType,
      classificationReason: "Manually added via /api/add",
      classificationEvidence: ["manual_entry"],
      classificationConfidence: 1,
      sourceDocumentId: null,
      createdAt: new Date().toISOString(),
    };

    await appendBillRecord(record);

    return NextResponse.json({
      status: "added",
      record,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "add_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
