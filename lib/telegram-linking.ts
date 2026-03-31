import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

type TelegramLinkRecord = {
  userId: string;
  telegramUserId: string;
  chatId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  linkedAt: string;
  updatedAt: string;
};

type PendingTelegramLinkToken = {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

type TelegramLinkStore = {
  links: TelegramLinkRecord[];
  pendingTokens: PendingTelegramLinkToken[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const TELEGRAM_LINK_PATH = path.join(DATA_DIR, "telegram-links.json");
const DEFAULT_TOKEN_TTL_MINUTES = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function isExpired(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() <= Date.now();
}

function sanitizeStore(input: unknown): TelegramLinkStore {
  const fallback: TelegramLinkStore = { links: [], pendingTokens: [] };
  if (!input || typeof input !== "object") return fallback;

  const obj = input as Partial<TelegramLinkStore>;
  const links = Array.isArray(obj.links) ? obj.links : [];
  const pendingTokens = Array.isArray(obj.pendingTokens) ? obj.pendingTokens : [];

  return {
    links: links.filter(
      (item): item is TelegramLinkRecord =>
        !!item &&
        typeof item.userId === "string" &&
        typeof item.telegramUserId === "string" &&
        typeof item.chatId === "string" &&
        typeof item.linkedAt === "string" &&
        typeof item.updatedAt === "string",
    ),
    pendingTokens: pendingTokens.filter(
      (item): item is PendingTelegramLinkToken =>
        !!item &&
        typeof item.token === "string" &&
        typeof item.userId === "string" &&
        typeof item.expiresAt === "string" &&
        typeof item.createdAt === "string",
    ),
  };
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(TELEGRAM_LINK_PATH, "utf8");
  } catch {
    const init: TelegramLinkStore = { links: [], pendingTokens: [] };
    await writeFile(TELEGRAM_LINK_PATH, JSON.stringify(init, null, 2), "utf8");
  }
}

async function readStore(): Promise<TelegramLinkStore> {
  await ensureStore();
  const raw = await readFile(TELEGRAM_LINK_PATH, "utf8");
  return sanitizeStore(JSON.parse(raw));
}

async function writeStore(store: TelegramLinkStore): Promise<void> {
  await writeFile(TELEGRAM_LINK_PATH, JSON.stringify(store, null, 2), "utf8");
}

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
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + safeTtl * 60 * 1000).toISOString();
  const token = newToken();

  const store = await readStore();
  store.pendingTokens = store.pendingTokens.filter(
    (item) => item.userId !== safeUserId && !isExpired(item.expiresAt),
  );
  store.pendingTokens.push({
    token,
    userId: safeUserId,
    expiresAt,
    createdAt: createdAt.toISOString(),
  });
  await writeStore(store);

  return { token, expiresAt };
}

export async function consumeTelegramLinkToken(
  token: string,
): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  const safeToken = token.trim();
  if (!safeToken) return { ok: false, reason: "token_required" };

  const store = await readStore();
  store.pendingTokens = store.pendingTokens.filter((item) => !isExpired(item.expiresAt));

  const matchIndex = store.pendingTokens.findIndex((item) => item.token === safeToken);
  if (matchIndex < 0) {
    await writeStore(store);
    return { ok: false, reason: "invalid_or_expired_token" };
  }

  const match = store.pendingTokens[matchIndex];
  store.pendingTokens.splice(matchIndex, 1);
  await writeStore(store);
  return { ok: true, userId: match.userId };
}

export async function upsertTelegramLink(params: {
  userId: string;
  telegramUserId: string;
  chatId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<TelegramLinkRecord> {
  const userId = params.userId.trim();
  const telegramUserId = params.telegramUserId.trim();
  const chatId = params.chatId.trim();

  if (!userId) throw new Error("user_id_required");
  if (!telegramUserId) throw new Error("telegram_user_id_required");
  if (!chatId) throw new Error("chat_id_required");

  const store = await readStore();
  const existingIndex = store.links.findIndex(
    (item) => item.userId === userId || item.telegramUserId === telegramUserId,
  );

  const timestamp = nowIso();
  const existing = existingIndex >= 0 ? store.links[existingIndex] : null;

  const payload: TelegramLinkRecord = {
    userId,
    telegramUserId,
    chatId,
    username: params.username?.trim() || null,
    firstName: params.firstName?.trim() || null,
    lastName: params.lastName?.trim() || null,
    linkedAt: existing?.linkedAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    store.links[existingIndex] = payload;
  } else {
    store.links.push(payload);
  }

  await writeStore(store);
  return payload;
}

export async function getTelegramLinkByUserId(
  userId: string,
): Promise<TelegramLinkRecord | null> {
  const safeUserId = userId.trim();
  if (!safeUserId) return null;
  const store = await readStore();
  return store.links.find((item) => item.userId === safeUserId) ?? null;
}

export async function getTelegramLinkByTelegramUserId(
  telegramUserId: string,
): Promise<TelegramLinkRecord | null> {
  const safeTelegramUserId = telegramUserId.trim();
  if (!safeTelegramUserId) return null;
  const store = await readStore();
  return (
    store.links.find((item) => item.telegramUserId === safeTelegramUserId) ?? null
  );
}

export async function resolveUserIdFromTelegram(params: {
  telegramUserId?: string | null;
  chatId?: string | null;
}): Promise<string | null> {
  const safeTelegramUserId = params.telegramUserId?.trim() || null;
  const safeChatId = params.chatId?.trim() || null;
  if (!safeTelegramUserId && !safeChatId) return null;

  const store = await readStore();
  const byTelegramUser =
    safeTelegramUserId
      ? store.links.find((item) => item.telegramUserId === safeTelegramUserId)
      : null;
  if (byTelegramUser) return byTelegramUser.userId;

  if (!safeChatId) return null;
  const byChat = store.links.find((item) => item.chatId === safeChatId);
  return byChat?.userId ?? null;
}

