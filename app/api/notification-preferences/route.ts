import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getDueReminderEmailEnabledForUser,
  setDueReminderEmailEnabledForUser,
} from "@/lib/notification-preferences";

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
    const dueReminderEmailEnabled =
      await getDueReminderEmailEnabledForUser(userId);
    return NextResponse.json({
      due_reminder_email_enabled: dueReminderEmailEnabled,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "notification_preferences_failed",
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
      due_reminder_email_enabled?: boolean;
    };

    const userId = await resolveUserId(body.user_id);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (typeof body.due_reminder_email_enabled !== "boolean") {
      return NextResponse.json(
        { error: "due_reminder_email_enabled must be a boolean" },
        { status: 400 },
      );
    }

    const enabled = await setDueReminderEmailEnabledForUser(
      userId,
      body.due_reminder_email_enabled,
    );

    return NextResponse.json({ due_reminder_email_enabled: enabled });
  } catch (error) {
    return NextResponse.json(
      {
        error: "notification_preferences_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
