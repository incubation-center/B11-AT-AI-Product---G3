import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  generateStrictJson,
  readStore,
  semanticSearch,
  uniqueById,
  type DocType,
} from "@/lib/ai/rag-core";

type ExtractionOutput = {
  category: "Rental" | "SaaS" | "Utility" | "Insurance" | "Unknown";
  next_due_date: string | null;
  amount: number | null;
  notice_period: string | null;
  penalty_rules: string[];
  hidden_rules: string[];
  evidence: string[];
};

export const dynamic = "force-dynamic";

async function resolveUserId(bodyUserId?: string): Promise<string | undefined> {
  if (bodyUserId) return bodyUserId;

  const hdrs = await headers();
  const headerUserId = hdrs.get("x-user-id");
  if (headerUserId) return headerUserId;

  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user?.id;
}

const QUERIES = [
  "payment due date and invoice due clause",
  "current amount total payable charge fee",
  "notice period cancellation termination prior written notice",
  "penalty late fee auto renewal hidden clause",
];

async function runSearch(params: {
  userId?: string;
  documentId?: string;
  serviceName?: string;
  docType?: DocType;
}) {
  const results = await Promise.all(
    QUERIES.map((query) => semanticSearch({ query, topK: 4, ...params })),
  );
  return uniqueById(results.flat()).slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string;
      document_id?: string;
      service_name?: string;
      doc_type?: DocType;
    };

    const userId = await resolveUserId(body.user_id);
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "user_id is required (body, x-user-id header, or authenticated session)",
        },
        { status: 401 },
      );
    }

    // 1st attempt: use all provided filters (no default docType so all types are searched)
    let merged = await runSearch({
      userId,
      documentId: body.document_id,
      serviceName: body.service_name,
      docType: body.doc_type,
    });

    // 2nd attempt: drop service_name (stored chunks may have serviceName: null)
    if (merged.length === 0 && body.service_name) {
      merged = await runSearch({
        userId,
        documentId: body.document_id,
        docType: body.doc_type,
      });
    }

    // 3rd attempt: drop docType filter as well — just match by user/document
    if (merged.length === 0 && body.doc_type) {
      merged = await runSearch({
        userId,
        documentId: body.document_id,
      });
    }

    if (merged.length === 0) {
      const store = await readStore();
      const available = store.documents
        .filter((d) => d.userId === userId)
        .map((d) => ({
          document_id: d.id,
          filename: d.originalFilename,
          doc_type: d.docType,
          service_name: d.serviceName,
        }));
      return NextResponse.json(
        {
          error: "no_indexed_chunks_found_for_filters",
          hint: "No documents match the given filters. Use one of the document_ids below.",
          available_documents: available,
        },
        { status: 404 },
      );
    }

    const context = merged
      .map(
        (item) =>
          `[doc:${item.documentId} type:${item.docType} service:${item.serviceName ?? "unknown"} score:${item.score.toFixed(3)} chunk:${item.chunkIndex}] ${item.text}`,
      )
      .join("\n\n");

    const output = await generateStrictJson<ExtractionOutput>(
      [
        "You are extracting critical billing and contract fields from document context.",
        "Category definitions: SaaS=software/cloud subscriptions (Microsoft, Google, Adobe, Slack, Zoom, etc.),",
        "Rental=property or equipment rental, Utility=electricity/water/gas/internet/phone,",
        "Insurance=insurance policies or premiums. Use Unknown only if none fit.",
        "Return strict JSON only with this schema:",
        "{",
        '  "category":"Rental|SaaS|Utility|Insurance|Unknown",',
        '  "next_due_date":"YYYY-MM-DD or null — the payment due date or next billing date",',
        '  "amount":"number or null — total amount due including taxes",',
        '  "notice_period":"string or null — required notice period for cancellation",',
        '  "penalty_rules":"string[] — late fees, auto-renewal penalties, or []",',
        '  "hidden_rules":"string[] — auto-renewal clauses, price increase terms, or []",',
        '  "evidence":"string[] — exact quotes from the document supporting each extracted field"',
        "}",
        "Use null or [] when a field is genuinely not present in the document.",
      ].join(" "),
      context,
    );

    return NextResponse.json(output);
  } catch (error) {
    return NextResponse.json(
      {
        error: "extract_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
