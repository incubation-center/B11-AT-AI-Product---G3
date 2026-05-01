import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KHPAY_API = "https://khpay.site/api/v1";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const { transactionId } = await params;
  await fetch(`${KHPAY_API}/qr/expire/${transactionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KHPAY_API_KEY}` },
    cache: "no-store",
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
