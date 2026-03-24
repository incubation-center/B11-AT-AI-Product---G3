import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type ReminderDeliveryRecord = {
  id: string;
  userId: string;
  billId: string;
  dueDate: string;
  reminderDate: string;
  email: string;
  sentAt: string;
};

type ReminderDeliveryStore = {
  records: ReminderDeliveryRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const REMINDER_DELIVERY_PATH = path.join(DATA_DIR, "reminder-delivery-log.json");

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

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(REMINDER_DELIVERY_PATH, "utf8");
  } catch {
    await writeFile(
      REMINDER_DELIVERY_PATH,
      JSON.stringify({ records: [] }, null, 2),
      "utf8",
    );
  }
}

async function readStore(): Promise<ReminderDeliveryStore> {
  await ensureStore();
  const raw = await readFile(REMINDER_DELIVERY_PATH, "utf8");
  return JSON.parse(raw) as ReminderDeliveryStore;
}

async function writeStore(store: ReminderDeliveryStore): Promise<void> {
  await writeFile(REMINDER_DELIVERY_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getExistingDeliveryKeys(): Promise<Set<string>> {
  const store = await readStore();
  const keys = store.records.map((record) =>
    makeDeliveryKey({
      userId: record.userId,
      billId: record.billId,
      dueDate: record.dueDate,
      reminderDate: record.reminderDate,
    }),
  );
  return new Set(keys);
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

  const store = await readStore();
  const now = new Date().toISOString();

  for (const item of input) {
    store.records.push({
      id: crypto.randomUUID(),
      userId: item.userId,
      billId: item.billId,
      dueDate: item.dueDate,
      reminderDate: item.reminderDate,
      email: item.email,
      sentAt: now,
    });
  }

  await writeStore(store);
}

export function toReminderDeliveryKey(params: {
  userId: string;
  billId: string;
  dueDate: string;
  reminderDate: string;
}): string {
  return makeDeliveryKey(params);
}
