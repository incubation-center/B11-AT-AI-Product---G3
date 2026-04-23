import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/get-authenticated-user-id";
import { readBillRecords } from "@/lib/ai/rag-core";

type ServicesRequest = {
  days?: number;
};

type ServiceSummary = {
  service_name: string;
  records_count: number;
  latest_bill_date: string;
  latest_amount: number;
  average_amount: number;
  next_due_date: string | null;
};

export const dynamic = "force-dynamic";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}


function buildServiceSummary(params: {
  bills: Awaited<ReturnType<typeof readBillRecords>>;
  userId: string;
}): ServiceSummary[] {
  const now = new Date();
  const groups = new Map<string, typeof params.bills>();

  for (const bill of params.bills) {
    if (bill.userId !== params.userId) continue;
    if (!bill.isRecurring) continue;

    const key = bill.serviceName.toLowerCase();
    const existing = groups.get(key) ?? [];
    existing.push(bill);
    groups.set(key, existing);
  }

  const summaries: ServiceSummary[] = [];

  for (const records of groups.values()) {
    const sorted = [...records].sort((a, b) => b.billDate.localeCompare(a.billDate));
    const latest = sorted[0];
    const averageAmount =
      records.reduce((sum, row) => sum + row.amount, 0) / records.length;

    const nextDue = records
      .map((row) => row.dueDate)
      .filter((value): value is string => typeof value === "string")
      .map((value) => ({ raw: value, parsed: parseDate(value) }))
      .filter((entry) => entry.parsed && entry.parsed >= now)
      .sort((a, b) => (a.raw > b.raw ? 1 : -1))[0];

    summaries.push({
      service_name: latest.serviceName,
      records_count: records.length,
      latest_bill_date: latest.billDate,
      latest_amount: latest.amount,
      average_amount: Number(averageAmount.toFixed(2)),
      next_due_date: nextDue?.raw ?? null,
    });
  }

  return summaries.sort((a, b) => a.service_name.localeCompare(b.service_name));
}

async function handle(userInput: ServicesRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bills = await readBillRecords();
  const items = buildServiceSummary({ bills, userId });

  return NextResponse.json({
    count: items.length,
    items,
  });
}

export async function GET() {
  return handle({});
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ServicesRequest;
  return handle(body);
}
