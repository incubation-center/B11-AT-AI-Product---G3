import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readBillRecords } from "@/lib/ai/rag-core";

type UpcomingRequest = {
  user_id?: string;
  days?: number;
};

type UpcomingItem = {
  bill_id: string;
  service_name: string;
  due_date: string;
  amount: number;
  days_until_due: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function daysUntil(dueDate: Date, now: Date): number {
  return Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
}

function normalizeDays(input: number | undefined): number {
  if (typeof input !== "number" || Number.isNaN(input)) return 7;
  return Math.max(1, Math.min(30, Math.floor(input)));
}

async function resolveUserId(bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;

  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;

  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

function mapUpcoming(params: {
  bills: Awaited<ReturnType<typeof readBillRecords>>;
  userId: string;
  days: number;
  now: Date;
}): UpcomingItem[] {
  const byService = new Map<string, UpcomingItem>();

  for (const bill of params.bills) {
    if (bill.userId !== params.userId) continue;
    if (!bill.isRecurring) continue;
    if (!bill.dueDate) continue;

    const dueDate = parseDateOnly(bill.dueDate);
    if (!dueDate) continue;

    const daysUntilDue = daysUntil(dueDate, params.now);
    if (daysUntilDue < 0 || daysUntilDue > params.days) continue;

    const key = bill.serviceName.toLowerCase();
    const candidate: UpcomingItem = {
      bill_id: bill.id,
      service_name: bill.serviceName,
      due_date: bill.dueDate,
      amount: bill.amount,
      days_until_due: daysUntilDue,
    };

    const existing = byService.get(key);
    if (!existing || candidate.days_until_due < existing.days_until_due) {
      byService.set(key, candidate);
    }
  }

  return Array.from(byService.values()).sort((a, b) => {
    if (a.days_until_due !== b.days_until_due) {
      return a.days_until_due - b.days_until_due;
    }
    return a.service_name.localeCompare(b.service_name);
  });
}

async function handle(userInput: UpcomingRequest) {
  const userId = await resolveUserId(userInput.user_id);
  if (!userId) {
    return NextResponse.json(
      {
        error: "user_id is required (body/query, x-user-id header, or authenticated session)",
      },
      { status: 401 },
    );
  }

  const days = normalizeDays(userInput.days);
  const bills = await readBillRecords();
  const now = new Date();
  const items = mapUpcoming({ bills, userId, days, now });

  return NextResponse.json({
    user_id: userId,
    today: now.toISOString().slice(0, 10),
    window_days: days,
    count: items.length,
    items,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id") ?? undefined;
  const daysRaw = searchParams.get("days");
  const days = daysRaw ? Number(daysRaw) : undefined;
  return handle({ user_id, days });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as UpcomingRequest;
  return handle(body);
}
