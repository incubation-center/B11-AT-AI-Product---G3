import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTelegramLinkByUserId } from "@/lib/telegram-linking";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const linked = await getTelegramLinkByUserId(userId);
    return NextResponse.json({
      linked: !!linked,
      telegram: linked
        ? {
            telegram_user_id: linked.telegramUserId,
            chat_id: linked.chatId,
            username: linked.username,
            first_name: linked.firstName,
            last_name: linked.lastName,
            linked_at: linked.linkedAt,
            updated_at: linked.updatedAt,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "telegram_link_status_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
