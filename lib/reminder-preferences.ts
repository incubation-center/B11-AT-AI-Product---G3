import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type ReminderPreferenceRecord = {
  userId: string;
  reminderDays: number[];
  updatedAt: string;
};

type LegacyReminderPreference = {
  userId: string;
  daysBeforeDue?: number;
  reminderDays?: number[];
  updatedAt: string;
};

type ReminderStore = {
  records: LegacyReminderPreference[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const REMINDER_PREFERENCES_PATH = path.join(DATA_DIR, "reminder-preferences.json");
const DEFAULT_REMINDER_DAYS: number[] = [7];

function sanitizeDays(days: unknown): number[] {
  if (!Array.isArray(days)) return DEFAULT_REMINDER_DAYS;
  const valid = (days as unknown[])
    .map((d) => Math.min(30, Math.max(1, Math.round(Number(d)))))
    .filter((d) => Number.isFinite(d) && d >= 1);
  const unique = Array.from(new Set(valid)).sort((a, b) => b - a);
  return unique.length > 0 ? unique : DEFAULT_REMINDER_DAYS;
}

function recordToDays(record: LegacyReminderPreference): number[] {
  if (record.reminderDays && Array.isArray(record.reminderDays)) {
    return sanitizeDays(record.reminderDays);
  }
  if (typeof record.daysBeforeDue === "number") {
    return sanitizeDays([record.daysBeforeDue]);
  }
  return DEFAULT_REMINDER_DAYS;
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(REMINDER_PREFERENCES_PATH, "utf8");
  } catch {
    const init: ReminderStore = { records: [] };
    await writeFile(REMINDER_PREFERENCES_PATH, JSON.stringify(init, null, 2), "utf8");
  }
}

async function readStore(): Promise<ReminderStore> {
  await ensureStore();
  const raw = await readFile(REMINDER_PREFERENCES_PATH, "utf8");
  return JSON.parse(raw) as ReminderStore;
}

async function writeStore(store: ReminderStore): Promise<void> {
  await writeFile(REMINDER_PREFERENCES_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function autoSplitDays(windowDays: number, count: number): number[] {
  const safeWindow = Math.min(30, Math.max(1, Math.round(windowDays)));
  const safeCount = Math.min(10, Math.max(1, Math.round(count)));
  if (safeCount === 1) return [safeWindow];
  const days: number[] = [];
  for (let i = 0; i < safeCount; i++) {
    const day = Math.round(safeWindow - (i * (safeWindow - 1)) / (safeCount - 1));
    if (!days.includes(day) && day >= 1) days.push(day);
  }
  return days.sort((a, b) => b - a);
}

export async function getReminderDaysForUser(userId: string): Promise<number[]> {
  const store = await readStore();
  const found = store.records.find((r) => r.userId === userId);
  if (!found) return DEFAULT_REMINDER_DAYS;
  return recordToDays(found);
}

export async function setReminderDaysForUser(userId: string, days: number[]): Promise<number[]> {
  const safeDays = sanitizeDays(days);
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.userId === userId);
  const payload: ReminderPreferenceRecord = {
    userId,
    reminderDays: safeDays,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    store.records[idx] = payload;
  } else {
    store.records.push(payload);
  }
  await writeStore(store);
  return safeDays;
}

export async function getReminderDaysByUsers(userIds: string[]): Promise<Map<string, number[]>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const out = new Map<string, number[]>();
  if (uniqueUserIds.length === 0) return out;

  const store = await readStore();
  const byUserId = new Map(store.records.map((r) => [r.userId, r]));

  for (const userId of uniqueUserIds) {
    const record = byUserId.get(userId);
    out.set(userId, record ? recordToDays(record) : DEFAULT_REMINDER_DAYS);
  }

  return out;
}
