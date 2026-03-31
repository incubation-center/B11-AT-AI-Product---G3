import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readBillRecords, readStore, advanceRecurringBills, type BillRecord } from "@/lib/ai/rag-core";
import { getReminderDaysForUser } from "@/lib/reminder-preferences";
import {
  getFeedbackSummaryByOpportunity,
  makeOpportunityKey,
  type FeedbackReason,
  type FeedbackVote,
} from "@/lib/cheaper-feedback";
import { getPlanForUser } from "@/lib/user-plan";
import { PLANS } from "@/lib/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

type DueReminderStatus = "overdue" | "due_today" | "due_soon";

export type DueReminder = {
  billId: string;
  serviceName: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
  reminderDate: string;
  status: DueReminderStatus;
};

type AlternativeRisk = "low" | "medium" | "high";

type ServiceCategory =
  | "video_streaming"
  | "music_streaming"
  | "productivity"
  | "cloud_storage"
  | "design"
  | "password_manager"
  | "vpn"
  | "email_marketing"
  | "accounting"
  | "unknown";

type AlternativeOption = {
  provider: string;
  plan: string;
  billedAmount: number;
  billingCycle: "monthly" | "annual";
  monthlyPrice: number;
  pricingSource: string;
  priceUpdatedAt: string;
  risk: AlternativeRisk;
  reason: string;
};

type ConfidenceBreakdown = {
  priceAdvantage: number;
  dataCoverage: number;
  categoryMatch: number;
  priceFreshness: number;
  feedbackSignal: number;
};

export type CheaperAlternativeOpportunity = {
  opportunityKey: string;
  serviceName: string;
  latestBillDate: string;
  category: ServiceCategory;
  currentEstimatedMonthly: number;
  currentEstimatedYearly: number;
  alternative: AlternativeOption;
  estimatedMonthlySavings: number;
  estimatedYearlySavings: number;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  evidence: string[];
  feedbackSummary: {
    upvotes: number;
    downvotes: number;
    userVote: FeedbackVote | null;
    userReason: FeedbackReason | null;
  };
};

const CATEGORY_HINT_KEYWORDS: Array<{
  category: ServiceCategory;
  keywords: string[];
}> = [
  {
    category: "video_streaming",
    keywords: ["stream", "video", "ott", "entertainment"],
  },
  {
    category: "music_streaming",
    keywords: ["music", "audio"],
  },
  {
    category: "productivity",
    keywords: ["saas", "productivity", "workspace", "office", "collaboration"],
  },
  {
    category: "cloud_storage",
    keywords: ["storage", "backup", "drive", "cloud"],
  },
  {
    category: "design",
    keywords: ["design", "creative", "photo", "graphics"],
  },
  {
    category: "password_manager",
    keywords: ["password", "security", "vault"],
  },
  {
    category: "vpn",
    keywords: ["vpn", "network security", "privacy"],
  },
  {
    category: "email_marketing",
    keywords: ["email marketing", "newsletter", "campaign"],
  },
  {
    category: "accounting",
    keywords: ["accounting", "bookkeeping", "finance software"],
  },
];

const SERVICE_NAME_KEYWORDS: Array<{
  category: ServiceCategory;
  keywords: string[];
}> = [
  {
    category: "video_streaming",
    keywords: [
      "netflix",
      "disney",
      "hulu",
      "hbo",
      "youtube",
      "youtube premium",
      "prime video",
      "max",
      "paramount",
    ],
  },
  {
    category: "music_streaming",
    keywords: ["spotify", "apple music", "youtube music", "amazon music"],
  },
  {
    category: "productivity",
    keywords: [
      "notion",
      "slack",
      "microsoft 365",
      "google workspace",
      "atlassian",
      "monday",
      "asana",
      "airtable",
    ],
  },
  {
    category: "cloud_storage",
    keywords: ["dropbox", "onedrive", "google drive", "icloud", "amazon drive"],
  },
  { category: "design", keywords: ["canva", "adobe", "figma", "sketch"] },
  {
    category: "password_manager",
    keywords: ["1password", "lastpass", "bitwarden", "dashlane", "nordpass"],
  },
  {
    category: "vpn",
    keywords: ["nordvpn", "expressvpn", "surfshark", "protonvpn"],
  },
  {
    category: "email_marketing",
    keywords: ["mailchimp", "convertkit", "brevo", "constant contact"],
  },
  {
    category: "accounting",
    keywords: ["quickbooks", "xero", "freshbooks", "zoho"],
  },
];

