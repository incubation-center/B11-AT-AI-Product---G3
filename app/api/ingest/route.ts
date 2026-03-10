import { NextResponse } from "next/server";
import {
  appendBillRecord,
  generateStrictJson,
  indexDocument,
  extractTextFromFileWithLayout,
  parseLikelyDate,
  parseLooseMoney,
} from "@/lib/ai/rag-core";

type BillExtraction = {
  amount: string | null;
  due_date: string | null;
  usage: number | null;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required (multipart/form-data)" },
        { status: 400 },
      );
    }

    const userId = String(form.get("user_id") ?? "demo-user");
    const serviceNameRaw = form.get("service_name");
    const serviceName = serviceNameRaw ? String(serviceNameRaw) : null;
    const categoryHintRaw = form.get("category_hint");
    const categoryHint = categoryHintRaw ? String(categoryHintRaw) : null;
    const docTypeRaw = String(form.get("doc_type") ?? "contract").toLowerCase();
    const docType = ["contract", "bill", "other"].includes(docTypeRaw)
      ? (docTypeRaw as "contract" | "bill" | "other")
      : "contract";

    const extractedText = await extractTextFromFileWithLayout(file);
    const indexed = await indexDocument({
      userId,
      serviceName,
      categoryHint,
      docType,
      originalFilename: file.name,
      mimeType: file.type,
      extractedText,
    });

    let billRecord = null;
    if (docType === "bill" && serviceName) {
      try {
        const billData = await generateStrictJson<BillExtraction>(
          [
            "Extract bill information from the context.",
            "Return keys: amount (string), due_date (YYYY-MM-DD|string|null), usage (number|null).",
            "If missing, return null.",
          ].join(" "),
          extractedText.slice(0, 14000),
        );

        const amount = billData.amount ? parseLooseMoney(billData.amount) : null;
        const dueDate = billData.due_date ? parseLikelyDate(billData.due_date) : null;
        const usage = typeof billData.usage === "number" ? billData.usage : null;

        if (amount !== null) {
          billRecord = {
            id: crypto.randomUUID(),
            userId,
            serviceName,
            billDate: new Date().toISOString().slice(0, 10),
            dueDate,
            amount,
            usage,
            sourceDocumentId: indexed.document.id,
            createdAt: new Date().toISOString(),
          };
          await appendBillRecord(billRecord);
        }
      } catch {
        billRecord = null;
      }
    }

    return NextResponse.json({
      status: "indexed",
      document_id: indexed.document.id,
      user_id: indexed.document.userId,
      service_name: indexed.document.serviceName,
      doc_type: indexed.document.docType,
      chunks_indexed: indexed.chunkCount,
      text_length: indexed.document.textLength,
      bill_record: billRecord,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "ingest_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
