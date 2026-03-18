import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readBillRecords, readStore } from "@/lib/ai/rag-core";
import { getReminderDaysForUser } from "@/lib/reminder-preferences";

function isDueSoon(dueDate: string | null, daysBeforeDue: number): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= daysBeforeDue * 24 * 60 * 60 * 1000;
}

export async function getWorkspaceData() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const [store, bills] = await Promise.all([
    readStore().catch(() => ({ documents: [], chunks: [] })),
    readBillRecords().catch(() => []),
  ]);

  const userId = session.user.id;
  const reminderDaysBeforeDue = await getReminderDaysForUser(userId);
  const userDocs = store.documents.filter((d) => d.userId === userId);
  const userBills = bills.filter((b) => b.userId === userId);
  const recurringBills = userBills.filter((bill) => bill.isRecurring);
  const oneTimeBills = userBills.filter((bill) => !bill.isRecurring);
  const contractCount = userDocs.filter((d) => d.docType === "contract").length;

  const now = new Date();
  const dueAlerts = recurringBills.filter(
    (bill) =>
      bill.dueDate &&
      (new Date(bill.dueDate) < now ||
        isDueSoon(bill.dueDate, reminderDaysBeforeDue)),
  );

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
      if (prev > 0 && Math.abs((curr - prev) / prev) >= 0.2) {
        anomalyCount++;
      }
    }
  }

  const lowConfidenceCount = userBills.filter(
    (bill) =>
      typeof bill.classificationConfidence === "number" &&
      bill.classificationConfidence < 0.7,
  ).length;

  const serviceSummary = Array.from(
    userBills
      .reduce(
        (acc, bill) => {
          const key = bill.serviceName;
          const current = acc.get(key) ?? {
            serviceName: key,
            totalAmount: 0,
            invoiceCount: 0,
            recurringCount: 0,
            latestBillDate: bill.billDate,
          };

          current.totalAmount += bill.amount;
          current.invoiceCount += 1;
          if (bill.isRecurring) current.recurringCount += 1;
          if (bill.billDate > current.latestBillDate) {
            current.latestBillDate = bill.billDate;
          }

          acc.set(key, current);
          return acc;
        },
        new Map<
          string,
          {
            serviceName: string;
            totalAmount: number;
            invoiceCount: number;
            recurringCount: number;
            latestBillDate: string;
          }
        >(),
      )
      .values(),
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  const upcomingPayments = recurringBills
    .filter((bill) => bill.dueDate && new Date(bill.dueDate) >= now)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 8);

  const monthlySpend = userBills
    .filter((bill) => {
      const dt = new Date(bill.billDate);
      return (
        !Number.isNaN(dt.getTime()) &&
        dt.getMonth() === now.getMonth() &&
        dt.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, bill) => sum + bill.amount, 0);

  return {
    session,
    userId,
    userDocs,
    userBills,
    recurringBills,
    oneTimeBills,
    contractCount,
    dueAlerts,
    anomalyCount,
    lowConfidenceCount,
    serviceSummary,
    upcomingPayments,
    monthlySpend,
    sidebarCounts: {
      invoices: userBills.length,
      alerts: dueAlerts.length + anomalyCount + lowConfidenceCount,
      services: serviceSummary.length,
      documents: userDocs.length,
    },
    reminderDaysBeforeDue,
  };
}
