import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readBillRecords, updateBillRecord } from "@/lib/ai/rag-core";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    const userId = session?.user?.id;
    const body = (await request.json()) as { bill_id?: string };

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!body.bill_id) {
      return NextResponse.json({ error: "bill_id is required" }, { status: 400 });
    }

    const records = await readBillRecords();
    const bill = records.find((r) => r.id === body.bill_id);

    if (!bill) {
      return NextResponse.json({ error: "bill_not_found" }, { status: 404 });
    }

    if (bill.userId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const updated = await updateBillRecord(body.bill_id, { recurrenceStatus: "stopped" });
    return NextResponse.json({ status: "stopped", record: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "stop_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
