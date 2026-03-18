import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type ReminderPreference = {
  userId: string;
  daysBeforeDue: number;
  updatedAt: string;
};

type ReminderStore = {
  records: ReminderPreference[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const REMINDER_PREFERENCES_PATH = path.join(
  DATA_DIR,
  "reminder-preferences.json",
);
const DEFAULT_DAYS_BEFORE_DUE = 7;

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(REMINDER_PREFERENCES_PATH, "utf8");
  } catch {
    const init: ReminderStore = { records: [] };
    await writeFile(
      REMINDER_PREFERENCES_PATH,
      JSON.stringify(init, null, 2),
      "utf8",
    );
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

export async function getReminderDaysForUser(userId: string): Promise<number> {
  const store = await readStore();
  const found = store.records.find((record) => record.userId === userId);
  if (!found) {
    return DEFAULT_DAYS_BEFORE_DUE;
  }
  if (!Number.isFinite(found.daysBeforeDue)) {
    return DEFAULT_DAYS_BEFORE_DUE;
  }
  return Math.min(30, Math.max(1, Math.round(found.daysBeforeDue)));
}

export async function setReminderDaysForUser(
  userId: string,
  daysBeforeDue: number,
): Promise<number> {
  const safeDays = Math.min(30, Math.max(1, Math.round(daysBeforeDue)));
  const store = await readStore();
  const existingIndex = store.records.findIndex((record) => record.userId === userId);

  const payload: ReminderPreference = {
    userId,
    daysBeforeDue: safeDays,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.records[existingIndex] = payload;
  } else {
    store.records.push(payload);
  }

  await writeStore(store);
  return safeDays;
}
