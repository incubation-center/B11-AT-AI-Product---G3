import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const VECTOR_STORE_PATH = path.join(DATA_DIR, "vector-store.json");
const BILLS_PATH = path.join(DATA_DIR, "bills.json");

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!id) {
      return NextResponse.json(
        { error: "document id is required" },
        { status: 400 },
      );
    }

    // Read stores
    const [storeRaw, billsRaw] = await Promise.all([
      readFile(VECTOR_STORE_PATH, "utf8"),
      readFile(BILLS_PATH, "utf8"),
    ]);

    const store = JSON.parse(storeRaw) as {
      documents: Array<{ id: string; userId: string }>;
      chunks: Array<{ documentId: string }>;
    };
    const billsStore = JSON.parse(billsRaw) as {
      records: Array<{ sourceDocumentId: string | null; userId: string }>;
    };

    // Security: only allow deleting own documents
    const doc = store.documents.find((d) => d.id === id);
    if (!doc) {
      return NextResponse.json(
        { error: "document_not_found" },
        { status: 404 },
      );
    }
    if (userId && doc.userId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Remove document, its chunks, and any linked bill records
    store.documents = store.documents.filter((d) => d.id !== id);
    store.chunks = store.chunks.filter((c) => c.documentId !== id);
    billsStore.records = billsStore.records.filter(
      (b) => b.sourceDocumentId !== id,
    );

    await Promise.all([
      writeFile(VECTOR_STORE_PATH, JSON.stringify(store, null, 2), "utf8"),
      writeFile(BILLS_PATH, JSON.stringify(billsStore, null, 2), "utf8"),
    ]);

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return NextResponse.json(
      {
        error: "delete_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
