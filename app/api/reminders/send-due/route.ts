import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { inArray } from "drizzle-orm";
import { readBillRecords } from "@/lib/ai/rag-core";
import { getReminderDaysByUsers } from "@/lib/reminder-preferences";
import { getDueReminderEmailEnabledByUsers } from "@/lib/notification-preferences";
import {
  appendReminderDeliveryRecords,
  getExistingDeliveryKeys,
  toReminderDeliveryKey,
} from "@/lib/reminder-delivery";
import { sendDueReminderEmail } from "@/lib/email";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/users";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderCandidate = {
  billId: string;
  userId: string;
  serviceName: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
  reminderDate: string;
};

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calcDaysUntilDue(dueDateIso: string, now: Date): number | null {
  const dueDate = new Date(dueDateIso);
  if (Number.isNaN(dueDate.getTime())) return null;
  return Math.round(
    (toStartOfDay(dueDate).getTime() - toStartOfDay(now).getTime()) / DAY_MS,
  );
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const envSecret = process.env.REMINDER_CRON_SECRET;
    if (!envSecret) {
      return NextResponse.json(
        { error: "REMINDER_CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    const hdrs = await headers();
    const requestSecret = hdrs.get("x-reminder-secret");
    if (requestSecret !== envSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      dry_run?: boolean;
    };
    const dryRun = body.dry_run === true;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is required for reminder email sending" },
        { status: 500 },
      );
    }

    const now = new Date();
    const bills = await readBillRecords();
    const recurringBills = bills.filter(
      (bill) =>
        bill.isRecurring &&
        !!bill.dueDate &&
        typeof bill.amount === "number" &&
        bill.amount > 0,
    );

    const userIds = Array.from(new Set(recurringBills.map((bill) => bill.userId)));
    const reminderDaysByUser = await getReminderDaysByUsers(userIds);
    const dueReminderEmailEnabledByUser = await getDueReminderEmailEnabledByUsers(userIds);
    const existingDeliveryKeys = await getExistingDeliveryKeys();

    const candidates: ReminderCandidate[] = [];

    for (const bill of recurringBills) {
      if (!bill.dueDate) continue;
      if (dueReminderEmailEnabledByUser.get(bill.userId) === false) continue;

      const reminderDaysArr = reminderDaysByUser.get(bill.userId) ?? [7];
      const daysUntilDue = calcDaysUntilDue(bill.dueDate, now);
      if (daysUntilDue === null) continue;

      const dueDate = new Date(bill.dueDate);

      for (const reminderDay of reminderDaysArr) {
        if (daysUntilDue < 0 || daysUntilDue > reminderDay) continue;

        const reminderDate = new Date(
          toStartOfDay(dueDate).getTime() - reminderDay * DAY_MS,
        )
          .toISOString()
          .slice(0, 10);

        const dedupeKey = toReminderDeliveryKey({
          userId: bill.userId,
          billId: bill.id,
          dueDate: bill.dueDate,
          reminderDate,
        });
        if (existingDeliveryKeys.has(dedupeKey)) continue;

        candidates.push({
          billId: bill.id,
          userId: bill.userId,
          serviceName: bill.serviceName,
          dueDate: bill.dueDate,
          amount: bill.amount,
          daysUntilDue,
          reminderDate,
        });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        dry_run: dryRun,
        scanned_recurring_bills: recurringBills.length,
        pending_reminders: 0,
        sent_emails: 0,
      });
    }

    const candidateUserIds = Array.from(new Set(candidates.map((item) => item.userId)));
    const users = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, candidateUserIds));

    const userById = new Map(users.map((u) => [u.id, u]));
    const remindersByUser = new Map<string, ReminderCandidate[]>();
    for (const item of candidates) {
      if (!userById.has(item.userId)) continue;
      if (!remindersByUser.has(item.userId)) remindersByUser.set(item.userId, []);
      remindersByUser.get(item.userId)!.push(item);
    }

    let sentEmails = 0;
    let sentReminderItems = 0;
    const failedUsers: Array<{ userId: string; error: string }> = [];

    for (const [userId, items] of remindersByUser) {
      const found = userById.get(userId);
      if (!found) continue;

      if (dryRun) {
        sentEmails += 1;
        sentReminderItems += items.length;
        continue;
      }

      try {
        await sendDueReminderEmail({
          user: { email: found.email, name: found.name ?? undefined },
          reminders: items.map((item) => ({
            serviceName: item.serviceName,
            dueDate: item.dueDate,
            amount: item.amount,
            daysUntilDue: item.daysUntilDue,
          })),
        });

        await appendReminderDeliveryRecords(
          items.map((item) => ({
            userId: item.userId,
            billId: item.billId,
            dueDate: item.dueDate,
            reminderDate: item.reminderDate,
            email: found.email,
          })),
        );

        sentEmails += 1;
        sentReminderItems += items.length;
      } catch (error) {
        failedUsers.push({
          userId,
          error: error instanceof Error ? error.message : "unknown_error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      scanned_recurring_bills: recurringBills.length,
      pending_reminders: candidates.length,
      sent_emails: sentEmails,
      sent_reminder_items: sentReminderItems,
      failed_users: failedUsers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "send_due_reminders_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
