import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { setPlanForUser } from "@/lib/user-plan";
import type { Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const paywayStatusUrl =
  "https://pwapp.ababank.com/api/pw-app/v1/payment-link/check-payment-status";

export const POST = async (request: Request) => {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      client_id?: unknown;
      device_id?: unknown;
      request_time?: unknown;
      token?: unknown;
      plan?: unknown;
    };

    const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
    const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
    const requestTime = typeof body.request_time === "string" ? body.request_time.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const plan = typeof body.plan === "string" ? body.plan.trim() : "";

    if (!clientId || !deviceId || !requestTime || !token) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const hash = createHash("sha512")
      .update(clientId + deviceId + requestTime)
      .digest("hex");

    console.log("[payway/status] sending → clientId:", clientId, "| deviceId:", deviceId, "| requestTime:", requestTime, "| hash:", hash.slice(0, 20) + "...");

    const paywayResponse = await fetch(paywayStatusUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        language: "en",
        token,
      },
      body: JSON.stringify({ device_id: deviceId, request_time: requestTime, client_id: clientId, hash }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const responseText = await paywayResponse.text();
    const statusData = responseText ? (JSON.parse(responseText) as Record<string, unknown> & { action?: string; data?: { action?: string } }) : {};

    if (!paywayResponse.ok) {
      return NextResponse.json({ confirmed: false }, { status: 200 });
    }

    const action = ((statusData.data?.action ?? statusData.action ?? "") as string).trim().toLowerCase();
    const isApproved = action === "approved";

    if (!isApproved) {
      return NextResponse.json({ confirmed: false }, { status: 200 });
    }

    if (plan) {
      await setPlanForUser(session.user.id, plan as Plan);
    }

    return NextResponse.json({ confirmed: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json({ confirmed: false }, { status: 200 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to check payment status." },
      { status: 500 },
    );
  }
};
