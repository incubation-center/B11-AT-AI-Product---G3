import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { BakongKHQR, khqrData, IndividualInfo } from "bakong-khqr";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

const PLAN_AMOUNTS: Record<string, number> = {
  basic: 0.10,
  pro: 0.10,
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

    const accountId = process.env.BAKONG_ACCOUNT_ID!;
    const merchantName = process.env.BAKONG_MERCHANT_NAME ?? "Duey";
    const amount = PLAN_AMOUNTS[plan];

    const info = new IndividualInfo(accountId, merchantName, "Phnom Penh");
    info.currency = khqrData.currency.usd;
    info.amount = amount;
    info.expirationTimestamp = String(Date.now() + 15 * 60 * 1000);

    const generator = new BakongKHQR();
    const result = generator.generateIndividual(info);

    if (result.status.code !== 0 || !result.data) {
      return NextResponse.json(
        { error: "qr_generation_failed", detail: result.status.message },
        { status: 500 },
      );
    }

    const qrImageUrl = await QRCode.toDataURL(result.data.qr, { width: 280, margin: 2 });

    return NextResponse.json({
      transactionId: result.data.md5,
      qrImageUrl,
      amount,
      plan,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "checkout_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
