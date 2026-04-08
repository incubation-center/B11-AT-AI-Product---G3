import { NextResponse } from "next/server";
import { consumeTelegramLinkToken, upsertTelegramLink, resolveUserIdFromTelegram } from "@/lib/telegram-linking";
import { readBillRecords } from "@/lib/ai/rag-core";

export const dynamic = "force-dynamic";

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function daysUntil(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function POST(request: Request) {
  try {
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
    const command = text.split(/\s+/)[0].toLowerCase();

    // /start <token>
    if (command === "/start") {
      const parts = text.split(/\s+/);
      const token = parts[1] ?? "";

      if (!token) {
        await sendMessage(chatId, "Welcome! To link your Telegram account, open the app and go to *Settings → Link Telegram*.");
        return NextResponse.json({ ok: true });
      }

      const consumed = await consumeTelegramLinkToken(token);
      if (!consumed.ok || !consumed.userId) {
        await sendMessage(chatId, "This link is invalid or has expired. Please generate a new one from the app.");
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

      await sendMessage(chatId, "✅ Your Telegram account has been linked successfully! You will now receive bill reminders here.\n\nTry /upcoming to see your upcoming bills.");
      return NextResponse.json({ ok: true });
    }

    // Resolve user for authenticated commands
    const userId = await resolveUserIdFromTelegram({
      telegramUserId: String(from?.id ?? ""),
      chatId: String(chatId),
    });

    if (!userId) {
      await sendMessage(chatId, "Your Telegram is not linked yet. Open the app → Settings → Link Telegram.");
      return NextResponse.json({ ok: true });
    }

    const bills = await readBillRecords();
    const userBills = bills.filter((b) => b.userId === userId);

    // /upcoming — bills due in next 7 days
    if (command === "/upcoming") {
      const upcoming = userBills
        .filter((b) => b.dueDate && b.recurrenceStatus !== "stopped")
        .map((b) => ({ ...b, days: daysUntil(b.dueDate!) }))
        .filter((b) => b.days >= 0 && b.days <= 7)
        .sort((a, b) => a.days - b.days);

      if (upcoming.length === 0) {
        await sendMessage(chatId, "✅ No bills due in the next 7 days.");
        return NextResponse.json({ ok: true });
      }

      const lines = upcoming.map((b) => {
        const when = b.days === 0 ? "today" : b.days === 1 ? "tomorrow" : `in ${b.days} days`;
        return `• *${b.serviceName}* — ${formatCurrency(b.amount)} due ${when} (${b.dueDate})`;
      });

      await sendMessage(chatId, `📅 *Upcoming bills (next 7 days):*\n\n${lines.join("\n")}`);
      return NextResponse.json({ ok: true });
    }

    // /services — recurring services
    if (command === "/services") {
      const recurring = userBills.filter((b) => b.isRecurring && b.recurrenceStatus !== "stopped");

      if (recurring.length === 0) {
        await sendMessage(chatId, "No recurring services tracked yet. Upload a bill in the app to get started.");
        return NextResponse.json({ ok: true });
      }

      const lines = recurring.map((b) => `• *${b.serviceName}* — ${formatCurrency(b.amount)}/mo`);
      const total = recurring.reduce((sum, b) => sum + b.amount, 0);

      await sendMessage(chatId, `🔁 *Recurring services (${recurring.length}):*\n\n${lines.join("\n")}\n\n💰 Total: ${formatCurrency(total)}/mo`);
      return NextResponse.json({ ok: true });
    }

    // /add — redirect to web app
    if (command === "/add") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "the app";
      await sendMessage(chatId, `➕ To add a subscription or rental, open the app and upload your bill document:\n${appUrl}/documents`);
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    await sendMessage(chatId, "Available commands:\n/upcoming — Bills due in next 7 days\n/services — Your recurring services\n/add — Add a subscription or rental");
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

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
