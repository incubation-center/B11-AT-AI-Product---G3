import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

type CacheStore = {
  entries: Record<string, AiAlternativesResult>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_PATH = path.join(DATA_DIR, "ai-alternatives-cache.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function readCache(): Promise<CacheStore> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw) as CacheStore;
  } catch {
    return { entries: {} };
  }
}

async function writeCache(store: CacheStore): Promise<void> {
  await writeFile(CACHE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function cacheKey(userId: string, serviceName: string): string {
  return `${userId}:${serviceName.toLowerCase().trim()}`;
}

function isFresh(entry: AiAlternativesResult): boolean {
  const age = Date.now() - new Date(entry.generated_at).getTime();
  return age < CACHE_TTL_MS;
}

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
  const userId = session.user.id;

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

  const cache = await readCache();
  const key = cacheKey(userId, serviceName);
  const cached = cache.entries[key];

  if (cached && isFresh(cached) && !body.force_refresh) {
    return NextResponse.json({ ...cached, from_cache: true });
  }

  try {
    const alternatives = await generateAlternatives(serviceName, currentMonthly);

    const result: AiAlternativesResult = {
      service_name: serviceName,
      current_monthly: currentMonthly,
      alternatives,
      generated_at: new Date().toISOString(),
    };

    cache.entries[key] = result;
    await writeCache(cache);

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
