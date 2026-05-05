import {
  makeOpportunityKey,
  type FeedbackReason,
  type FeedbackVote,
} from "@/lib/cheaper-feedback";
import type { BillRecord } from "@/lib/ai/rag-core";

const KHR_TO_USD = 1 / 4100;

export type AlternativeRisk = "low" | "medium" | "high";

export type ServiceCategory =
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

export type AlternativeOption = {
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

export type ConfidenceBreakdown = {
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

// --- Static catalog ---

const CATEGORY_HINT_KEYWORDS: Array<{ category: ServiceCategory; keywords: string[] }> = [
  { category: "video_streaming",   keywords: ["stream", "video", "ott", "entertainment"] },
  { category: "music_streaming",   keywords: ["music", "audio"] },
  { category: "productivity",      keywords: ["saas", "productivity", "workspace", "office", "collaboration"] },
  { category: "cloud_storage",     keywords: ["storage", "backup", "drive", "cloud"] },
  { category: "design",            keywords: ["design", "creative", "photo", "graphics"] },
  { category: "password_manager",  keywords: ["password", "security", "vault"] },
  { category: "vpn",               keywords: ["vpn", "network security", "privacy"] },
  { category: "email_marketing",   keywords: ["email marketing", "newsletter", "campaign"] },
  { category: "accounting",        keywords: ["accounting", "bookkeeping", "finance software"] },
];

const SERVICE_NAME_KEYWORDS: Array<{ category: ServiceCategory; keywords: string[] }> = [
  { category: "video_streaming",  keywords: ["netflix", "disney", "hulu", "hbo", "youtube", "youtube premium", "prime video", "max", "paramount"] },
  { category: "music_streaming",  keywords: ["spotify", "apple music", "youtube music", "amazon music"] },
  { category: "productivity",     keywords: ["notion", "slack", "microsoft 365", "google workspace", "atlassian", "monday", "asana", "airtable"] },
  { category: "cloud_storage",    keywords: ["dropbox", "onedrive", "google drive", "icloud", "amazon drive"] },
  { category: "design",           keywords: ["canva", "adobe", "figma", "sketch"] },
  { category: "password_manager", keywords: ["1password", "lastpass", "bitwarden", "dashlane", "nordpass"] },
  { category: "vpn",              keywords: ["nordvpn", "expressvpn", "surfshark", "protonvpn"] },
  { category: "email_marketing",  keywords: ["mailchimp", "convertkit", "brevo", "constant contact"] },
  { category: "accounting",       keywords: ["quickbooks", "xero", "freshbooks", "zoho"] },
];

const ALTERNATIVE_CATALOG: Record<ServiceCategory, AlternativeOption[]> = {
  video_streaming: [
    { provider: "Disney+",  plan: "Standard with Ads", billedAmount: 7.99, billingCycle: "monthly", monthlyPrice: 7.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low",  reason: "Lower monthly price for general entertainment content." },
    { provider: "Hulu",     plan: "With Ads",          billedAmount: 7.99, billingCycle: "monthly", monthlyPrice: 7.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low",  reason: "Good content overlap at lower base price." },
  ],
  music_streaming: [
    { provider: "YouTube Music", plan: "Individual", billedAmount: 10.99, billingCycle: "monthly", monthlyPrice: 10.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low", reason: "Comparable catalog and playlist support at similar or lower price." },
  ],
  productivity: [
    { provider: "Google Workspace", plan: "Business Starter", billedAmount: 7.2, billingCycle: "monthly", monthlyPrice: 7.2, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Lower seat cost for email/docs/chat with migration effort." },
    { provider: "Zoho Workplace",   plan: "Standard",         billedAmount: 3,   billingCycle: "monthly", monthlyPrice: 3,   pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Cost-efficient productivity suite with broad core features." },
  ],
  cloud_storage: [
    { provider: "Google One", plan: "200 GB", billedAmount: 2.99, billingCycle: "monthly", monthlyPrice: 2.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low",    reason: "Lower storage price for personal or light-team usage." },
    { provider: "iCloud+",    plan: "200 GB", billedAmount: 2.99, billingCycle: "monthly", monthlyPrice: 2.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Lower price if your team is already in Apple ecosystem." },
  ],
  design: [
    { provider: "Canva",    plan: "Pro",               billedAmount: 14.99, billingCycle: "monthly", monthlyPrice: 14.99, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Lower design tooling cost for non-advanced workflows." },
    { provider: "Affinity", plan: "Perpetual license", billedAmount: 4.99,  billingCycle: "monthly", monthlyPrice: 4.99,  pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "high",   reason: "Can be cheaper long-term but needs tool/workflow transition." },
  ],
  password_manager: [
    { provider: "Bitwarden", plan: "Premium", billedAmount: 9.96, billingCycle: "annual", monthlyPrice: 0.83, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low", reason: "Lower subscription cost with strong core password features." },
  ],
  vpn: [
    { provider: "Surfshark", plan: "Starter (annual avg)", billedAmount: 29.88, billingCycle: "annual", monthlyPrice: 2.49, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "low", reason: "Usually lower effective monthly cost on annual commitment." },
  ],
  email_marketing: [
    { provider: "Brevo", plan: "Starter", billedAmount: 9, billingCycle: "monthly", monthlyPrice: 9, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Lower monthly base for growing email campaigns." },
  ],
  accounting: [
    { provider: "FreshBooks", plan: "Lite", billedAmount: 19, billingCycle: "monthly", monthlyPrice: 19, pricingSource: "Internal catalog baseline", priceUpdatedAt: "2026-03-01", risk: "medium", reason: "Potentially cheaper for solo/freelancer workflows." },
  ],
  unknown: [],
};

const MIN_MONTHLY_SAVINGS = 0.5;
const MIN_CONFIDENCE = 0.45;
const MAX_PRICE_STALENESS_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

// --- Domain logic ---

export function inferCategory(
  serviceName: string,
  categoryHint: string | null,
): ServiceCategory {
  const name = serviceName.toLowerCase();
  const hint = (categoryHint ?? "").toLowerCase();

  for (const entry of CATEGORY_HINT_KEYWORDS) {
    if (entry.keywords.some((kw) => hint.includes(kw))) return entry.category;
  }
  for (const entry of SERVICE_NAME_KEYWORDS) {
    if (entry.keywords.some((kw) => name.includes(kw))) return entry.category;
  }
  return "unknown";
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function daysSince(isoDate: string, now: Date): number {
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return 365;
  return Math.max(0, Math.round((now.getTime() - dt.getTime()) / DAY_MS));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function buildCheaperAlternativeOpportunities(
  recurringBills: BillRecord[],
  userDocs: Array<{ serviceName: string | null; categoryHint: string | null }>,
  feedbackSummary: Map<
    string,
    { upvotes: number; downvotes: number; userVote: FeedbackVote | null; userReason: FeedbackReason | null }
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
    if (!hintByService.has(key)) hintByService.set(key, doc.categoryHint ?? null);
  }

  const now = new Date();
  const opportunities: CheaperAlternativeOpportunity[] = [];

  for (const [serviceKey, serviceBills] of billsByService) {
    const displayName = serviceBills[0]?.serviceName ?? serviceKey;
    const sorted = [...serviceBills].sort((a, b) => b.billDate.localeCompare(a.billDate));
    const toUsd = (b: BillRecord) => b.currency === "KHR" ? b.amount * KHR_TO_USD : b.amount;
    const latestAmount = toUsd(sorted[0]!);
    const currentMonthly = latestAmount > 0 ? latestAmount : avg(serviceBills.map(toUsd));
    if (currentMonthly < 3) continue;

    const category = inferCategory(displayName, hintByService.get(serviceKey) ?? null);
    if (category === "unknown") continue;

    const options = ALTERNATIVE_CATALOG[category];
    const cheaperOption = options
      .filter((o) => o.monthlyPrice < currentMonthly && !displayName.toLowerCase().includes(o.provider.toLowerCase()))
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0];
    if (!cheaperOption) continue;

    const monthlySavings = Number((currentMonthly - cheaperOption.monthlyPrice).toFixed(2));
    if (monthlySavings < MIN_MONTHLY_SAVINGS) continue;

    const opportunityKey = makeOpportunityKey(displayName, cheaperOption.provider, cheaperOption.plan);
    const feedback = feedbackSummary.get(opportunityKey) ?? { upvotes: 0, downvotes: 0, userVote: null, userReason: null };

    const dataCoverage = clamp01(serviceBills.length / 3);
    const categoryMatch = hintByService.get(serviceKey) ? 1 : 0.75;
    const priceAdvantage = clamp01(monthlySavings / Math.max(currentMonthly, 1));
    const priceFreshness = clamp01(1 - daysSince(cheaperOption.priceUpdatedAt, now) / MAX_PRICE_STALENESS_DAYS);
    const totalVotes = feedback.upvotes + feedback.downvotes;
    const netVotes = totalVotes > 0 ? (feedback.upvotes - feedback.downvotes) / totalVotes : 0;
    const crowdSignal = clamp01((netVotes + 1) / 2);
    const userSignal = feedback.userVote === "up" ? 1 : feedback.userVote === "down" ? 0 : 0.5;
    const feedbackSignal = clamp01(crowdSignal * 0.6 + userSignal * 0.4);

    let confidence = priceAdvantage * 0.32 + dataCoverage * 0.22 + categoryMatch * 0.16 + priceFreshness * 0.16 + feedbackSignal * 0.14;
    confidence = Math.max(0.35, Math.min(0.95, Number(confidence.toFixed(2))));
    if (confidence < MIN_CONFIDENCE) continue;

    const evidence = [
      `Current estimated monthly cost from recent recurring invoices: ${currentMonthly.toFixed(2)}.`,
      `Comparable option in category: ${category.replaceAll("_", " ")}.`,
      `Alternative pricing baseline updated on ${cheaperOption.priceUpdatedAt}.`,
      ...(serviceBills.length >= 2 ? [`Confidence boosted by ${serviceBills.length} recurring invoice records.`] : []),
      ...(hintByService.get(serviceKey) ? ["Category hint detected from uploaded document metadata."] : []),
      ...(monthlySavings >= currentMonthly * 0.3 ? ["High relative savings (>30%) suggests meaningful optimization opportunity."] : []),
      ...(totalVotes > 0 ? [`Community feedback signal: ${feedback.upvotes} helpful vs ${feedback.downvotes} not useful votes.`] : []),
    ];

    opportunities.push({
      opportunityKey,
      serviceName: displayName,
      latestBillDate: sorted[0]?.billDate ?? new Date(0).toISOString().slice(0, 10),
      category,
      currentEstimatedMonthly: Number(currentMonthly.toFixed(2)),
      currentEstimatedYearly: Number((currentMonthly * 12).toFixed(2)),
      alternative: cheaperOption,
      estimatedMonthlySavings: monthlySavings,
      estimatedYearlySavings: Number((monthlySavings * 12).toFixed(2)),
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

  return opportunities.sort((a, b) => {
    if (b.latestBillDate !== a.latestBillDate) return b.latestBillDate.localeCompare(a.latestBillDate);
    const sa = a.confidence * a.estimatedMonthlySavings;
    const sb = b.confidence * b.estimatedMonthlySavings;
    if (sb !== sa) return sb - sa;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.estimatedMonthlySavings - a.estimatedMonthlySavings;
  });
}
