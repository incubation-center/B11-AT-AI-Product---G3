import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { reminderDeliveryLogsTable } from "@/db/schema/tableSchema";

export type ReminderDeliveryHistoryItem = {
  id: string;
  userId: string;
  billId: string;
  dueDate: string;
  reminderDate: string;
  email: string;
  sentAt: string;
};

function makeDeliveryKey(params: {
  userId: string;
  billId: string;
  dueDate: string;
  reminderDate: string;
}): string {
  return [
    params.userId.trim(),
    params.billId.trim(),
    params.dueDate.trim(),
    params.reminderDate.trim(),
  ].join("::");
}

export function toReminderDeliveryKey(params: {
  userId: string;
  billId: string;
  dueDate: string;
  reminderDate: string;
}): string {
  return makeDeliveryKey(params);
}

export async function getExistingDeliveryKeys(): Promise<Set<string>> {
  const rows = await db
    .select({
      userId: reminderDeliveryLogsTable.userId,
      billId: reminderDeliveryLogsTable.billId,
      dueDate: reminderDeliveryLogsTable.dueDate,
      reminderDate: reminderDeliveryLogsTable.reminderDate,
    })
    .from(reminderDeliveryLogsTable);

  return new Set(rows.map((r) => makeDeliveryKey(r)));
}

export async function appendReminderDeliveryRecords(
  input: Array<{
    userId: string;
    billId: string;
    dueDate: string;
    reminderDate: string;
    email: string;
  }>,
): Promise<void> {
  if (input.length === 0) return;

  await db.insert(reminderDeliveryLogsTable).values(
    input.map((item) => ({
      userId: item.userId,
      billId: item.billId,
      dueDate: item.dueDate,
      reminderDate: item.reminderDate,
      email: item.email,
    })),
  );
}

export async function getReminderDeliveryHistoryForUser(params: {
  userId: string;
  limit?: number;
}): Promise<ReminderDeliveryHistoryItem[]> {
  const safeLimit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.floor(params.limit)
      : 20;

  const rows = await db
    .select()
    .from(reminderDeliveryLogsTable)
    .where(eq(reminderDeliveryLogsTable.userId, params.userId))
    .limit(safeLimit);

  return rows
    .map((r) => ({
      id: r.id,
      userId: r.userId,
      billId: r.billId,
      dueDate: r.dueDate,
      reminderDate: r.reminderDate,
      email: r.email,
      sentAt: r.sentAt.toISOString(),
    }))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}
