import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  appendCheaperFeedback,
  type FeedbackReason,
  type FeedbackVote,
  makeOpportunityKey,
} from "@/lib/cheaper-feedback";

export const dynamic = "force-dynamic";

type FeedbackBody = {
  opportunity_key?: string;
  service_name?: string;
  alternative_provider?: string;
  alternative_plan?: string;
  vote?: FeedbackVote;
  reason?: FeedbackReason;
  note?: string;
};

async function resolveUserId(bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackBody & { user_id?: string };
    const userId = await resolveUserId(body.user_id);

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (
      !body.service_name ||
      !body.alternative_provider ||
      !body.alternative_plan ||
      (body.vote !== "up" && body.vote !== "down")
    ) {
      return NextResponse.json({ error: "invalid_feedback_payload" }, { status: 400 });
    }

    const key =
      body.opportunity_key ??
      makeOpportunityKey(
        body.service_name,
        body.alternative_provider,
        body.alternative_plan,
      );

    await appendCheaperFeedback({
      userId,
      opportunityKey: key,
      serviceName: body.service_name,
      alternativeProvider: body.alternative_provider,
      alternativePlan: body.alternative_plan,
      vote: body.vote,
      reason: body.reason ?? null,
      note: body.note ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "feedback_save_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
