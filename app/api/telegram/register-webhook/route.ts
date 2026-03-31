import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Call this once: GET /api/telegram/register-webhook?secret=<REMINDER_CRON_SECRET>
// It tells Telegram to send all bot updates to your /api/telegram/webhook endpoint.
export async function GET(request: Request) {
  const cronSecret = process.env.REMINDER_CRON_SECRET?.trim();
  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret")?.trim();

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!botToken || !appUrl) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_APP_URL must be set" },
      { status: 500 },
    );
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  const params: Record<string, string> = { url: webhookUrl };
  if (webhookSecret) {
    params.secret_token = webhookSecret;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    },
  );

  const data = await res.json();
  return NextResponse.json({ webhook_url: webhookUrl, telegram_response: data });
}
