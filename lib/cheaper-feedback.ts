import { db } from "@/db/drizzle";
import { cheaperFeedbackTable } from "@/db/schema/tableSchema";

export type FeedbackVote = "up" | "down";
export type FeedbackReason =
  | "not_relevant"
  | "missing_features"
  | "savings_too_small"
  | "prefer_current"
  | "other";

export type FeedbackSummary = {
  upvotes: number;
  downvotes: number;
  userVote: FeedbackVote | null;
  userReason: FeedbackReason | null;
};

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function makeOpportunityKey(
  serviceName: string,
  alternativeProvider: string,
  alternativePlan: string,
): string {
  return [
    normalizeKeyPart(serviceName),
    normalizeKeyPart(alternativeProvider),
    normalizeKeyPart(alternativePlan),
  ].join("::");
}

export async function appendCheaperFeedback(input: {
  userId: string;
  opportunityKey: string;
  serviceName: string;
  alternativeProvider: string;
  alternativePlan: string;
  vote: FeedbackVote;
  reason?: FeedbackReason | null;
  note?: string | null;
}): Promise<void> {
  await db.insert(cheaperFeedbackTable).values({
    userId: input.userId,
    opportunityKey: input.opportunityKey,
    serviceName: input.serviceName,
    alternativeProvider: input.alternativeProvider,
    alternativePlan: input.alternativePlan,
    vote: input.vote,
    reason: input.reason ?? null,
    note: input.note ?? null,
  });
}

export async function getFeedbackSummaryByOpportunity(
  userId: string,
): Promise<Map<string, FeedbackSummary>> {
  const rows = await db
    .select()
    .from(cheaperFeedbackTable);

  const summary = new Map<string, FeedbackSummary>();

  for (const record of rows) {
    const current = summary.get(record.opportunityKey) ?? {
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      userReason: null,
    };

    if (record.vote === "up") current.upvotes += 1;
    if (record.vote === "down") current.downvotes += 1;

    if (record.userId === userId) {
      current.userVote = record.vote as FeedbackVote;
      current.userReason = (record.reason as FeedbackReason) ?? null;
    }

    summary.set(record.opportunityKey, current);
  }

  return summary;
}
