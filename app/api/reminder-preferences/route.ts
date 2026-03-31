import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getReminderDaysForUser,
  setReminderDaysForUser,
} from "@/lib/reminder-preferences";

export const dynamic = "force-dynamic";

async function resolveUserId(bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const reminderDays = await getReminderDaysForUser(userId);
    return NextResponse.json({ reminder_days: reminderDays });
  } catch (error) {
    return NextResponse.json(
      {
        error: "reminder_preferences_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string;
      reminder_days?: number[];
    };

    const userId = await resolveUserId(body.user_id);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!Array.isArray(body.reminder_days)) {
      return NextResponse.json(
        { error: "reminder_days must be an array of numbers" },
        { status: 400 },
      );
    }

    const reminderDays = await setReminderDaysForUser(userId, body.reminder_days);
    return NextResponse.json({ reminder_days: reminderDays });
  } catch (error) {
    return NextResponse.json(
      {
        error: "reminder_preferences_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
