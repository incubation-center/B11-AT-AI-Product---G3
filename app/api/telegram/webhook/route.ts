import { NextResponse } from "next/server";
import { consumeTelegramLinkToken, upsertTelegramLink, resolveUserIdFromTelegram } from "@/lib/telegram-linking";
import { readBillRecords } from "@/lib/ai/rag-core";
import { ingestDocumentForUser, type IngestDocumentResult } from "@/lib/ai/document-ingestion";

export const dynamic = "force-dynamic";

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  if (!response.ok) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  }
}

function getTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }
  return token;
}

async function getTelegramFilePath(fileId: string): Promise<string> {
  const token = getTelegramToken();
  const response = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const payload = (await response.json()) as {
    ok?: boolean;
    result?: { file_path?: string };
    description?: string;
  };

  if (!response.ok || !payload.ok || !payload.result?.file_path) {
    throw new Error(payload.description ?? "Failed to resolve Telegram file");
  }

  return payload.result.file_path;
}

async function downloadTelegramFile(params: {
  fileId: string;
  filename: string;
  mimeType: string;
}): Promise<File> {
  const token = getTelegramToken();
  const filePath = await getTelegramFilePath(params.fileId);
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);

  if (!response.ok) {
    throw new Error("Failed to download Telegram file");
  }

  const blob = await response.blob();
  const mimeType =
    response.headers.get("content-type")?.split(";")[0] ||
    params.mimeType ||
    blob.type ||
    "application/octet-stream";

  return new File([blob], params.filename, { type: mimeType });
}

function getUploadFromMessage(message: NonNullable<TelegramUpdate["message"]>) {
  if (message.photo?.length) {
    const largestPhoto = [...message.photo].sort(
      (a, b) => (b.file_size ?? 0) - (a.file_size ?? 0),
    )[0];

    return {
      fileId: largestPhoto.file_id,
      filename: `telegram-photo-${message.message_id}.jpg`,
      mimeType: "image/jpeg",
    };
  }

  const document = message.document;
  if (
    document?.file_id &&
    (document.mime_type?.startsWith("image/") ||
      document.mime_type === "application/pdf")
  ) {
    return {
      fileId: document.file_id,
      filename: document.file_name ?? `telegram-document-${message.message_id}`,
      mimeType: document.mime_type ?? "application/octet-stream",
    };
  }

  return null;
}

function formatIngestResult(result: IngestDocumentResult): string {
  if (result.status === "skipped") {
    return result.message ?? "I scanned the file, but nothing was saved.";
  }

  const bill = result.bill_record;
  if (bill) {
    const dueDate = bill.dueDate ? `\nDue date: ${bill.dueDate}` : "";
    const recurrence = bill.isRecurring ? "Recurring" : "One-time";
    return [
      "*Scan complete*",
      `Service: ${bill.serviceName}`,
      `Amount: ${bill.currency === "KHR" ? "KHR " : "$"}${bill.amount.toFixed(2)}`,
      `Type: ${recurrence}`,
      dueDate.trim(),
      "",
      "Saved to your account.",
    ].filter(Boolean).join("\n");
  }

  return [
    "*Scan complete*",
    `Document type: ${result.doc_type ?? "document"}`,
    result.service_name ? `Service: ${result.service_name}` : "",
    "Saved to your account.",
  ].filter(Boolean).join("\n");
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

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text?.trim() ?? "";
    const command = text ? text.split(/\s+/)[0].toLowerCase() : "";

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

    const upload = getUploadFromMessage(message);
    if (upload) {
      await sendMessage(chatId, "Scanning your document...");
      try {
        const file = await downloadTelegramFile(upload);
        const result = await ingestDocumentForUser({ userId, file });
        await sendMessage(chatId, formatIngestResult(result));
      } catch (error) {
        console.error("Telegram image scan error:", error);
        await sendMessage(
          chatId,
          "I could not scan that file. Please send a clear JPG, PNG, WebP, or PDF invoice.",
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (!text) {
      await sendMessage(chatId, "Send an invoice image, or use /upcoming, /services, or /add.");
      return NextResponse.json({ ok: true });
    }

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
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};
