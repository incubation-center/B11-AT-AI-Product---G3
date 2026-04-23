import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { billsTable, contractsTable } from "@/db/schema/tableSchema";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text: string }>;
import mammoth from "mammoth";

// DEMO_MODE is explicitly forbidden in production to prevent mock data leaking to real users.
if (process.env.DEMO_MODE === "true" && process.env.NODE_ENV === "production") {
  throw new Error(
    "[rag-core] DEMO_MODE=true is not allowed in NODE_ENV=production. " +
      "Remove DEMO_MODE from your production environment variables.",
  );
}

const IS_DEMO = process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";

export type DocType = "contract" | "bill" | "other";
export type InvoiceType = "recurring" | "one_time";

export type VectorChunk = {
  id: string;
  documentId: string;
  userId: string;
  serviceName: string | null;
  categoryHint: string | null;
  docType: DocType;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  userId: string;
  serviceName: string | null;
  categoryHint: string | null;
  docType: DocType;
  originalFilename: string;
  mimeType: string;
  textLength: number;
  createdAt: string;
};

export type BillRecord = {
  id: string;
  userId: string;
  serviceName: string;
  billDate: string;
  dueDate: string | null;
  amount: number;
  usage: number | null;
  isRecurring: boolean;
  invoiceType: InvoiceType;
  recurrenceStatus: "active" | "stopped";
  classificationReason: string | null;
  classificationEvidence: string[];
  classificationConfidence: number | null;
  sourceDocumentId: string | null;
  createdAt: string;
};

export type ExecutionLog = {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type StoreShape = {
  documents: DocumentRecord[];
  chunks: VectorChunk[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const VECTOR_STORE_PATH = path.join(DATA_DIR, "vector-store.json");
const BILLS_PATH = path.join(DATA_DIR, "bills.json");
const EXECUTION_LOG_PATH = path.join(DATA_DIR, "execution-log.json");

const EMBEDDING_DIM = 1536; // matches text-embedding-3-small output dimension

function normalizeDocTypeForDb(value: DocType): "contract" | "bill" | "receipt" {
  if (value === "contract" || value === "bill") return value;
  return "receipt";
}

function normalizeCategoryForDb(
  value: string | null,
): "rental" | "saas" | "utility" | "insurance" | "internet" | "other" | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "rental" ||
    normalized === "saas" ||
    normalized === "utility" ||
    normalized === "insurance" ||
    normalized === "internet" ||
    normalized === "other"
  ) {
    return normalized;
  }
  return null;
}

async function persistDocumentToDb(params: {
  id: string;
  userId: string;
  serviceName: string | null;
  categoryHint: string | null;
  docType: DocType;
  originalFilename: string;
  mimeType: string;
  textLength: number;
  extractedText: string;
  chunkCount: number;
  createdAtIso: string;
}) {
  if (!process.env.DATABASE_URL) return;

  const existing = await db
    .select({ id: contractsTable.id })
    .from(contractsTable)
    .where(eq(contractsTable.id, params.id))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(contractsTable).values({
    id: params.id,
    userId: params.userId,
    serviceName: params.serviceName ?? params.originalFilename,
    category: normalizeCategoryForDb(params.categoryHint),
    docType: normalizeDocTypeForDb(params.docType),
    originalFilename: params.originalFilename,
    mimeType: params.mimeType || null,
    fileKey: `local:data/vector-store.json#${params.id}`,
    textLength: params.textLength,
    rawText: params.extractedText,
    pineconeNamespace: null,
    chunksIndexed: params.chunkCount,
    createdAt: new Date(params.createdAtIso),
    updatedAt: new Date(params.createdAtIso),
  });
}

async function persistBillToDb(record: BillRecord) {
  if (!process.env.DATABASE_URL) return;

  const normalized = normalizeBillRecord(record);
  const existing = await db
    .select({ id: billsTable.id })
    .from(billsTable)
    .where(eq(billsTable.id, normalized.id))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(billsTable).values({
    id: normalized.id,
    contractId: normalized.sourceDocumentId,
    userId: normalized.userId,
    serviceName: normalized.serviceName,
    amount: normalized.amount.toFixed(2),
    currency: "USD",
    billDate: new Date(normalized.billDate),
    dueDate: normalized.dueDate ? new Date(normalized.dueDate) : null,
    usage: typeof normalized.usage === "number" ? normalized.usage.toFixed(2) : null,
    usageUnit: null,
    sourceDocumentId: normalized.sourceDocumentId,
    metadata: {
      invoiceType: normalized.invoiceType,
      isRecurring: normalized.isRecurring,
      classificationReason: normalized.classificationReason,
      classificationEvidence: normalized.classificationEvidence,
      classificationConfidence: normalized.classificationConfidence,
    },
    isPaid: false,
    paidAt: null,
    createdAt: new Date(normalized.createdAt),
  });
}


function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  // Use OpenRouter if the key starts with sk-or-v1
  if (apiKey.startsWith("sk-or-v1")) {
    return new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Bill Analysis App",
      },
    });
  }
  return new OpenAI({ apiKey });
}

