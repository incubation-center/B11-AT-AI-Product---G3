import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateStrictJson } from "@/lib/ai/rag-core";

export const dynamic = "force-dynamic";

type AiAlternative = {
  provider: string;
  plan: string;
  monthly_price: number;
  risk: "low" | "medium" | "high";
  reason: string;
  switching_cost: string;
};

type AiAlternativesResult = {
  service_name: string;
  current_monthly: number;
  alternatives: AiAlternative[];
  generated_at: string;
};

async function generateAlternatives(
  serviceName: string,
  currentMonthly: number,
): Promise<AiAlternative[]> {
  const result = await generateStrictJson<{ alternatives: AiAlternative[] }>(
    [
      "You are a cost-saving assistant. Given a subscription service and its monthly price,",
      "suggest up to 3 real cheaper alternatives the user could switch to.",
      "Each alternative must be a real, currently available service.",
      "Only suggest alternatives that are genuinely cheaper than the current price.",
      "Return strict JSON: { alternatives: [ { provider, plan, monthly_price, risk, reason, switching_cost } ] }",
      "risk: low (easy switch, similar features) | medium (some migration needed) | high (significant workflow change).",
      "switching_cost: one short sentence about what the user needs to do to switch.",
      "reason: one sentence on why this is a good cheaper alternative.",
      "monthly_price: number in USD.",
      "If no cheaper alternatives exist, return an empty alternatives array.",
    ].join(" "),
    [
      `current_service: ${serviceName}`,
      `current_monthly_price_usd: ${currentMonthly.toFixed(2)}`,
    ].join("\n"),
  );

  return Array.isArray(result.alternatives) ? result.alternatives : [];
}

export async function POST(request: Request) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    service_name?: string;
    current_monthly?: number;
    force_refresh?: boolean;
  };

  const serviceName = body.service_name?.trim();
  const currentMonthly = body.current_monthly;

  if (!serviceName || typeof currentMonthly !== "number" || currentMonthly <= 0) {
    return NextResponse.json(
      { error: "service_name and current_monthly (positive number) are required" },
      { status: 400 },
    );
  }

  try {
    const alternatives = await generateAlternatives(serviceName, currentMonthly);

    const result: AiAlternativesResult = {
      service_name: serviceName,
      current_monthly: currentMonthly,
      alternatives,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ ...result, from_cache: false });
  } catch (error) {
    return NextResponse.json(
      {
        error: "ai_alternatives_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
