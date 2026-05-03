import { db } from "@/db/drizzle";
import { userNotificationPreferencesTable } from "@/db/schema/tableSchema";
import { eq, inArray } from "drizzle-orm";

const DEFAULT_DUE_REMINDER_EMAIL_ENABLED = true;

export async function getDueReminderEmailEnabledForUser(
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ dueReminderEmailEnabled: userNotificationPreferencesTable.dueReminderEmailEnabled })
    .from(userNotificationPreferencesTable)
    .where(eq(userNotificationPreferencesTable.userId, userId))
    .limit(1);
  if (rows.length === 0) return DEFAULT_DUE_REMINDER_EMAIL_ENABLED;
  return rows[0].dueReminderEmailEnabled;
}

export async function setDueReminderEmailEnabledForUser(
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  await db
    .insert(userNotificationPreferencesTable)
    .values({ userId, dueReminderEmailEnabled: enabled })
    .onConflictDoUpdate({
      target: userNotificationPreferencesTable.userId,
      set: { dueReminderEmailEnabled: enabled, updatedAt: new Date() },
    });
  return enabled;
}

export async function getDueReminderEmailEnabledByUsers(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const out = new Map<string, boolean>();
  if (uniqueUserIds.length === 0) return out;

  const rows = await db
    .select({
      userId: userNotificationPreferencesTable.userId,
      dueReminderEmailEnabled: userNotificationPreferencesTable.dueReminderEmailEnabled,
    })
    .from(userNotificationPreferencesTable)
    .where(inArray(userNotificationPreferencesTable.userId, uniqueUserIds));

  const byUserId = new Map(rows.map((r) => [r.userId, r.dueReminderEmailEnabled]));

  for (const userId of uniqueUserIds) {
    const enabled = byUserId.get(userId);
    out.set(
      userId,
      typeof enabled === "boolean" ? enabled : DEFAULT_DUE_REMINDER_EMAIL_ENABLED,
    );
  }

  return out;
}
