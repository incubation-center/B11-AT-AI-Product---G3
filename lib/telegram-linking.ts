import { eq, lt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db/drizzle";
import { telegramLinksTable, telegramPendingTokensTable } from "@/db/schema/tableSchema";

const DEFAULT_TOKEN_TTL_MINUTES = 10;

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createTelegramLinkToken(
  userId: string,
  ttlMinutes = DEFAULT_TOKEN_TTL_MINUTES,
): Promise<{ token: string; expiresAt: string }> {
  const safeUserId = userId.trim();
  if (!safeUserId) throw new Error("user_id_required");

  const safeTtl = Math.max(1, Math.min(60, Math.round(ttlMinutes)));
  const expiresAt = new Date(Date.now() + safeTtl * 60 * 1000);
  const token = newToken();

  // Remove any existing pending tokens for this user
  await db
    .delete(telegramPendingTokensTable)
    .where(eq(telegramPendingTokensTable.userId, safeUserId));

  await db.insert(telegramPendingTokensTable).values({
    token,
    userId: safeUserId,
    expiresAt,
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function consumeTelegramLinkToken(
  token: string,
): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  const safeToken = token.trim();
  if (!safeToken) return { ok: false, reason: "token_required" };

  // Clean up expired tokens
  await db
    .delete(telegramPendingTokensTable)
    .where(lt(telegramPendingTokensTable.expiresAt, new Date()));

  const rows = await db
    .select()
    .from(telegramPendingTokensTable)
    .where(eq(telegramPendingTokensTable.token, safeToken))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, reason: "invalid_or_expired_token" };
  }

  const match = rows[0];
  await db
    .delete(telegramPendingTokensTable)
    .where(eq(telegramPendingTokensTable.id, match.id));

  return { ok: true, userId: match.userId };
}

export async function upsertTelegramLink(params: {
  userId: string;
  telegramUserId: string;
  chatId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const userId = params.userId.trim();
  const telegramUserId = params.telegramUserId.trim();
  const chatId = params.chatId.trim();

  if (!userId) throw new Error("user_id_required");
  if (!telegramUserId) throw new Error("telegram_user_id_required");
  if (!chatId) throw new Error("chat_id_required");

  await db
    .insert(telegramLinksTable)
    .values({
      userId,
      telegramUserId,
      chatId,
      username: params.username?.trim() ?? null,
      firstName: params.firstName?.trim() ?? null,
      lastName: params.lastName?.trim() ?? null,
    })
    .onConflictDoUpdate({
      target: telegramLinksTable.userId,
      set: {
        telegramUserId,
        chatId,
        username: params.username?.trim() ?? null,
        firstName: params.firstName?.trim() ?? null,
        lastName: params.lastName?.trim() ?? null,
        updatedAt: new Date(),
      },
    });

  const rows = await db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.userId, userId))
    .limit(1);

  return rows[0];
}

export async function getTelegramLinkByUserId(userId: string) {
  const safeUserId = userId.trim();
  if (!safeUserId) return null;
  const rows = await db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.userId, safeUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTelegramLinkByTelegramUserId(telegramUserId: string) {
  const safeTelegramUserId = telegramUserId.trim();
  if (!safeTelegramUserId) return null;
  const rows = await db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.telegramUserId, safeTelegramUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function resolveUserIdFromTelegram(params: {
  telegramUserId?: string | null;
  chatId?: string | null;
}): Promise<string | null> {
  const safeTelegramUserId = params.telegramUserId?.trim() || null;
  const safeChatId = params.chatId?.trim() || null;
  if (!safeTelegramUserId && !safeChatId) return null;

  if (safeTelegramUserId) {
    const rows = await db
      .select()
      .from(telegramLinksTable)
      .where(eq(telegramLinksTable.telegramUserId, safeTelegramUserId))
      .limit(1);
    if (rows[0]) return rows[0].userId;
  }

  if (safeChatId) {
    const rows = await db
      .select()
      .from(telegramLinksTable)
      .where(eq(telegramLinksTable.chatId, safeChatId))
      .limit(1);
    if (rows[0]) return rows[0].userId;
  }

  return null;
}
