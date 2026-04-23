import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { billsTable, contractsTable } from "@/db/schema/tableSchema";

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
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (doc.userId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (process.env.DATABASE_URL) {
      const dbDoc = await db
        .select({ id: contractsTable.id, userId: contractsTable.userId })
        .from(contractsTable)
        .where(eq(contractsTable.id, id))
        .limit(1);

      if (dbDoc.length > 0 && dbDoc[0].userId !== userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    // Compute all mutations in memory before touching any store
    const newStore = {
      ...store,
      documents: store.documents.filter((d) => d.id !== id),
      chunks: store.chunks.filter((c) => c.documentId !== id),
    };
    const newBillsStore = {
      ...billsStore,
      records: billsStore.records.filter((b) => b.sourceDocumentId !== id),
    };

    // Write JSON files sequentially so a failure on the first prevents the second
    await writeFile(VECTOR_STORE_PATH, JSON.stringify(newStore, null, 2), "utf8");
    await writeFile(BILLS_PATH, JSON.stringify(newBillsStore, null, 2), "utf8");

    // DB deletes run inside a transaction so both succeed or both roll back
    if (process.env.DATABASE_URL) {
      await db.transaction(async (tx) => {
        await tx.delete(billsTable).where(eq(billsTable.sourceDocumentId, id));
        await tx
          .delete(contractsTable)
          .where(and(eq(contractsTable.id, id), eq(contractsTable.userId, userId)));
      });
    }

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
