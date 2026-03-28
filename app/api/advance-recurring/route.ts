import { NextResponse } from "next/server";
import { advanceRecurringBills } from "@/lib/ai/rag-core";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const advanced = await advanceRecurringBills();
    return NextResponse.json({ status: "ok", advanced });
  } catch (error) {
    return NextResponse.json(
      {
        error: "advance_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
