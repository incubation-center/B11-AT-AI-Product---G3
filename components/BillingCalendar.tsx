"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, LayoutList, CalendarDays } from "lucide-react";

type Bill = {
  id: string;
  serviceName: string;
  dueDate: string | null;
  amount: number;
  isRecurring: boolean;
  invoiceType: string;
};

type DueReminder = {
  billId: string;
  daysUntilDue: number;
  status: "overdue" | "due_today" | "due_soon";
};

type Props = {
  bills: Bill[];
  dueReminders: DueReminder[];
  reminderDaysBeforeDue: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon … 6=Sun
function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // convert to Mon=0
}

function billStatusClass(bill: Bill, reminderMap: Map<string, DueReminder>): string {
  const reminder = reminderMap.get(bill.id);
  if (reminder?.status === "overdue") return "bg-red-500/10 border-red-400/40 text-red-700";
  if (reminder?.status === "due_today") return "bg-amber-500/15 border-amber-400/40 text-amber-800";
  if (reminder?.status === "due_soon") return "bg-amber-500/10 border-amber-300/40 text-amber-700";
  return "bg-[hsl(var(--primary)/0.08)] border-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]";
}

function dotColor(bill: Bill, reminderMap: Map<string, DueReminder>): string {
  const reminder = reminderMap.get(bill.id);
  if (reminder?.status === "overdue") return "bg-red-500";
  if (reminder?.status === "due_today" || reminder?.status === "due_soon") return "bg-amber-500";
  return "bg-[hsl(var(--primary))]";
}