const USE_DB = !!process.env.DATABASE_URL;

async function ensureDataFiles() {
  if (USE_DB) return;
  await mkdir(DATA_DIR, { recursive: true });

  await Promise.all([
    ensureFile(VECTOR_STORE_PATH, { documents: [], chunks: [] }),
    ensureFile(BILLS_PATH, { records: [] }),
    ensureFile(EXECUTION_LOG_PATH, { records: [] }),
  ]);
}

async function ensureFile(filePath: string, defaultPayload: unknown) {
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultPayload, null, 2), "utf8");
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is503 =
        msg.includes("503") ||
        msg.includes("high demand") ||
        msg.includes("overloaded");
      const is429 = msg.includes("429") || msg.includes("Too Many Requests");
      const isDailyQuotaExhausted = msg.includes("exceeded your current quota");
      if (isDailyQuotaExhausted) {
        throw new Error(
          "OpenAI API quota exhausted. Check your usage limits at https://platform.openai.com/usage.",
        );
      }
      if ((!is503 && !is429) || attempt === maxRetries - 1) throw err;
      // Respect the retry-delay header hint if present, otherwise exponential backoff
      const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
      const baseWait = retryMatch
        ? Math.ceil(parseFloat(retryMatch[1])) * 1000
        : 1000 * Math.pow(2, attempt + 1); // 2s, 4s, 8s, 16s
      await new Promise((r) => setTimeout(r, baseWait));
    }
  }
  throw new Error("Max retries exceeded");
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function parseJson<T>(value: string): T {
  return JSON.parse(stripCodeFence(value)) as T;
}

