import { NextResponse } from "next/server";
import { consumeTelegramLinkToken, upsertTelegramLink } from "@/lib/telegram-linking";

export const dynamic = "force-dynamic";

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Telegram calls this endpoint for every bot update (messages, commands, etc.)
export async function POST(request: Request) {
  try {
    // Optional: verify the webhook secret Telegram sends (set during registerWebhook)
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (webhookSecret) {
      const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (receivedSecret !== webhookSecret) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text.trim();

    // Handle /start <token>
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const token = parts[1] ?? "";

      if (!token) {
        await sendMessage(
          chatId,
          "Welcome! To link your Telegram account, open the app and go to Settings → Notifications → Link Telegram.",
        );
        return NextResponse.json({ ok: true });
      }

      const consumed = await consumeTelegramLinkToken(token);

      if (!consumed.ok || !consumed.userId) {
        await sendMessage(
          chatId,
          "This link is invalid or has expired. Please generate a new one from the app.",
        );
        return NextResponse.json({ ok: true });
      }

      await upsertTelegramLink({
        userId: consumed.userId,
        telegramUserId: String(from?.id ?? chatId),
        chatId: String(chatId),
        username: from?.username ?? null,
        firstName: from?.first_name ?? null,
        lastName: from?.last_name ?? null,
      });

      await sendMessage(
        chatId,
        "Your Telegram account has been linked successfully! You will now receive bill reminders here.",
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Always return 200 so Telegram doesn't retry indefinitely
    return NextResponse.json({ ok: true });
  }
}

// Types for the Telegram Update object (only the fields we need)
type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};
