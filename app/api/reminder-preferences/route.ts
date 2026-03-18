import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getReminderDaysForUser,
  setReminderDaysForUser,
} from "@/lib/reminder-preferences";

export const dynamic = "force-dynamic";

async function resolveUserId(
  bodyUserId?: string,
): Promise<string | null> {
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
    const daysBeforeDue = await getReminderDaysForUser(userId);
    return NextResponse.json({ days_before_due: daysBeforeDue });
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
      days_before_due?: number;
    };

    const userId = await resolveUserId(body.user_id);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (typeof body.days_before_due !== "number") {
      return NextResponse.json(
        { error: "days_before_due must be a number" },
        { status: 400 },
      );
    }

    const daysBeforeDue = await setReminderDaysForUser(
      userId,
      body.days_before_due,
    );

    return NextResponse.json({ days_before_due: daysBeforeDue });
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
