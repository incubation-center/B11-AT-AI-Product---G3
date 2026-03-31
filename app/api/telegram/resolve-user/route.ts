import { NextResponse } from "next/server";
import { resolveUserIdFromTelegram } from "@/lib/telegram-linking";

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
      telegram_user_id?: string;
      chat_id?: string;
    };

    const userId = await resolveUserIdFromTelegram({
      telegramUserId: body.telegram_user_id ?? null,
      chatId: body.chat_id ?? null,
    });

    if (!userId) {
      return NextResponse.json({ error: "not_linked" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (error) {
    return NextResponse.json(
      {
        error: "telegram_resolve_user_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
