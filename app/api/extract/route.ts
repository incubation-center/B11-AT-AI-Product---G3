import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/get-authenticated-user-id";
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

const QUERIES = [
  "payment due date and invoice due clause",
  "current amount total payable charge fee",
  "notice period cancellation termination prior written notice",
  "penalty late fee auto renewal hidden clause",
];

// A chunk below this cosine score is likely unrelated noise.
const MIN_CHUNK_SCORE = 0.25;
// A retrieval whose average score is below this should be treated as low-confidence.
const LOW_CONFIDENCE_AVG_SCORE = 0.35;

type RetrievalTier = "exact" | "relaxed_service" | "relaxed_type";
type Chunk = Awaited<ReturnType<typeof semanticSearch>>[number];

async function runSearch(
  params: {
    userId?: string;
    documentId?: string;
    serviceName?: string;
    docType?: DocType;
  },
  topK: number,
): Promise<Chunk[]> {
  const results = await Promise.all(
    QUERIES.map((query) => semanticSearch({ query, topK, ...params })),
  );
  return uniqueById(results.flat())
    .filter((c) => c.score >= MIN_CHUNK_SCORE)
    .sort((a, b) => b.score - a.score);
}

async function retrieveWithTiering(
  userId: string,
  body: { document_id?: string; service_name?: string; doc_type?: DocType },
): Promise<{ chunks: Chunk[]; tier: RetrievalTier } | null> {
  // Tier 1: all filters applied, widest topK
  const exact = await runSearch(
    {
      userId,
      documentId: body.document_id,
      serviceName: body.service_name,
      docType: body.doc_type,
    },
    4,
  );
  if (exact.length > 0) return { chunks: exact.slice(0, 10), tier: "exact" };

  // Tier 2: drop service filter, narrow topK so weak matches don't dominate
  if (body.service_name) {
    const relaxed = await runSearch(
      { userId, documentId: body.document_id, docType: body.doc_type },
      3,
    );
    if (relaxed.length > 0) {
      return { chunks: relaxed.slice(0, 6), tier: "relaxed_service" };
    }
  }

  // Tier 3: drop docType too, narrowest topK
  if (body.doc_type) {
    const relaxed = await runSearch(
      { userId, documentId: body.document_id },
      3,
    );
    if (relaxed.length > 0) {
      return { chunks: relaxed.slice(0, 5), tier: "relaxed_type" };
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      document_id?: string;
      service_name?: string;
      doc_type?: DocType;
    };

    const retrieval = await retrieveWithTiering(userId, body);

    if (!retrieval) {
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

    const { chunks, tier } = retrieval;
    const averageScore =
      chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
    const isLowConfidence =
      tier !== "exact" || averageScore < LOW_CONFIDENCE_AVG_SCORE;

    const context = chunks
      .map(
        (item) =>
          `[doc:${item.documentId} type:${item.docType} service:${item.serviceName ?? "unknown"} score:${item.score.toFixed(3)} chunk:${item.chunkIndex}] ${item.text}`,
      )
      .join("\n\n");

    const strictnessHint = isLowConfidence
      ? " The retrieved context is broadened or has low average similarity — prefer null / [] over guessing when a field is not clearly supported by an exact quote."
      : "";

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
        "Use null or [] when a field is genuinely not present in the document." +
          strictnessHint,
      ].join(" "),
      context,
    );

    return NextResponse.json({
      ...output,
      retrieval_metadata: {
        tier,
        chunk_count: chunks.length,
        average_score: Number(averageScore.toFixed(3)),
        confidence: isLowConfidence ? "low" : "high",
      },
    });
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
