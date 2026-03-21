import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type FeedbackVote = "up" | "down";
export type FeedbackReason =
  | "not_relevant"
  | "missing_features"
  | "savings_too_small"
  | "prefer_current"
  | "other";

type FeedbackRecord = {
  id: string;
  userId: string;
  opportunityKey: string;
  serviceName: string;
  alternativeProvider: string;
  alternativePlan: string;
  vote: FeedbackVote;
  reason: FeedbackReason | null;
  note: string | null;
  createdAt: string;
};

type FeedbackStore = {
  records: FeedbackRecord[];
};

export type FeedbackSummary = {
  upvotes: number;
  downvotes: number;
  userVote: FeedbackVote | null;
  userReason: FeedbackReason | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_PATH = path.join(DATA_DIR, "cheaper-feedback.json");

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

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(FEEDBACK_PATH, "utf8");
  } catch {
    await writeFile(FEEDBACK_PATH, JSON.stringify({ records: [] }, null, 2), "utf8");
  }
}

async function readStore(): Promise<FeedbackStore> {
  await ensureStore();
  const raw = await readFile(FEEDBACK_PATH, "utf8");
  return JSON.parse(raw) as FeedbackStore;
}

async function writeStore(store: FeedbackStore): Promise<void> {
  await writeFile(FEEDBACK_PATH, JSON.stringify(store, null, 2), "utf8");
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
  const store = await readStore();
  store.records.push({
    id: crypto.randomUUID(),
    userId: input.userId,
    opportunityKey: input.opportunityKey,
    serviceName: input.serviceName,
    alternativeProvider: input.alternativeProvider,
    alternativePlan: input.alternativePlan,
    vote: input.vote,
    reason: input.reason ?? null,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  });
  await writeStore(store);
}

export async function getFeedbackSummaryByOpportunity(
  userId: string,
): Promise<Map<string, FeedbackSummary>> {
  const store = await readStore();
  const summary = new Map<string, FeedbackSummary>();

  for (const record of store.records) {
    const current = summary.get(record.opportunityKey) ?? {
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      userReason: null,
    };

    if (record.vote === "up") current.upvotes += 1;
    if (record.vote === "down") current.downvotes += 1;

    if (record.userId === userId) {
      current.userVote = record.vote;
      current.userReason = record.reason;
    }

    summary.set(record.opportunityKey, current);
  }

  return summary;
}
