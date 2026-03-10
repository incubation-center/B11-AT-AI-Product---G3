import { NextResponse } from "next/server";
import {
  generateStrictJson,
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string;
      document_id?: string;
      service_name?: string;
      doc_type?: DocType;
    };

    const queries = [
      "payment due date and invoice due clause",
      "current amount total payable charge fee",
      "notice period cancellation termination prior written notice",
      "penalty late fee auto renewal hidden clause",
    ];

    const results = await Promise.all(
      queries.map((query) =>
        semanticSearch({
          query,
          topK: 4,
          userId: body.user_id,
          documentId: body.document_id,
          serviceName: body.service_name,
          docType: body.doc_type ?? "contract",
        }),
      ),
    );

    const merged = uniqueById(results.flat()).slice(0, 10);
    if (merged.length === 0) {
      return NextResponse.json(
        { error: "no_indexed_chunks_found_for_filters" },
        { status: 404 },
      );
    }

    const context = merged
      .map(
        (item) =>
          `[doc:${item.documentId} score:${item.score.toFixed(3)} chunk:${item.chunkIndex}] ${item.text}`,
      )
      .join("\n\n");

    const output = await generateStrictJson<ExtractionOutput>(
      [
        "You are extracting critical billing/contract fields.",
        "Return strict JSON only with this schema:",
        "{",
        '  "category":"Rental|SaaS|Utility|Insurance|Unknown",',
        '  "next_due_date":"YYYY-MM-DD|null",',
        '  "amount":"number|null",',
        '  "notice_period":"string|null",',
        '  "penalty_rules":"string[]",',
        '  "hidden_rules":"string[]",',
        '  "evidence":"string[]"',
        "}",
        "Use only context evidence.",
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
