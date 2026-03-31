import { NextResponse } from "next/server";
import {
  consumeTelegramLinkToken,
  upsertTelegramLink,
} from "@/lib/telegram-linking";

export const dynamic = "force-dynamic";

function isAuthorizedBotRequest(request: Request): boolean {
  const expected = process.env.TELEGRAM_LINK_API_SECRET?.trim();
  if (!expected) return false;
  const received = request.headers.get("x-telegram-link-secret")?.trim();
  return !!received && received === expected;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedBotRequest(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      token?: string;
      telegram_user_id?: string;
      chat_id?: string;
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };

    const token = body.token?.trim() ?? "";
    const telegramUserId = body.telegram_user_id?.trim() ?? "";
    const chatId = body.chat_id?.trim() ?? "";

    if (!token || !telegramUserId || !chatId) {
      return NextResponse.json(
        { error: "token, telegram_user_id, chat_id are required" },
        { status: 400 },
      );
    }

    const consumed = await consumeTelegramLinkToken(token);
    if (!consumed.ok || !consumed.userId) {
      return NextResponse.json(
        { error: consumed.reason ?? "invalid_or_expired_token" },
        { status: 400 },
      );
    }

    const link = await upsertTelegramLink({
      userId: consumed.userId,
      telegramUserId,
      chatId,
      username: body.username ?? null,
      firstName: body.first_name ?? null,
      lastName: body.last_name ?? null,
    });

    return NextResponse.json({
      ok: true,
      user_id: link.userId,
      telegram_user_id: link.telegramUserId,
      chat_id: link.chatId,
      linked_at: link.linkedAt,
      updated_at: link.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "telegram_consume_link_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
