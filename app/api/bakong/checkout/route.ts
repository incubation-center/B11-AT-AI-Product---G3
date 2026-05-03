import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Disabled — using ABA PayWay
export async function POST() {
  return NextResponse.json({ error: "disabled" }, { status: 503 });
}
