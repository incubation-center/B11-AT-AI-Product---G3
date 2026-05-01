import type { Plan } from "@/lib/plans";
import { db } from "@/db/drizzle";
import { userPlansTable } from "@/db/schema/tableSchema";
import { eq } from "drizzle-orm";

const DEFAULT_PLAN: Plan = "free";
const VALID_PLANS: Plan[] = ["free", "basic", "pro"];

export async function getPlanForUser(userId: string): Promise<Plan> {
  try {
    const rows = await db
      .select()
      .from(userPlansTable)
      .where(eq(userPlansTable.userId, userId))
      .limit(1);
    if (!rows.length) return DEFAULT_PLAN;
    const plan = rows[0].plan as Plan;
    return VALID_PLANS.includes(plan) ? plan : DEFAULT_PLAN;
  } catch {
    return DEFAULT_PLAN;
  }
}

export async function setPlanForUser(userId: string, plan: Plan): Promise<Plan> {
  const safePlan = VALID_PLANS.includes(plan) ? plan : DEFAULT_PLAN;
  await db
    .insert(userPlansTable)
    .values({ userId, plan: safePlan })
    .onConflictDoUpdate({
      target: userPlansTable.userId,
      set: { plan: safePlan },
    });
  return safePlan;
}
