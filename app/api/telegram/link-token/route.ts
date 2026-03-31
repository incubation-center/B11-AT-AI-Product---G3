import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createTelegramLinkToken } from "@/lib/telegram-linking";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { token, expiresAt } = await createTelegramLinkToken(userId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
    const startLink = botUsername
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`
      : null;

    return NextResponse.json({
      token,
      expires_at: expiresAt,
      start_link: startLink,
      message:
        "Open the start_link (or send /start <token> to your bot) to complete Telegram linking.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "telegram_link_token_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
