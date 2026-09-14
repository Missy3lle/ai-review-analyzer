// lib/analyzer.ts
//
// Core analysis logic for the AI Review Analyzer MVP.
//
// This ships with a built-in rule-based analyzer so the app works
// immediately with no API key required (good for demos and this
// portfolio). To upgrade to real AI analysis per the original spec:
//
//   1. Add OPENAI_API_KEY to a .env.local file
//   2. Replace the body of `analyzeReview()` below with a call to
//      the OpenAI API (chat.completions.create), asking it to return
//      the same AnalysisResult shape as JSON.
//
// The route handler (app/api/analyze/route.ts) doesn't need to change
// either way — it just calls this function.
//
// KNOWN LIMITATION (documented on purpose, not a bug): this analyzer
// does not understand negation ("not unhelpful") or sarcasm. Fixing
// that properly needs real language understanding, which is exactly
// what the planned OpenAI upgrade (above) would solve. Rather than
// patch around it with more keyword tricks, this is left as an
// intentional Phase 2 item.

export type AnalysisResult = {
  sentiment: "Positive" | "Negative" | "Mixed" | "Neutral";
  positiveThemes: string[];
  negativeThemes: string[];
  suggestedResponse: string;
  priority: "High" | "Medium" | "Low";
};

const POSITIVE_WORDS = [
  "delicious", "amazing", "great", "love", "loved", "beautiful", "friendly",
  "fast", "excellent", "perfect", "wonderful", "fresh", "helpful", "kind",
  "recommend", "best", "gorgeous", "stunning", "tasty", "quick", "spotless",
  "clean",
];

const NEGATIVE_WORDS = [
  "wait", "long", "slow", "late", "rude", "unkind", "unhelpful", "expensive",
  "cold", "stale", "disappointed", "disappointing", "bad", "poor", "never",
  "worst", "broken", "cancelled", "canceled", "messy", "overpriced", "mistake",
  "musty", "smelled",
];

const THEME_KEYWORDS: Record<string, string[]> = {
  "Cake quality": ["cake", "flavor", "flavour", "moist", "frosting"],
  "Food/breakfast": ["breakfast", "food", "taste", "delicious", "tasty"],
  "Wait time": ["wait", "waiting", "check-in", "check in", "queue", "delay"],
  "Customer service": ["staff", "service", "rude", "friendly", "helpful", "unhelpful", "kind", "unkind", "welcoming"],
  "Pricing": ["price", "expensive", "overpriced", "cheap", "value", "cost"],
  "Design/appearance": ["design", "beautiful", "gorgeous", "stunning", "topper", "decoration", "pool"],
  "Delivery/pickup": ["delivery", "pickup", "deliver", "shipping", "arrived"],
  "Room condition": ["room", "smelled", "musty", "spotless", "clean", "air conditioning"],
};

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "i");
  return pattern.test(text);
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .flatMap((s) => s.split(/,?\s+\b(?:but|however|although|though|while)\b\s+/i))
    .map((s) => s.trim())
    .filter(Boolean);
}

function themesInSentence(sentence: string): string[] {
  const found: string[] = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((k) => hasWord(sentence, k))) found.push(theme);
  }
  return found;
}

export function analyzeReview(reviewText: string): AnalysisResult {
  const sentences = splitIntoSentences(reviewText);

  const positiveThemes = new Set<string>();
  const negativeThemes = new Set<string>();
  let anyPositive = false;
  let anyNegative = false;

  for (const sentence of sentences) {
    const isPositive = POSITIVE_WORDS.some((w) => hasWord(sentence, w));
    const isNegative = NEGATIVE_WORDS.some((w) => hasWord(sentence, w));
    const themes = themesInSentence(sentence);

    if (isPositive) anyPositive = true;
    if (isNegative) anyNegative = true;

    if (isPositive && !isNegative) {
      themes.forEach((t) => positiveThemes.add(t));
    } else if (isNegative && !isPositive) {
      themes.forEach((t) => negativeThemes.add(t));
    }
  }

  let sentiment: AnalysisResult["sentiment"];
  if (anyPositive && anyNegative) sentiment = "Mixed";
  else if (anyPositive) sentiment = "Positive";
  else if (anyNegative) sentiment = "Negative";
  else sentiment = "Neutral";

  const positiveThemesArr = Array.from(positiveThemes);
  const negativeThemesArr = Array.from(negativeThemes);

  const suggestedResponse = buildResponse(sentiment, positiveThemesArr, negativeThemesArr);

  const priority: AnalysisResult["priority"] =
    sentiment === "Negative" ? "High" : sentiment === "Mixed" ? "Medium" : "Low";

  return {
    sentiment,
    positiveThemes: positiveThemesArr,
    negativeThemes: negativeThemesArr,
    suggestedResponse,
    priority,
  };
}

function buildResponse(
  sentiment: AnalysisResult["sentiment"],
  positiveThemes: string[],
  negativeThemes: string[]
): string {
  const positivePart = positiveThemes.length
    ? `We're so glad you enjoyed the ${positiveThemes.join(" and ").toLowerCase()}.`
    : "";

  const negativePart = negativeThemes.length
    ? `We appreciate you letting us know about the ${negativeThemes
        .join(" and ")
        .toLowerCase()}, and we're already working on improving this.`
    : "";

  if (sentiment === "Positive") {
    return `Thank you so much for the kind words! ${positivePart} We look forward to serving you again soon.`;
  }
  if (sentiment === "Negative") {
    return `Thank you for sharing this with us. ${negativePart} We'd love the chance to make it right — please reach out to us directly.`;
  }
  if (sentiment === "Mixed") {
    return `Thank you for your feedback. ${positivePart} ${negativePart}`.trim();
  }
  return "Thank you for taking the time to share your experience with us — we appreciate the feedback.";
}