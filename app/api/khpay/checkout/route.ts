import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

const KHPAY_API = "https://khpay.site/api/v1";

const PLAN_AMOUNTS: Record<string, string> = {
  basic: "9.00",
  pro: "0.01",
};

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { plan?: string };
    const plan = body.plan;
    if (!plan || !PLAN_AMOUNTS[plan]) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    const res = await fetch(`${KHPAY_API}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.KHPAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: PLAN_AMOUNTS[plan],
        note: `Duey ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        metadata: { userId: session.user.id, plan },
      }),
      cache: "no-store",
    });

    const data = (await res.json()) as {
      success: boolean;
      data?: {
        transaction_id: string;
        qr_string: string;
        expires_in: number;
      };
    };

    if (!data.success || !data.data) {
      return NextResponse.json({ error: "qr_generation_failed", _debug: data }, { status: 500 });
    }

    const qrImageUrl = await QRCode.toDataURL(data.data.qr_string, { width: 280, margin: 2 });

    return NextResponse.json({
      transactionId: data.data.transaction_id,
      qrImageUrl,
      amount: PLAN_AMOUNTS[plan],
      plan,
      expiresIn: data.data.expires_in,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "checkout_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