export async function readStore(): Promise<StoreShape> {
  if (USE_DB) return { documents: [], chunks: [] };
  await ensureDataFiles();
  const raw = await readFile(VECTOR_STORE_PATH, "utf8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
  if (USE_DB) return;
  await writeFile(VECTOR_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalizeInvoiceType(value: unknown): InvoiceType | null {
  return value === "recurring" || value === "one_time" ? value : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value >= 0 && value <= 1) {
    return Number(value.toFixed(2));
  }
  if (value > 1 && value <= 100) {
    return Number((value / 100).toFixed(2));
  }
  return null;
}

function normalizeBillRecord(record: BillRecord): BillRecord {
  const invoiceType =
    normalizeInvoiceType(record.invoiceType) ??
    (record.isRecurring === false ? "one_time" : "recurring");

  const recurrenceStatus: "active" | "stopped" =
    (record as BillRecord & { recurrenceStatus?: string }).recurrenceStatus === "stopped"
      ? "stopped"
      : "active";

  return {
    ...record,
    dueDate: typeof record.dueDate === "string" ? record.dueDate : null,
    usage: typeof record.usage === "number" ? record.usage : null,
    isRecurring: invoiceType === "recurring",
    invoiceType,
    recurrenceStatus,
    classificationReason:
      typeof record.classificationReason === "string"
        ? record.classificationReason
        : null,
    classificationEvidence: Array.isArray(record.classificationEvidence)
      ? record.classificationEvidence.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    classificationConfidence: normalizeConfidence(
      record.classificationConfidence,
    ),
    sourceDocumentId:
      typeof record.sourceDocumentId === "string" ? record.sourceDocumentId : null,
  };
}

export async function readBillRecords(): Promise<BillRecord[]> {
  if (USE_DB) {
    const rows = await db.select().from(billsTable);
    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return normalizeBillRecord({
        id: row.id,
        userId: row.userId,
        serviceName: row.serviceName,
        billDate: row.billDate.toISOString().slice(0, 10),
        dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
        amount: parseFloat(row.amount),
        usage: row.usage ? parseFloat(row.usage) : null,
        isRecurring: (meta.isRecurring as boolean) ?? false,
        invoiceType: (meta.invoiceType as InvoiceType) ?? "one_time",
        recurrenceStatus: (meta.recurrenceStatus as "active" | "stopped") ?? "active",
        classificationReason: (meta.classificationReason as string) ?? null,
        classificationEvidence: (meta.classificationEvidence as string[]) ?? [],
        classificationConfidence: (meta.classificationConfidence as number) ?? null,
        sourceDocumentId: row.sourceDocumentId ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    });
  }
  await ensureDataFiles();
  const raw = await readFile(BILLS_PATH, "utf8");
  const parsed = JSON.parse(raw) as { records: BillRecord[] };
  return parsed.records.map((record) => normalizeBillRecord(record));
}

export async function appendBillRecord(record: BillRecord): Promise<void> {
  const normalized = normalizeBillRecord(record);

  if (!USE_DB) {
    const records = await readBillRecords();
    records.push(normalized);
    await writeFile(BILLS_PATH, JSON.stringify({ records }, null, 2), "utf8");
  }

  try {
    await persistBillToDb(normalized);
  } catch (error) {
    console.error("Failed to persist bill record to DB:", error);
  }
}

async function syncBillUpdateToDb(record: BillRecord): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await db
      .update(billsTable)
      .set({
        dueDate: record.dueDate ? new Date(record.dueDate) : null,
        metadata: {
          invoiceType: record.invoiceType,
          isRecurring: record.isRecurring,
          recurrenceStatus: record.recurrenceStatus,
          classificationReason: record.classificationReason,
          classificationEvidence: record.classificationEvidence,
          classificationConfidence: record.classificationConfidence,
        },
      })
      .where(eq(billsTable.id, record.id));
  } catch (error) {
    console.error("Failed to sync bill update to DB:", error);
  }
}

export async function updateBillRecord(
  id: string,
  patch: Partial<BillRecord>,
): Promise<BillRecord | null> {
  const records = await readBillRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = normalizeBillRecord({ ...records[idx], ...patch });

  if (!USE_DB) {
    await writeFile(BILLS_PATH, JSON.stringify({ records }, null, 2), "utf8");
  }

  await syncBillUpdateToDb(records[idx]);
  return records[idx];
}

function advanceDateByOneMonth(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function advanceRecurringBills(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const records = await readBillRecords();
  let advanced = 0;

  const updated = records.map((bill) => {
    if (
      bill.isRecurring &&
      bill.recurrenceStatus !== "stopped" &&
      bill.dueDate &&
      bill.dueDate <= today
    ) {
      advanced++;
      return normalizeBillRecord({
        ...bill,
        dueDate: advanceDateByOneMonth(bill.dueDate),
      });
    }
    return bill;
  });

  if (advanced > 0) {
    if (!USE_DB) {
      await writeFile(BILLS_PATH, JSON.stringify({ records: updated }, null, 2), "utf8");
    }
    await Promise.all(
      updated
        .filter((b) => b.isRecurring && b.recurrenceStatus !== "stopped")
        .map((b) => syncBillUpdateToDb(b).catch(() => null)),
    );
  }

  return advanced;
}

export async function appendExecutionLog(payload: Record<string, unknown>) {
  if (USE_DB) return;
  await ensureDataFiles();
  const raw = await readFile(EXECUTION_LOG_PATH, "utf8");
  const parsed = JSON.parse(raw) as { records: ExecutionLog[] };
  parsed.records.push({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
  });
  await writeFile(EXECUTION_LOG_PATH, JSON.stringify(parsed, null, 2), "utf8");
}

export function splitTextIntoChunks(
  text: string,
  chunkSize = 1200,
  overlap = 200,
): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];

  // Split at paragraph boundaries to respect semantic units
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= chunkSize) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) {
        chunks.push(current);
        const overlapText = current.slice(-overlap);
        current = overlapText ? `${overlapText}\n\n${para}` : para;
      } else {
        // Paragraph alone exceeds chunkSize — split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) ?? [para];
        let sentBuf = "";
        for (const sent of sentences) {
          if (sentBuf.length + sent.length <= chunkSize) {
            sentBuf += sent;
          } else {
            if (sentBuf) chunks.push(sentBuf.trim());
            sentBuf = sent;
          }
        }
        current = sentBuf;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());

  // Final fallback: if no splits happened, character-slice
  if (chunks.length === 0) {
    let start = 0;
    while (start < clean.length) {
      chunks.push(clean.slice(start, start + chunkSize));
      start += chunkSize - overlap;
    }
  }

  return chunks;
}

function buildFallbackEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const idx = hash[0] % EMBEDDING_DIM;
    vec[idx] += 1;
  }

  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

export async function embedText(text: string): Promise<number[]> {
  // In demo mode there is no API key — hash embedding is acceptable because
  // all retrieval is illustrative and no real documents are indexed.
  if (IS_DEMO) {
    return buildFallbackEmbedding(text);
  }

  const openai = getOpenAIClient();
  const response = await withRetry(() =>
    openai.embeddings.create({ model: "text-embedding-3-small", input: text }),
  );
  const values = response.data[0]?.embedding;

  if (!values || values.length === 0) {
    throw new Error(
      "[embedText] OpenAI returned an empty embedding vector. Document indexing and search cannot proceed.",
    );
  }

  return values;
}

async function embedChunksBatched(
  chunks: string[],
  batchSize = 5,
  delayMs = 500,
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((chunk) => embedText(chunk)),
    );
    results.push(...batchResults);
    if (i + batchSize < chunks.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB) || 1;
  return dot / denom;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function extractTextFromFileWithLayout(
  file: File,
  includeClassification = false,
): Promise<string> {
  const allowed = [
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    ...IMAGE_TYPES,
  ];
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported formats: .txt, .pdf, .docx, .doc, .png, .jpg, .webp`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // TXT — read directly, zero API calls
  if (file.type === "text/plain") {
    return await file.text();
  }

  // PDF — extract locally with pdf-parse first
  if (file.type === "application/pdf") {
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();

    // If enough text was extracted, it's a text-based PDF — use it directly
    if (text.length >= 150) {
      return appendClassificationHint(text, includeClassification);
    }

    // Text too short — PDF is likely image-based, needs AI OCR
    console.log(
      "PDF appears to be image-based (text_length < 150), attempting AI OCR...",
    );
  }

  // DOCX / DOC — extract locally with mammoth, zero API calls
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return appendClassificationHint(result.value.trim(), includeClassification);
  }

  // Images and image-based PDFs — use AI for OCR
  const classifyPart = includeClassification
    ? [
        "\n\nAfter the extracted text, add a classification block in this exact format:",
        "---CLASSIFICATION---",
        '{"doc_type":"bill or contract or other","service_name":"company name or null","category":"Rental or SaaS or Utility or Insurance or Telecom or Other or null"}',
        "---END---",
        "doc_type should be 'bill' for invoices/bills/receipts/statements, 'contract' for agreements/terms, 'other' otherwise.",
      ].join("\n")
    : "";

  const ocrPrompt =
    "Extract all visible text from this document while preserving reading order, table structure, line-item relationships, section headers, and small-footnote clauses. Return plain text only." +
    classifyPart;

  const openai = getOpenAIClient();

  // For PDFs: use GPT-4o with file input; for images: use vision
  if (file.type === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await (openai.chat.completions.create as any)({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ocrPrompt },
            {
              type: "file",
              file: {
                filename: file.name,
                file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  } else {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ocrPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${buffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  }
}

function appendClassificationHint(
  text: string,
  includeClassification: boolean,
): string {
  if (!includeClassification) return text;
  const lower = text.toLowerCase();
  const isBill =
    /invoice|receipt|bill|statement|amount\s*due|total\s*due|grand\s*total/i.test(
      lower,
    );
  const docType = isBill ? "bill" : "contract";
  // Attempt to guess a service name from common patterns
  const serviceMatch = text.match(
    /(?:from|provider|company|service)[\s:]+([A-Z][A-Za-z0-9 &.,'-]{2,40})/,
  );
  const serviceName = serviceMatch ? serviceMatch[1].trim() : null;
  const classificationBlock = [
    "",
    "---CLASSIFICATION---",
    JSON.stringify({
      doc_type: docType,
      service_name: serviceName,
      category: null,
    }),
    "---END---",
  ].join("\n");
  return text + classificationBlock;
}

export async function indexDocument(params: {
  userId: string;
  serviceName: string | null;
  categoryHint: string | null;
  docType: DocType;
  originalFilename: string;
  mimeType: string;
  extractedText: string;
}): Promise<{ document: DocumentRecord; chunkCount: number }> {
  const store = await readStore();
  const now = new Date().toISOString();
  const documentId = randomUUID();

  const document: DocumentRecord = {
    id: documentId,
    userId: params.userId,
    serviceName: params.serviceName,
    categoryHint: params.categoryHint,
    docType: params.docType,
    originalFilename: params.originalFilename,
    mimeType: params.mimeType,
    textLength: params.extractedText.length,
    createdAt: now,
  };

  const chunks = splitTextIntoChunks(params.extractedText);
  const vectors = await embedChunksBatched(chunks);
  const vectorChunks: VectorChunk[] = chunks.map((chunk, index) => ({
    id: randomUUID(),
    documentId,
    userId: params.userId,
    serviceName: params.serviceName,
    categoryHint: params.categoryHint,
    docType: params.docType,
    chunkIndex: index,
    text: chunk,
    embedding: vectors[index],
    createdAt: now,
  }));

  store.documents.push(document);
  store.chunks.push(...vectorChunks);
  await writeStore(store);

  try {
    await persistDocumentToDb({
      id: document.id,
      userId: params.userId,
      serviceName: params.serviceName,
      categoryHint: params.categoryHint,
      docType: params.docType,
      originalFilename: params.originalFilename,
      mimeType: params.mimeType,
      textLength: document.textLength,
      extractedText: params.extractedText,
      chunkCount: vectorChunks.length,
      createdAtIso: now,
    });
  } catch (error) {
    console.error("Failed to persist document to DB:", error);
  }

  return { document, chunkCount: vectorChunks.length };
}

// Returns a 0-1 score based on what fraction of meaningful query terms appear in text.
function keywordScore(query: string, text: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return 0;
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length / terms.length;
}

// Reranks candidates by boosting chunks with higher query-term density.
function rerank(
  candidates: Array<VectorChunk & { score: number }>,
  query: string,
): Array<VectorChunk & { score: number }> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return candidates;

  return candidates
    .map((c) => {
      const lower = c.text.toLowerCase();
      const density =
        terms.reduce((sum, t) => {
          const matches = (lower.match(new RegExp(t, "g")) ?? []).length;
          return sum + matches;
        }, 0) / Math.max(c.text.length / 100, 1);
      return { ...c, score: c.score + density * 0.05 };
    })
    .sort((a, b) => b.score - a.score);
}

export async function semanticSearch(params: {
  query: string;
  topK?: number;
  userId?: string;
  documentId?: string;
  serviceName?: string;
  docType?: DocType;
}): Promise<Array<VectorChunk & { score: number }>> {
  const store = await readStore();
  const queryVector = await embedText(params.query);
  let filtered = store.chunks;

  if (params.userId) {
    filtered = filtered.filter((chunk) => chunk.userId === params.userId);
  }
  if (params.documentId) {
    filtered = filtered.filter(
      (chunk) => chunk.documentId === params.documentId,
    );
  }
  if (params.serviceName) {
    const target = params.serviceName.toLowerCase();
    filtered = filtered.filter(
      (chunk) => (chunk.serviceName ?? "").toLowerCase() === target,
    );
  }
  if (params.docType) {
    filtered = filtered.filter((chunk) => chunk.docType === params.docType);
  }

  const topK = params.topK ?? 5;

  // Hybrid scoring: 70% semantic + 30% keyword overlap
  const scored = filtered
    .map((chunk) => ({
      ...chunk,
      score:
        0.7 * cosineSimilarity(queryVector, chunk.embedding) +
        0.3 * keywordScore(params.query, chunk.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 3); // fetch wider candidate set for reranking

  return rerank(scored, params.query).slice(0, topK);
}

export async function generateStrictJson<T>(
  prompt: string,
  context: string,
): Promise<T> {
  // Demo mode - return mock data for presentations (never runs in production)
  if (IS_DEMO) {
    console.warn("[rag-core] DEMO_MODE active — returning mock extraction data. NOT for production use.");

    // Detect what type of request based on prompt keywords
    const promptLower = prompt.toLowerCase();

    // Extract request (from /api/extract)
    if (promptLower.includes("extract") && promptLower.includes("billing")) {
      return {
        category: "SaaS",
        next_due_date: "2026-04-15",
        amount: 79.99,
        notice_period: "30 days prior written notice",
        penalty_rules: [
          "Late payment fee of $15 after 10 days",
          "Service suspension after 30 days of non-payment",
        ],
        hidden_rules: [
          "Auto-renewal unless cancelled 30 days before billing cycle",
          "Price increase clause: up to 10% annually with 30 days notice",
        ],
        evidence: [
          "Payment due on the 15th of each month",
          "Cancellation requires 30 days written notice",
          "Automatic renewal applies unless cancelled",
        ],
      } as T;
    }

    // Anomaly detection request (from /api/detect-anomaly)
    if (promptLower.includes("detect") && promptLower.includes("anomaly")) {
      return {
        is_anomaly: true,
        previous_amount: 75.0,
        current_amount: 95.0,
        change_percent: 26.67,
        cause_type: "rate_change",
        cause_summary:
          "Price increase detected. Current bill is 26.67% higher than previous month. Contract clause allows up to 10% annual price adjustment with 30 days notice.",
        contract_evidence: [
          "Pricing subject to annual review and adjustment",
          "Supplier reserves the right to increase rates with 30 days written notice",
          "Base rate: $75/month, subject to change",
        ],
      } as T;
    }

    // Bill extraction (from /api/ingest for bills)
    if (promptLower.includes("amount") || promptLower.includes("due_date")) {
      return {
        amount: "95.00",
        due_date: "2026-04-15",
        bill_date: "2026-03-15",
        usage: 850,
        invoice_type: "recurring",
        invoice_type_reason:
          "The invoice includes a monthly billing period for an ongoing service.",
        invoice_type_evidence: [
          "Monthly service fee",
          "Billing period: Mar 2026",
          "Renews on Apr 15, 2026",
        ],
        invoice_type_confidence: 0.93,
      } as T;
    }

    // Fallback generic response
    return {} as T;
  }

  const openai = getOpenAIClient();
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const isOpenRouter = apiKey.startsWith("sk-or-v1");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that extracts structured data. Always return valid JSON only, without markdown code fences.",
      },
      {
        role: "user",
        content: `${prompt}\n\nContext:\n${context}`,
      },
    ],
    temperature: 0.2,
  };

  if (isOpenRouter) {
    body.model = "meta-llama/llama-3.2-3b-instruct:free";
    body.models = [
      "meta-llama/llama-3.2-3b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free",
    ];
  } else {
    body.model = "gpt-4o-mini";
  }

  const completion = await openai.chat.completions.create(body);
  const text = completion.choices[0]?.message?.content || "{}";
  return parseJson<T>(text);
}

export function parseLooseMoney(value: string): number | null {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function parseLikelyDate(value: string): string | null {
  const iso = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) {
    return iso[0];
  }
  const slash = value.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
  if (!slash) {
    return null;
  }
  const dt = new Date(slash[0]);
  if (Number.isNaN(dt.getTime())) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