const ALTERNATIVE_CATALOG: Record<ServiceCategory, AlternativeOption[]> = {
  video_streaming: [
    {
      provider: "Disney+",
      plan: "Standard with Ads",
      billedAmount: 7.99,
      billingCycle: "monthly",
      monthlyPrice: 7.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason: "Lower monthly price for general entertainment content.",
    },
    {
      provider: "Hulu",
      plan: "With Ads",
      billedAmount: 7.99,
      billingCycle: "monthly",
      monthlyPrice: 7.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason: "Good content overlap at lower base price.",
    },
  ],
  music_streaming: [
    {
      provider: "YouTube Music",
      plan: "Individual",
      billedAmount: 10.99,
      billingCycle: "monthly",
      monthlyPrice: 10.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason:
        "Comparable catalog and playlist support at similar or lower price.",
    },
  ],
  productivity: [
    {
      provider: "Google Workspace",
      plan: "Business Starter",
      billedAmount: 7.2,
      billingCycle: "monthly",
      monthlyPrice: 7.2,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Lower seat cost for email/docs/chat with migration effort.",
    },
    {
      provider: "Zoho Workplace",
      plan: "Standard",
      billedAmount: 3,
      billingCycle: "monthly",
      monthlyPrice: 3,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Cost-efficient productivity suite with broad core features.",
    },
  ],
  cloud_storage: [
    {
      provider: "Google One",
      plan: "200 GB",
      billedAmount: 2.99,
      billingCycle: "monthly",
      monthlyPrice: 2.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason: "Lower storage price for personal or light-team usage.",
    },
    {
      provider: "iCloud+",
      plan: "200 GB",
      billedAmount: 2.99,
      billingCycle: "monthly",
      monthlyPrice: 2.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Lower price if your team is already in Apple ecosystem.",
    },
  ],
  design: [
    {
      provider: "Canva",
      plan: "Pro",
      billedAmount: 14.99,
      billingCycle: "monthly",
      monthlyPrice: 14.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Lower design tooling cost for non-advanced workflows.",
    },
    {
      provider: "Affinity",
      plan: "Perpetual license",
      billedAmount: 4.99,
      billingCycle: "monthly",
      monthlyPrice: 4.99,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "high",
      reason: "Can be cheaper long-term but needs tool/workflow transition.",
    },
  ],
  password_manager: [
    {
      provider: "Bitwarden",
      plan: "Premium",
      billedAmount: 9.96,
      billingCycle: "annual",
      monthlyPrice: 0.83,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason: "Lower subscription cost with strong core password features.",
    },
  ],
  vpn: [
    {
      provider: "Surfshark",
      plan: "Starter (annual avg)",
      billedAmount: 29.88,
      billingCycle: "annual",
      monthlyPrice: 2.49,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "low",
      reason: "Usually lower effective monthly cost on annual commitment.",
    },
  ],
  email_marketing: [
    {
      provider: "Brevo",
      plan: "Starter",
      billedAmount: 9,
      billingCycle: "monthly",
      monthlyPrice: 9,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Lower monthly base for growing email campaigns.",
    },
  ],
  accounting: [
    {
      provider: "FreshBooks",
      plan: "Lite",
      billedAmount: 19,
      billingCycle: "monthly",
      monthlyPrice: 19,
      pricingSource: "Internal catalog baseline",
      priceUpdatedAt: "2026-03-01",
      risk: "medium",
      reason: "Potentially cheaper for solo/freelancer workflows.",
    },
  ],
  unknown: [],
};

const MIN_MONTHLY_SAVINGS = 0.5;
const MIN_CONFIDENCE = 0.45;
const MAX_PRICE_STALENESS_DAYS = 180;

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function calcDaysUntilDue(dueDate: Date, now: Date): number {
  const dueDay = toStartOfDay(dueDate).getTime();
  const nowDay = toStartOfDay(now).getTime();
  return Math.round((dueDay - nowDay) / DAY_MS);
}

