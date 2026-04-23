import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}
