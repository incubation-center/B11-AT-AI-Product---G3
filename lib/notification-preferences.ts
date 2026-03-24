import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type NotificationPreference = {
  userId: string;
  dueReminderEmailEnabled: boolean;
  updatedAt: string;
};

type NotificationPreferenceStore = {
  records: NotificationPreference[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const NOTIFICATION_PREFERENCES_PATH = path.join(
  DATA_DIR,
  "notification-preferences.json",
);

const DEFAULT_DUE_REMINDER_EMAIL_ENABLED = true;

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(NOTIFICATION_PREFERENCES_PATH, "utf8");
  } catch {
    await writeFile(
      NOTIFICATION_PREFERENCES_PATH,
      JSON.stringify({ records: [] }, null, 2),
      "utf8",
    );
  }
}

async function readStore(): Promise<NotificationPreferenceStore> {
  await ensureStore();
  const raw = await readFile(NOTIFICATION_PREFERENCES_PATH, "utf8");
  return JSON.parse(raw) as NotificationPreferenceStore;
}

async function writeStore(store: NotificationPreferenceStore): Promise<void> {
  await writeFile(
    NOTIFICATION_PREFERENCES_PATH,
    JSON.stringify(store, null, 2),
    "utf8",
  );
}

export async function getDueReminderEmailEnabledForUser(
  userId: string,
): Promise<boolean> {
  const store = await readStore();
  const found = store.records.find((record) => record.userId === userId);
  if (!found) return DEFAULT_DUE_REMINDER_EMAIL_ENABLED;
  return found.dueReminderEmailEnabled !== false;
}

export async function setDueReminderEmailEnabledForUser(
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  const store = await readStore();
  const existingIndex = store.records.findIndex((record) => record.userId === userId);
  const payload: NotificationPreference = {
    userId,
    dueReminderEmailEnabled: enabled,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.records[existingIndex] = payload;
  } else {
    store.records.push(payload);
  }

  await writeStore(store);
  return enabled;
}

export async function getDueReminderEmailEnabledByUsers(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const out = new Map<string, boolean>();
  if (uniqueUserIds.length === 0) return out;

  const store = await readStore();
  const byUserId = new Map(
    store.records.map((record) => [record.userId, record.dueReminderEmailEnabled]),
  );

  for (const userId of uniqueUserIds) {
    const enabled = byUserId.get(userId);
    out.set(
      userId,
      typeof enabled === "boolean"
        ? enabled
        : DEFAULT_DUE_REMINDER_EMAIL_ENABLED,
    );
  }

  return out;
}
