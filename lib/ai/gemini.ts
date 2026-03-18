// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,
  },
});

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,
  },
});

export async function extractStructuredData<T = unknown>(
  prompt: string,
  context: string,
): Promise<T> {
  try {
    const fullPrompt = `${prompt}\n\nContext:\n${context}`;
    const result = await geminiPro.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Gemini extraction error:", error);
    throw new Error("Failed to extract structured data from document");
  }
}

/**
 * Analyze contract for hidden clauses
 */
export async function analyzeContract(contractText: string) {
  const prompt = `
You are a contract analysis expert. Extract the following information from this contract:

Return ONLY valid JSON with this structure:
{
  "category": "rental" | "saas" | "utility" | "insurance" | "internet" | "other",
  "serviceName": "string",
  "amount": number,
  "currency": "USD" | "EUR" | etc,
  "billingCycle": "monthly" | "annually" | "quarterly",
  "nextDueDate": "YYYY-MM-DD" or null,
  "noticePeriod": number (days required before cancellation),
  "penaltyRules": [
    {
      "condition": "string",
      "penalty": "string or number",
      "description": "string"
    }
  ],
  "autoRenewal": boolean,
  "hiddenFees": [
    {
      "name": "string",
      "amount": number or "string",
      "trigger": "string"
    }
  ],
  "confidence": number (0-100)
}

Focus on finding:
1. Cancellation notice periods
2. Early termination penalties
3. Automatic renewal clauses  
4. Hidden fees or charges
5. Rate increase terms

Contract:
`;

  return extractStructuredData(prompt, contractText);
}

/**
 * Analyze billing anomaly
 */
export async function analyzeBillAnomaly(
  currentBill: { amount: number; billDate: string; usage?: number },
  historicalBills: Array<{ amount: number; billDate: string; usage?: number }>,
  contractClauses: string[],
) {
  const prompt = `
You are a billing analyst. Analyze this potential anomaly:

CURRENT BILL:
Amount: $${currentBill.amount}
Date: ${currentBill.billDate}
${currentBill.usage ? `Usage: ${currentBill.usage}` : ""}

HISTORICAL BILLS (last 6 months):
${historicalBills.map((b) => `- $${b.amount} on ${b.billDate}${b.usage ? ` (${b.usage} units)` : ""}`).join("\n")}

RELEVANT CONTRACT CLAUSES:
${contractClauses.join("\n---\n")}

Determine:
1. Is this a legitimate rate change per contract?
2. Is this usage-based?
3. Is this suspicious/unexpected?

Return ONLY valid JSON:
{
  "isAnomaly": boolean,
  "type": "usage_spike" | "rate_change" | "suspicious_fee" | "legitimate",
  "confidence": number (0-100),
  "explanation": "string (2-3 sentences)",
  "expectedAmount": number,
  "deviationPercent": number,
  "suggestedAction": "contact_provider" | "dispute" | "cancel" | "monitor" | "none",
  "reasoning": "string (why you reached this conclusion)"
}
`;

  return extractStructuredData(prompt, "");
}

/**
 * Generate cancellation letter
 */
export async function generateCancellationLetter(
  serviceName: string,
  accountInfo: Record<string, unknown>,
  reason: string,
) {
  const prompt = `
Generate a professional service cancellation letter.

Service: ${serviceName}
Account: ${JSON.stringify(accountInfo)}
Reason: ${reason}

Return ONLY valid JSON:
{
  "letterContent": "string (full letter text)",
  "subject": "string (email subject line)",
  "tone": "formal" | "firm" | "polite",
  "additionalSteps": ["array of strings with next steps"]
}
`;

  return extractStructuredData(prompt, "");
}


const geminiClient = {
  geminiPro,
  geminiFlash,
  extractStructuredData,
  analyzeContract,
  analyzeBillAnomaly,
  generateCancellationLetter,
};

export default geminiClient;