function buildDueReminders(
  recurringBills: BillRecord[],
  reminderDays: number[],
  now: Date,
): DueReminder[] {
  const maxWindow = Math.max(...reminderDays, 0);
  const items: DueReminder[] = [];
  const seen = new Set<string>();

  for (const bill of recurringBills) {
    const due = parseDueDate(bill.dueDate);
    if (!due) continue;

    const daysUntilDue = calcDaysUntilDue(due, now);
    if (daysUntilDue > maxWindow) continue;
    if (seen.has(bill.id)) continue;
    seen.add(bill.id);

    const matchingDay = reminderDays.find((d) => daysUntilDue <= d) ?? reminderDays[0];

    const status: DueReminderStatus =
      daysUntilDue < 0
        ? "overdue"
        : daysUntilDue === 0
          ? "due_today"
          : "due_soon";

    items.push({
      billId: bill.id,
      serviceName: bill.serviceName,
      dueDate: bill.dueDate as string,
      amount: bill.amount,
      daysUntilDue,
      reminderDate: new Date(
        due.getTime() - matchingDay * DAY_MS,
      ).toISOString(),
      status,
    });
  }

  return items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

function inferCategory(
  serviceName: string,
  categoryHint: string | null,
): ServiceCategory {
  const name = serviceName.toLowerCase();
  const hint = (categoryHint ?? "").toLowerCase();

  for (const entry of CATEGORY_HINT_KEYWORDS) {
    if (entry.keywords.some((keyword) => hint.includes(keyword))) {
      return entry.category;
    }
  }

  for (const entry of SERVICE_NAME_KEYWORDS) {
    if (entry.keywords.some((keyword) => name.includes(keyword))) {
      return entry.category;
    }
  }

  return "unknown";
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function daysSince(isoDate: string, now: Date): number {
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return 365;
  return Math.max(0, Math.round((now.getTime() - dt.getTime()) / DAY_MS));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function buildCheaperAlternativeOpportunities(
  recurringBills: BillRecord[],
  userDocs: Array<{ serviceName: string | null; categoryHint: string | null }>,
  feedbackSummary: Map<
    string,
    {
      upvotes: number;
      downvotes: number;
      userVote: FeedbackVote | null;
      userReason: FeedbackReason | null;
    }
  >,
): CheaperAlternativeOpportunity[] {
  const billsByService = new Map<string, BillRecord[]>();
  for (const bill of recurringBills) {
    const key = bill.serviceName.toLowerCase();
    if (!billsByService.has(key)) billsByService.set(key, []);
    billsByService.get(key)!.push(bill);
  }

  const hintByService = new Map<string, string | null>();
  for (const doc of userDocs) {
    if (!doc.serviceName) continue;
    const key = doc.serviceName.toLowerCase();
    if (!hintByService.has(key)) {
      hintByService.set(key, doc.categoryHint ?? null);
    }
  }

  const opportunities: CheaperAlternativeOpportunity[] = [];

  const now = new Date();

  for (const [serviceKey, serviceBills] of billsByService) {
    const displayName = serviceBills[0]?.serviceName ?? serviceKey;
    const displayNameNormalized = normalizeName(displayName);
    const sorted = [...serviceBills].sort((a, b) =>
      b.billDate.localeCompare(a.billDate),
    );
    const latestAmount = sorted[0]?.amount ?? 0;
    const averageAmount = avg(serviceBills.map((bill) => bill.amount));
    const currentMonthly = latestAmount > 0 ? latestAmount : averageAmount;
    if (currentMonthly < 3) continue;

    const category = inferCategory(
      displayName,
      hintByService.get(serviceKey) ?? null,
    );
    if (category === "unknown") continue;

    const options = ALTERNATIVE_CATALOG[category];
    if (options.length === 0) continue;

    const cheaperOption = options
      .filter(
        (option) =>
          option.monthlyPrice < currentMonthly &&
          !displayNameNormalized.includes(normalizeName(option.provider)),
      )
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0];

    if (!cheaperOption) continue;

    const monthlySavings = Number(
      (currentMonthly - cheaperOption.monthlyPrice).toFixed(2),
    );
    if (monthlySavings < MIN_MONTHLY_SAVINGS) continue;

    const yearlySavings = Number((monthlySavings * 12).toFixed(2));

    const dataCoverage = clamp01(serviceBills.length / 3);
    const categoryMatch = hintByService.get(serviceKey) ? 1 : 0.75;
    const priceAdvantage = clamp01(
      monthlySavings / Math.max(currentMonthly, 1),
    );
    const freshnessDays = daysSince(cheaperOption.priceUpdatedAt, now);
    const priceFreshness = clamp01(
      1 - freshnessDays / MAX_PRICE_STALENESS_DAYS,
    );

    const opportunityKey = makeOpportunityKey(
      displayName,
      cheaperOption.provider,
      cheaperOption.plan,
    );
    const feedback = feedbackSummary.get(opportunityKey) ?? {
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      userReason: null,
    };

    const totalVotes = feedback.upvotes + feedback.downvotes;
    const netVotes =
      totalVotes > 0 ? (feedback.upvotes - feedback.downvotes) / totalVotes : 0;
    const crowdFeedbackSignal = clamp01((netVotes + 1) / 2);
    const userFeedbackSignal =
      feedback.userVote === "up" ? 1 : feedback.userVote === "down" ? 0 : 0.5;
    const feedbackSignal = clamp01(
      crowdFeedbackSignal * 0.6 + userFeedbackSignal * 0.4,
    );

    const evidence: string[] = [];
    evidence.push(
      `Current estimated monthly cost from recent recurring invoices: ${currentMonthly.toFixed(2)}.`,
    );
    evidence.push(
      `Comparable option in category: ${category.replaceAll("_", " ")}.`,
    );
    evidence.push(
      `Alternative pricing baseline updated on ${cheaperOption.priceUpdatedAt}.`,
    );

    if (serviceBills.length >= 2) {
      evidence.push(
        `Confidence boosted by ${serviceBills.length} recurring invoice records.`,
      );
    }

    if (hintByService.get(serviceKey)) {
      evidence.push("Category hint detected from uploaded document metadata.");
    }

    if (monthlySavings >= currentMonthly * 0.3) {
      evidence.push(
        "High relative savings (>30%) suggests meaningful optimization opportunity.",
      );
    }

    if (totalVotes > 0) {
      evidence.push(
        `Community feedback signal: ${feedback.upvotes} helpful vs ${feedback.downvotes} not useful votes.`,
      );
    }

    let confidence =
      priceAdvantage * 0.32 +
      dataCoverage * 0.22 +
      categoryMatch * 0.16 +
      priceFreshness * 0.16 +
      feedbackSignal * 0.14;

    confidence = Math.max(0.35, Math.min(0.95, Number(confidence.toFixed(2))));
    if (confidence < MIN_CONFIDENCE) continue;

    opportunities.push({
      opportunityKey,
      serviceName: displayName,
      latestBillDate: sorted[0]?.billDate ?? new Date(0).toISOString().slice(0, 10),
      category,
      currentEstimatedMonthly: Number(currentMonthly.toFixed(2)),
      currentEstimatedYearly: Number((currentMonthly * 12).toFixed(2)),
      alternative: cheaperOption,
      estimatedMonthlySavings: monthlySavings,
      estimatedYearlySavings: yearlySavings,
      confidence,
      confidenceBreakdown: {
        priceAdvantage: Number(priceAdvantage.toFixed(2)),
        dataCoverage: Number(dataCoverage.toFixed(2)),
        categoryMatch: Number(categoryMatch.toFixed(2)),
        priceFreshness: Number(priceFreshness.toFixed(2)),
        feedbackSignal: Number(feedbackSignal.toFixed(2)),
      },
      evidence,
      feedbackSummary: feedback,
    });
  }

  return opportunities
    .sort((a, b) => {
      if (b.latestBillDate !== a.latestBillDate) {
        return b.latestBillDate.localeCompare(a.latestBillDate);
      }
      const scoreA = a.confidence * a.estimatedMonthlySavings;
      const scoreB = b.confidence * b.estimatedMonthlySavings;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.estimatedMonthlySavings - a.estimatedMonthlySavings;
    });
}

export async function getWorkspaceData() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  await advanceRecurringBills().catch(() => null);

  const [store, bills] = await Promise.all([
    readStore().catch(() => ({ documents: [], chunks: [] })),
    readBillRecords().catch(() => []),
  ]);

  const userId = session.user.id;
  const [feedbackSummary, reminderDaysBeforeDue, userPlan] = await Promise.all([
    getFeedbackSummaryByOpportunity(userId),
    getReminderDaysForUser(userId),
    getPlanForUser(userId),
  ]);
  const planConfig = PLANS[userPlan];
  const userDocs = store.documents.filter((d) => d.userId === userId);
  const userBills = bills.filter((b) => b.userId === userId);
  const recurringBills = userBills.filter((bill) => bill.isRecurring);
  const oneTimeBills = userBills.filter((bill) => !bill.isRecurring);
  const contractCount = userDocs.filter((d) => d.docType === "contract").length;

  const now = new Date();
  const dueReminders = buildDueReminders(
    recurringBills,
    reminderDaysBeforeDue,
    now,
  );
  const dueReminderIds = new Set(dueReminders.map((item) => item.billId));
  const dueAlerts = recurringBills.filter((bill) =>
    dueReminderIds.has(bill.id),
  );

  const byService = new Map<string, number[]>();
  for (const bill of recurringBills) {
    const key = bill.serviceName.toLowerCase();
    if (!byService.has(key)) byService.set(key, []);
    byService.get(key)!.push(bill.amount);
  }

  let anomalyCount = 0;
  for (const amounts of byService.values()) {
    if (amounts.length >= 2) {
      const prev = amounts[amounts.length - 2];
      const curr = amounts[amounts.length - 1];
      if (prev > 0 && Math.abs((curr - prev) / prev) >= 0.2) {
        anomalyCount++;
      }
    }
  }

  const lowConfidenceCount = userBills.filter(
    (bill) =>
      typeof bill.classificationConfidence === "number" &&
      bill.classificationConfidence < 0.7,
  ).length;

  const serviceSummary = Array.from(
    userBills
      .reduce(
        (acc, bill) => {
          const key = bill.serviceName;
          const current = acc.get(key) ?? {
            serviceName: key,
            totalAmount: 0,
            invoiceCount: 0,
            recurringCount: 0,
            latestBillDate: bill.billDate,
          };

          current.totalAmount += bill.amount;
          current.invoiceCount += 1;
          if (bill.isRecurring) current.recurringCount += 1;
          if (bill.billDate > current.latestBillDate) {
            current.latestBillDate = bill.billDate;
          }

          acc.set(key, current);
          return acc;
        },
        new Map<
          string,
          {
            serviceName: string;
            totalAmount: number;
            invoiceCount: number;
            recurringCount: number;
            latestBillDate: string;
          }
        >(),
      )
      .values(),
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  const upcomingPayments = recurringBills
    .filter((bill) => bill.dueDate && new Date(bill.dueDate) >= now)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 8);

  const monthlySpend = userBills
    .filter((bill) => {
      const dt = new Date(bill.billDate);
      return (
        !Number.isNaN(dt.getTime()) &&
        dt.getMonth() === now.getMonth() &&
        dt.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, bill) => sum + bill.amount, 0);

  const cheaperAlternativeOpportunities = buildCheaperAlternativeOpportunities(
    recurringBills,
    userDocs,
    feedbackSummary,
  );

  return {
    session,
    userId,
    userDocs,
    userBills,
    recurringBills,
    oneTimeBills,
    contractCount,
    dueAlerts,
    dueReminders,
    anomalyCount,
    lowConfidenceCount,
    serviceSummary,
    upcomingPayments,
    monthlySpend,
    cheaperAlternativeOpportunities,
    sidebarCounts: {
      invoices: userBills.length,
      alerts: dueAlerts.length + anomalyCount + lowConfidenceCount,
      services: serviceSummary.length,
      documents: userDocs.length,
    },
    reminderDaysBeforeDue,
    userPlan,
    planConfig,
  };
}
