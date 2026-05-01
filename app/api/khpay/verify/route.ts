import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { setPlanForUser } from "@/lib/user-plan";
import type { Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const KHPAY_API = "https://khpay.site/api/v1";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { transactionId?: string; plan?: string };
    if (!body.transactionId || !body.plan) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const res = await fetch(`${KHPAY_API}/qr/check/${body.transactionId}`, {
      headers: { Authorization: `Bearer ${process.env.KHPAY_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const data = (await res.json()) as {
      success: boolean;
      data?: { paid: boolean; status: string };
    };

    if (!data.success || !data.data?.paid) {
      return NextResponse.json({ confirmed: false });
    }

    await setPlanForUser(session.user.id, body.plan as Plan);
    return NextResponse.json({ confirmed: true });
  } catch (error) {
    return NextResponse.json(
      { error: "verify_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
