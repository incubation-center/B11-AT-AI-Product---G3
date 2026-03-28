import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPlanForUser, setPlanForUser } from "@/lib/user-plan";
import { PLANS, type Plan } from "@/lib/plans";
import { readBillRecords } from "@/lib/ai/rag-core";

export const dynamic = "force-dynamic";

async function getAuthUserId(): Promise<string | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await getPlanForUser(userId);
  const config = PLANS[plan];
  const allBills = await readBillRecords();
  const userBillCount = allBills.filter((b) => b.userId === userId).length;

  return NextResponse.json({
    plan,
    label: config.label,
    maxBills: config.maxBills,
    usedBills: userBillCount,
    features: config.features,
  });
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { plan?: string };
  const valid: Plan[] = ["free", "basic", "pro"];
  if (!body.plan || !valid.includes(body.plan as Plan)) {
    return NextResponse.json(
      { error: "plan must be one of: free, basic, pro" },
      { status: 400 },
    );
  }

  const newPlan = await setPlanForUser(userId, body.plan as Plan);
  const config = PLANS[newPlan];

  return NextResponse.json({
    plan: newPlan,
    label: config.label,
    maxBills: config.maxBills,
    features: config.features,
  });
}
