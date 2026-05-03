import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PLAN_AMOUNTS: Record<string, string> = {
  basic: "0.01",
  pro: "0.01",
};

const paywayLinkUrl =
  process.env.PAYWAY_LINK_URL || "https://link.payway.com.kh/ABAPAYEN439047W";
const paywayApiUrl =
  "https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/list-payment-options";

const extractPaywayState = (html: string) => {
  const abaDataMatch = html.match(/p\.aba_data="([^"]+)"/);
  const requestTimeMatch = html.match(/request_time:"(\d+)"/);

  if (!abaDataMatch?.[1] || !requestTimeMatch?.[1]) {
    throw new Error("Unable to read PayWay payment link data.");
  }

  return {
    abaData: JSON.parse(`"${abaDataMatch[1]}"`) as string,
    requestTime: requestTimeMatch[1],
  };
};

export const POST = async (request: Request) => {
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

    const amount = PLAN_AMOUNTS[plan];

    const linkResponse = await fetch(paywayLinkUrl, { cache: "no-store" });
    if (!linkResponse.ok) {
      throw new Error("Unable to load PayWay payment link.");
    }

    const { abaData, requestTime } = extractPaywayState(await linkResponse.text());
    const additionalFields = JSON.stringify({ amount });
    const hash = createHash("sha512")
      .update(requestTime + abaData + additionalFields)
      .digest("hex");

    const paywayResponse = await fetch(paywayApiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", language: "en" },
      body: JSON.stringify({
        additional_fields: additionalFields,
        request_time: requestTime,
        aba_data: abaData,
        hash,
      }),
      cache: "no-store",
    });

    const paymentData = (await paywayResponse.json()) as Record<string, unknown>;
    console.log("[payway/init] HTTP:", paywayResponse.status, "body:", JSON.stringify(paymentData));

    if (!paywayResponse.ok) {
      return NextResponse.json(paymentData, { status: paywayResponse.status });
    }

    return NextResponse.json({ ...paymentData, request_time: requestTime });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to initialize payment." },
      { status: 500 },
    );
  }
};
