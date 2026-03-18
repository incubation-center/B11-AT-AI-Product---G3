import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text: string }>;
import mammoth from "mammoth";

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

const EMBEDDING_DIM = 256;

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(apiKey);
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

async function ensureDataFiles() {
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
      // "exceeded your current quota" = daily limit hit — retrying won't help
      const isDailyQuotaExhausted = msg.includes("exceeded your current quota");
      if (isDailyQuotaExhausted) {
        throw new Error(
          "Gemini API daily quota exhausted. Please wait until midnight (PT) for it to reset, " +
            "or add billing at https://ai.dev/rate-limit to increase limits.",
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
  await ensureDataFiles();
  const raw = await readFile(VECTOR_STORE_PATH, "utf8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
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

  return {
    ...record,
    dueDate: typeof record.dueDate === "string" ? record.dueDate : null,
    usage: typeof record.usage === "number" ? record.usage : null,
    isRecurring: invoiceType === "recurring",
    invoiceType,
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
  await ensureDataFiles();
  const raw = await readFile(BILLS_PATH, "utf8");
  const parsed = JSON.parse(raw) as { records: BillRecord[] };
  return parsed.records.map((record) => normalizeBillRecord(record));
}

export async function appendBillRecord(record: BillRecord): Promise<void> {
  const records = await readBillRecords();
  records.push(normalizeBillRecord(record));
  await writeFile(BILLS_PATH, JSON.stringify({ records }, null, 2), "utf8");
}

export async function appendExecutionLog(payload: Record<string, unknown>) {
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
  if (!clean) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    start += chunkSize - overlap;
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
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await withRetry(() => model.embedContent(text));
    const values = result.embedding.values;
    if (!values || !Array.isArray(values) || values.length === 0) {
      return buildFallbackEmbedding(text);
    }
    return values;
  } catch {
    return buildFallbackEmbedding(text);
  }
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

  // Try Gemini first for OCR
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const mimeType =
      file.type === "application/pdf" ? "application/pdf" : file.type;
    const response = await withRetry(() =>
      model.generateContent([
        ocrPrompt,
        { inlineData: { mimeType, data: buffer.toString("base64") } },
      ]),
    );
    return response.response.text().trim();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isQuotaError =
      msg.includes("quota exhausted") ||
      msg.includes("exceeded your current quota");
    if (!isQuotaError) throw error;

    // Gemini quota exhausted — fall back to OpenAI Vision
    console.log(
      "⚠️  Gemini quota exhausted for OCR, falling back to OpenAI Vision...",
    );
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

  return { document, chunkCount: vectorChunks.length };
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

  return filtered
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.topK ?? 5);
}

export async function generateStrictJson<T>(
  prompt: string,
  context: string,
): Promise<T> {
  // Demo mode - return mock data for presentations
  if (process.env.DEMO_MODE === "true") {
    console.log("DEMO MODE: Returning mock data...");

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

  // Normal mode - try Gemini first, fall back to OpenAI if quota exhausted
  try {
    const client = getGeminiClient();

    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const response = await withRetry(() =>
      model.generateContent(
        `${prompt}\n\nContext:\n${context}\n\nReturn strict JSON only. Do not include markdown code fences.`,
      ),
    );

    return parseJson<T>(response.response.text());
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isQuotaError =
      msg.includes("quota exhausted") ||
      msg.includes("exceeded your current quota");

    // If quota exhausted, fall back to OpenAI/OpenRouter
    if (isQuotaError) {
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      const isOpenRouter = apiKey.startsWith("sk-or-v1");
      console.log(
        `⚠️  Gemini quota exhausted, falling back to ${isOpenRouter ? "OpenRouter" : "OpenAI"}...`,
      );

      const openai = getOpenAIClient();
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
        body.model = "gpt-3.5-turbo";
      }

      const completion = await openai.chat.completions.create(body);
      const text = completion.choices[0]?.message?.content || "{}";
      return parseJson<T>(text);
    }

    // If not a quota error, re-throw
    throw error;
  }
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
