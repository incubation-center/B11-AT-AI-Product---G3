import type { BillRecord } from "@/lib/ai/rag-core";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DueReminderStatus = "overdue" | "due_today" | "due_soon";

export type DueReminder = {
  billId: string;
  serviceName: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
  reminderDate: string;
  status: DueReminderStatus;
};

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calcDaysUntilDue(dueDate: Date, now: Date): number {
  return Math.round(
    (toStartOfDay(dueDate).getTime() - toStartOfDay(now).getTime()) / DAY_MS,
  );
}

export function buildDueReminders(
  recurringBills: BillRecord[],
  reminderDays: number[],
  now: Date,
): DueReminder[] {
  const maxWindow = Math.max(...reminderDays, 0);
  const seen = new Set<string>();
  const items: DueReminder[] = [];

  for (const bill of recurringBills) {
    const due = parseDueDate(bill.dueDate);
    if (!due) continue;

    const daysUntilDue = calcDaysUntilDue(due, now);
    if (daysUntilDue > maxWindow || seen.has(bill.id)) continue;
    seen.add(bill.id);

    const matchingDay = reminderDays.find((d) => daysUntilDue <= d) ?? reminderDays[0];
    const status: DueReminderStatus =
      daysUntilDue < 0 ? "overdue" : daysUntilDue === 0 ? "due_today" : "due_soon";

    items.push({
      billId: bill.id,
      serviceName: bill.serviceName,
      dueDate: bill.dueDate as string,
      amount: bill.amount,
      daysUntilDue,
      reminderDate: new Date(due.getTime() - matchingDay * DAY_MS).toISOString(),
      status,
    });
  }

  return items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
