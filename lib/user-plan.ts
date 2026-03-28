import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Plan } from "@/lib/plans";

type UserPlanRecord = {
  userId: string;
  plan: Plan;
  updatedAt: string;
};

type UserPlanStore = {
  records: UserPlanRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const USER_PLANS_PATH = path.join(DATA_DIR, "user-plans.json");
const DEFAULT_PLAN: Plan = "free";

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(USER_PLANS_PATH, "utf8");
  } catch {
    const init: UserPlanStore = { records: [] };
    await writeFile(USER_PLANS_PATH, JSON.stringify(init, null, 2), "utf8");
  }
}

async function readStore(): Promise<UserPlanStore> {
  await ensureStore();
  const raw = await readFile(USER_PLANS_PATH, "utf8");
  return JSON.parse(raw) as UserPlanStore;
}

async function writeStore(store: UserPlanStore): Promise<void> {
  await writeFile(USER_PLANS_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getPlanForUser(userId: string): Promise<Plan> {
  const store = await readStore();
  const found = store.records.find((r) => r.userId === userId);
  if (!found) return DEFAULT_PLAN;
  const valid: Plan[] = ["free", "basic", "pro"];
  return valid.includes(found.plan as Plan) ? (found.plan as Plan) : DEFAULT_PLAN;
}

export async function setPlanForUser(userId: string, plan: Plan): Promise<Plan> {
  const valid: Plan[] = ["free", "basic", "pro"];
  const safePlan = valid.includes(plan) ? plan : DEFAULT_PLAN;
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.userId === userId);
  const payload: UserPlanRecord = {
    userId,
    plan: safePlan,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    store.records[idx] = payload;
  } else {
    store.records.push(payload);
  }
  await writeStore(store);
  return safePlan;
}