export default function BillingCalendar({ bills, dueReminders, reminderDaysBeforeDue }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedBills, setSelectedBills] = useState<Bill[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const reminderMap = useMemo(
    () => new Map(dueReminders.map((r) => [r.billId, r])),
    [dueReminders],
  );

  // Group bills by due date string for quick lookup
  const billsByDate = useMemo(() => {
    const map = new Map<string, Bill[]>();
    for (const bill of bills) {
      if (!bill.dueDate) continue;
      const key = bill.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bill);
    }
    return map;
  }, [bills]);

  // Bills visible in the current month for list view
  const monthBills = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const result: { day: number; bills: Bill[] }[] = [];
    const daysInMonth = getDaysInMonth(year, month);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${prefix}${String(d).padStart(2, "0")}`;
      const dayBills = billsByDate.get(key);
      if (dayBills && dayBills.length > 0) {
        result.push({ day: d, bills: dayBills });
      }
    }
    return result;
  }, [billsByDate, year, month]);

  const monthTotal = useMemo(
    () => monthBills.reduce((sum, { bills: b }) => sum + b.reduce((s, bill) => s + bill.amount, 0), 0),
    [monthBills],
  );

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedBills(null);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedBills(null);
    setSelectedDay(null);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedBills(null);
    setSelectedDay(null);
  }

  function handleDayClick(day: number, dayBills: Bill[]) {
    if (dayBills.length === 0) return;
    if (selectedDay === day) {
      setSelectedBills(null);
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
      setSelectedBills(dayBills);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--primary))] px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25 transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[160px] text-center text-lg font-semibold text-white">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25 transition"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="rounded-lg bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25 transition"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/90">
            {formatCurrency(monthTotal)} due this month
          </span>
          <div className="flex overflow-hidden rounded-lg border border-white/20">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                view === "grid" ? "bg-white text-[hsl(var(--primary))]" : "text-white hover:bg-white/15"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                view === "list" ? "bg-white text-[hsl(var(--primary))]" : "text-white hover:bg-white/15"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-[hsl(var(--muted-ink))]">
        Reminders fire{" "}
        <span className="font-medium text-[hsl(var(--ink))]">
          {reminderDaysBeforeDue} day{reminderDaysBeforeDue === 1 ? "" : "s"}
        </span>{" "}
        before due date.
      </p>

      {/* Grid view */}
      {view === "grid" && (
        <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[hsl(var(--line))]">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-[hsl(var(--muted-ink))] uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDayOffset + 1;
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;
              const isToday =
                isCurrentMonth && isValidDay && dayNum === today.getDate();
              const dateKey = isValidDay
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                : "";
              const dayBills = (isValidDay && billsByDate.get(dateKey)) || [];
              const isSelected = selectedDay === dayNum && isValidDay;

              return (
                <div
                  key={idx}
                  onClick={() => isValidDay && handleDayClick(dayNum, dayBills)}
                  className={[
                    "min-h-[80px] border-b border-r border-[hsl(var(--line))] p-1.5 transition",
                    isValidDay ? "cursor-pointer hover:bg-[hsl(var(--bg))]" : "bg-[hsl(var(--bg))]/40",
                    isSelected ? "bg-[hsl(var(--primary)/0.05)] ring-1 ring-inset ring-[hsl(var(--primary)/0.3)]" : "",
                  ].join(" ")}
                >
                  {isValidDay && (
                    <>
                      <span
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday
                            ? "bg-[hsl(var(--primary))] text-white"
                            : "text-[hsl(var(--ink))]",
                        ].join(" ")}
                      >
                        {dayNum}
                      </span>

                      <div className="mt-1 space-y-0.5">
                        {dayBills.slice(0, 2).map((bill) => (
                          <div
                            key={bill.id}
                            className={[
                              "rounded px-1 py-0.5 text-[10px] font-medium border truncate",
                              billStatusClass(bill, reminderMap),
                            ].join(" ")}
                            title={`${bill.serviceName} — ${formatCurrency(bill.amount)}`}
                          >
                            {bill.serviceName}
                          </div>
                        ))}
                        {dayBills.length > 2 && (
                          <p className="text-[10px] text-[hsl(var(--muted-ink))] pl-1">
                            +{dayBills.length - 2} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail panel */}
      {view === "grid" && selectedBills && selectedDay && (
        <div className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {MONTHS[month]} {selectedDay}, {year}
            </p>
            <button
              onClick={() => { setSelectedBills(null); setSelectedDay(null); }}
              className="text-xs text-[hsl(var(--muted-ink))] hover:text-[hsl(var(--ink))]"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {selectedBills.map((bill) => {
              const reminder = reminderMap.get(bill.id);
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-xl bg-[hsl(var(--bg))] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor(bill, reminderMap)}`} />
                    <div>
                      <p className="text-sm font-medium">{bill.serviceName}</p>
                      <p className="text-xs text-[hsl(var(--muted-ink))] capitalize">
                        {bill.invoiceType.replace("_", "-")}
                        {reminder && (
                          <span className={`ml-2 ${reminder.status === "overdue" ? "text-red-500" : "text-amber-500"}`}>
                            · {reminder.status === "overdue" ? "Overdue" : reminder.status === "due_today" ? "Due today" : `${reminder.daysUntilDue}d left`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(bill.amount)}</p>
                </div>
              );
            })}
            <p className="pt-1 text-right text-xs font-medium text-[hsl(var(--muted-ink))]">
              Total: {formatCurrency(selectedBills.reduce((s, b) => s + b.amount, 0))}
            </p>
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4">
          {monthBills.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-ink))]">
              No bills due in {MONTHS[month]} {year}.
            </p>
          ) : (
            <div className="space-y-1">
              {monthBills.map(({ day, bills: dayBills }) => (
                <div key={day}>
                  <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))] first:mt-0">
                    {MONTHS[month]} {day}
                  </p>
                  {dayBills.map((bill) => {
                    const reminder = reminderMap.get(bill.id);
                    return (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between rounded-xl bg-[hsl(var(--bg))] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor(bill, reminderMap)}`} />
                          <div>
                            <p className="text-sm font-medium">{bill.serviceName}</p>
                            <p className="text-xs text-[hsl(var(--muted-ink))]">
                              Due {bill.dueDate}
                              {reminder && (
                                <span className={`ml-2 ${reminder.status === "overdue" ? "text-red-500" : "text-amber-500"}`}>
                                  · {reminder.status === "overdue" ? "Overdue" : reminder.status === "due_today" ? "Due today" : `${reminder.daysUntilDue}d left`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold">{formatCurrency(bill.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="mt-3 flex justify-end border-t border-[hsl(var(--line))] pt-3">
                <p className="text-sm font-semibold">
                  Month total: {formatCurrency(monthTotal)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-ink))]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Upcoming</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Due soon / today</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Overdue</span>
      </div>
    </div>
  );
}
