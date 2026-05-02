import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { setPlanForUser } from "@/lib/user-plan";
import type { Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const BAKONG_API = "https://api-bakong.nbc.gov.kh";

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

    const res = await fetch(`${BAKONG_API}/v1/check_transaction_by_md5`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BAKONG_TOKEN}`,
      },
      body: JSON.stringify({ md5: body.transactionId }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const data = (await res.json()) as {
      responseCode: number;
      responseMessage: string;
      data?: unknown;
    };

    console.log("[bakong/verify] response:", JSON.stringify(data));

    if (data.responseCode !== 0 || !data.data) {
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
