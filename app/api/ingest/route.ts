import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ingestDocumentForUser } from "@/lib/ai/document-ingestion";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(): Promise<string | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id ?? null;
}

function extractFile(form: FormData): File | null {
  const file = form.get("file");
  return file instanceof File ? file : null;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = extractFile(form);
    if (!file) {
      return NextResponse.json(
        { error: "file is required (multipart/form-data)" },
        { status: 400 },
      );
    }

    const result = await ingestDocumentForUser({
      userId,
      file,
      docType: form.get("doc_type")?.toString() ?? null,
      serviceName: form.get("service_name")?.toString() ?? null,
      categoryHint: form.get("category_hint")?.toString() ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    const payload =
      typeof error === "object" &&
      error !== null &&
      "payload" in error &&
      error.payload &&
      typeof error.payload === "object"
        ? error.payload
        : {
            error: "ingest_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
          };

    return NextResponse.json(payload, { status });
  }
}
