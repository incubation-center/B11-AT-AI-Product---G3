import { NextResponse } from "next/server";
import { generateStrictJson } from "@/lib/ai/rag-core";

type SwitchPlanBody = {
  service_name?: string;
  current_monthly?: number;
  alternative_provider?: string;
  alternative_plan?: string;
  alternative_monthly?: number;
  estimated_monthly_savings?: number;
  estimated_yearly_savings?: number;
  risk?: "low" | "medium" | "high";
  reason?: string;
};

type SwitchPlanOutput = {
  summary: string;
  checklist: string[];
  cancellation_email_subject: string;
  cancellation_email_body: string;
  negotiation_email_subject: string;
  negotiation_email_body: string;
  watchouts: string[];
};

export const dynamic = "force-dynamic";

function buildFallbackPlan(body: Required<SwitchPlanBody>): SwitchPlanOutput {
  return {
    summary: `Switch from ${body.service_name} to ${body.alternative_provider} (${body.alternative_plan}) to save about $${body.estimated_monthly_savings.toFixed(2)}/month.`,
    checklist: [
      `Review active contract terms for ${body.service_name} and note any cancellation notice requirements.`,
      "Export critical data (billing records, templates, customer lists, automations).",
      `Create and verify your ${body.alternative_provider} account before cancellation.`,
      "Run parallel usage for 7 days to validate feature parity and reliability.",
      `Send cancellation request to ${body.service_name} billing/support and ask for final confirmation.`,
      "Check next invoice cycle to confirm no extra charges post-cancellation.",
    ],
    cancellation_email_subject: `Cancellation request for ${body.service_name} subscription`,
    cancellation_email_body: `Hello Support Team,\n\nPlease cancel my subscription for ${body.service_name} effective at the end of the current billing cycle. Please confirm the effective cancellation date and that no further recurring charges will be applied.\n\nThank you.`,
    negotiation_email_subject: `Request for lower pricing on ${body.service_name} plan`,
    negotiation_email_body: `Hello Support Team,\n\nI am reviewing subscription costs and found alternatives at lower pricing. I am currently paying approximately $${body.current_monthly.toFixed(2)} per month. If you can offer a discounted rate close to $${body.alternative_monthly.toFixed(2)} per month, I would prefer to stay.\n\nPlease share any retention or annual discount options.\n\nThank you.`,
    watchouts: [
      "Check data export limits and retention policies before cancellation.",
      "Confirm whether annual commitments or early termination fees apply.",
      "Update team logins/integrations to avoid workflow interruption.",
    ],
  };
}

function sanitize(body: SwitchPlanBody): Required<SwitchPlanBody> | null {
  if (
    !body.service_name ||
    typeof body.current_monthly !== "number" ||
    !body.alternative_provider ||
    !body.alternative_plan ||
    typeof body.alternative_monthly !== "number" ||
    typeof body.estimated_monthly_savings !== "number" ||
    typeof body.estimated_yearly_savings !== "number" ||
    !body.risk ||
    !body.reason
  ) {
    return null;
  }

  return {
    service_name: body.service_name,
    current_monthly: body.current_monthly,
    alternative_provider: body.alternative_provider,
    alternative_plan: body.alternative_plan,
    alternative_monthly: body.alternative_monthly,
    estimated_monthly_savings: body.estimated_monthly_savings,
    estimated_yearly_savings: body.estimated_yearly_savings,
    risk: body.risk,
    reason: body.reason,
  };
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as SwitchPlanBody;
    const body = sanitize(raw);

    if (!body) {
      return NextResponse.json(
        { error: "invalid_payload_for_switch_plan" },
        { status: 400 },
      );
    }

    const prompt = [
      "You are an operations-focused savings assistant.",
      "Generate a migration/switch plan in strict JSON only.",
      "Keep language practical and concise.",
      "Schema:",
      "{",
      '  "summary":"string (1-2 sentences)",',
      '  "checklist":"string[] with 5-7 concrete steps",',
      '  "cancellation_email_subject":"string",',
      '  "cancellation_email_body":"string (plain text email)",',
      '  "negotiation_email_subject":"string",',
      '  "negotiation_email_body":"string (plain text email asking for discount)",',
      '  "watchouts":"string[] with 3-5 risks/checks"',
      "}",
    ].join(" ");

    const context = [
      `Current service: ${body.service_name}`,
      `Current monthly: $${body.current_monthly.toFixed(2)}`,
      `Alternative: ${body.alternative_provider} (${body.alternative_plan})`,
      `Alternative monthly: $${body.alternative_monthly.toFixed(2)}`,
      `Estimated savings: $${body.estimated_monthly_savings.toFixed(2)}/month, $${body.estimated_yearly_savings.toFixed(2)}/year`,
      `Risk: ${body.risk}`,
      `Alternative rationale: ${body.reason}`,
    ].join("\n");

    try {
      const aiPlan = await generateStrictJson<SwitchPlanOutput>(prompt, context);
      return NextResponse.json(aiPlan);
    } catch {
      return NextResponse.json(buildFallbackPlan(body));
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "switch_plan_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
