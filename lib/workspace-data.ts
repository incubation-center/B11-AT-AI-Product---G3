import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readBillRecords, readStore, advanceRecurringBills, type DocumentRecord } from "@/lib/ai/rag-core";
import { db } from "@/db/drizzle";
import { contractsTable } from "@/db/schema/tableSchema";
import { getReminderDaysForUser } from "@/lib/reminder-preferences";
import { getFeedbackSummaryByOpportunity } from "@/lib/cheaper-feedback";
import { getPlanForUser } from "@/lib/user-plan";
import { PLANS } from "@/lib/plans";
import { buildDueReminders } from "@/lib/billing-reminders";
import { buildCheaperAlternativeOpportunities } from "@/lib/billing-alternatives";

export type { DueReminder } from "@/lib/billing-reminders";
export type { CheaperAlternativeOpportunity } from "@/lib/billing-alternatives";

export async function getWorkspaceData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  await advanceRecurringBills().catch(() => null);

  const userId = session.user.id;

  const [store, bills, dbDocs] = await Promise.all([
    readStore().catch(() => ({ documents: [], chunks: [] })),
    readBillRecords().catch(() => []),
    process.env.DATABASE_URL
      ? db.select().from(contractsTable).then((rows) =>
          rows.map((row): DocumentRecord => ({
            id: row.id,
            userId: row.userId,
            serviceName: row.serviceName ?? null,
            categoryHint: row.category ?? null,
            docType: (row.docType as DocumentRecord["docType"]) ?? "contract",
            originalFilename: row.originalFilename ?? "",
            mimeType: row.mimeType ?? "",
            textLength: row.textLength ?? 0,
            createdAt: row.createdAt.toISOString(),
          }))
        )
      : Promise.resolve([] as DocumentRecord[]),
  ]);

  const [feedbackSummary, reminderDaysBeforeDue, userPlan] = await Promise.all([
    getFeedbackSummaryByOpportunity(userId),
    getReminderDaysForUser(userId),
    getPlanForUser(userId),
  ]);

  const allDocs = process.env.DATABASE_URL ? dbDocs : store.documents;
  const userDocs = allDocs.filter((d) => d.userId === userId);
  const userBills = bills.filter((b) => b.userId === userId);
  const recurringBills = userBills.filter((b) => b.isRecurring);
  const oneTimeBills = userBills.filter((b) => !b.isRecurring);
  const contractCount = userDocs.filter((d) => d.docType === "contract").length;

  const now = new Date();

  const dueReminders = buildDueReminders(recurringBills, reminderDaysBeforeDue, now);
  const dueReminderIds = new Set(dueReminders.map((r) => r.billId));
  const dueAlerts = recurringBills.filter((b) => dueReminderIds.has(b.id));

  const byService = new Map<string, number[]>();
  for (const bill of recurringBills) {
    const key = bill.serviceName.toLowerCase();
    if (!byService.has(key)) byService.set(key, []);
    byService.get(key)!.push(bill.amount);
  }
  let anomalyCount = 0;
  for (const amounts of byService.values()) {
    if (amounts.length >= 2) {
      const prev = amounts[amounts.length - 2];
      const curr = amounts[amounts.length - 1];
      if (prev > 0 && Math.abs((curr - prev) / prev) >= 0.2) anomalyCount++;
    }
  }

  const lowConfidenceCount = userBills.filter(
    (b) => typeof b.classificationConfidence === "number" && b.classificationConfidence < 0.7,
  ).length;

  const serviceSummary = Array.from(
    userBills.reduce((acc, bill) => {
      const key = bill.serviceName;
      const cur = acc.get(key) ?? { serviceName: key, totalAmount: 0, invoiceCount: 0, recurringCount: 0, latestBillDate: bill.billDate };
      cur.totalAmount += bill.amount;
      cur.invoiceCount += 1;
      if (bill.isRecurring) cur.recurringCount += 1;
      if (bill.billDate > cur.latestBillDate) cur.latestBillDate = bill.billDate;
      acc.set(key, cur);
      return acc;
    }, new Map<string, { serviceName: string; totalAmount: number; invoiceCount: number; recurringCount: number; latestBillDate: string }>()).values(),
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  const upcomingPayments = recurringBills
    .filter((b) => b.dueDate && new Date(b.dueDate) >= now)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 8);

  const monthlySpend = userBills
    .filter((b) => {
      const dt = new Date(b.billDate);
      return !Number.isNaN(dt.getTime()) && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const cheaperAlternativeOpportunities = buildCheaperAlternativeOpportunities(
    recurringBills,
    userDocs,
    feedbackSummary,
  );

  return {
    session,
    userId,
    userDocs,
    userBills,
    recurringBills,
    oneTimeBills,
    contractCount,
    dueAlerts,
    dueReminders,
    anomalyCount,
    lowConfidenceCount,
    serviceSummary,
    upcomingPayments,
    monthlySpend,
    cheaperAlternativeOpportunities,
    sidebarCounts: {
      invoices: userBills.length,
      alerts: dueAlerts.length + anomalyCount + lowConfidenceCount,
      services: serviceSummary.length,
      documents: userDocs.length,
    },
    reminderDaysBeforeDue,
    userPlan,
    planConfig: PLANS[userPlan],
  };
}
