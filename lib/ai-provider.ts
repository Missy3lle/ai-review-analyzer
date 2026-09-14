// lib/ai-provider.ts
//
// This is the "abstraction layer" mentioned in the project plan.
//
// The rest of the app never talks to Gemini directly — it only ever
// calls the one function exported from this file: analyzeWithAI().
// That function is the ONLY place that knows which AI provider is
// actually being used. If we ever switch to OpenAI, Groq, or anything
// else, this is the only file that needs to change.

import type { AnalysisResult } from "./analyzer";

export type Tone = "Professional" | "Friendly" | "Apologetic";

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  Professional: "Write in a polished, businesslike tone — courteous but not overly warm.",
  Friendly: "Write in a warm, casual, upbeat tone, like a friendly small-business owner talking directly to a customer.",
  Apologetic: "Write in a tone that leads with sincere apology and accountability, even for a positive review's minor complaint.",
};

function buildPrompt(review: string, tone: Tone): string {
  return `You are analyzing a customer review for a business. Read the review and respond with ONLY valid JSON (no markdown, no explanation) in exactly this shape:

{
  "sentiment": "Positive" | "Negative" | "Mixed" | "Neutral",
  "positiveThemes": string[],
  "negativeThemes": string[],
  "suggestedResponse": string,
  "priority": "High" | "Medium" | "Low"
}

Rules:
- Themes should be short, specific topics actually mentioned in the review (e.g. "check-in speed", "room cleanliness", "cake flavor"), not generic categories. Invent whatever theme names fit the review — do not limit yourself to a fixed list.
- Do not invent themes that weren't mentioned.
- suggestedResponse should be a short reply a real business owner could send as-is. ${TONE_INSTRUCTIONS[tone]}
- This app is used by many different kinds of small businesses (bakeries, hotels, cafes, etc.) — do not assume the business type; infer it from the review itself.
- priority reflects how urgently a business owner should personally respond, based on how serious the customer's concern is (e.g. a health/safety complaint or a customer who says they won't return is High; a minor gripe in an otherwise positive review is Low). This is a business-response urgency judgment, not just a copy of the sentiment.

Review:
"""
${review}
"""`;
}

async function callGemini(review: string, tone: Tone): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env.local");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(review, tone) }] }],
        generationConfig: { temperature: 0.4 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini returned no text to parse.");
  }

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse Gemini's response as JSON: " + cleaned);
  }

  return parsed;
}

export async function analyzeWithAI(review: string, tone: Tone = "Professional"): Promise<AnalysisResult> {
  return callGemini(review, tone);
}