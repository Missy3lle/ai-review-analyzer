// lib/analyzer.ts
//
// Core analysis logic for the AI Review Analyzer MVP.
//
// This ships with a built-in rule-based analyzer so the app works
// immediately with no API key required (good for demos and this
// portfolio), and doubles as the safety-net fallback when the Gemini
// call in lib/ai-provider.ts fails or is rate-limited.
//
// KNOWN LIMITATION (documented on purpose, not a bug): this analyzer
// does a lightweight, keyword-window check for negation (e.g. "not
// clean") so it doesn't flip polarity on the most common phrasing,
// but it still does not understand sarcasm or more complex negation
// ("far from unhelpful"). Fixing that properly needs real language
// understanding, which is exactly what the Gemini path (above) is
// for — this fallback only needs to be safe and sensible, not smart.

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
  "musty", "smelled", "delayed", "unresponsive", "ignored",
];

// Health/safety/urgency terms: these always count as negative signal (several
// of them, like "sick", aren't in NEGATIVE_WORDS at all) and always force
// priority to High, regardless of how the rest of the review reads — a
// health complaint should never come back "Low priority" just because it's
// wrapped in an otherwise-positive review.
const SEVERE_WORDS = [
  "sick", "ill", "allergic", "allergy", "food poisoning", "poisoning",
  "mold", "moldy", "roach", "roaches", "insect", "injury", "injured",
  "hurt", "burned", "unsafe", "hospital",
];

const THEME_KEYWORDS: Record<string, string[]> = {
  "Product/food quality": [
    "cake", "flavor", "flavour", "moist", "frosting", "breakfast", "food",
    "taste", "delicious", "tasty", "quality", "product", "defective",
  ],
  "Wait time": ["wait", "waiting", "check-in", "check in", "queue", "delay"],
  "Customer service": ["staff", "service", "rude", "friendly", "helpful", "unhelpful", "kind", "unkind", "welcoming"],
  "Communication": [
    "communication", "response", "responded", "respond", "reply", "replied",
    "contact", "contacted", "called", "email", "emailed", "ignored", "unresponsive",
  ],
  "Pricing": ["price", "expensive", "overpriced", "cheap", "value", "cost"],
  "Design/appearance": ["design", "beautiful", "gorgeous", "stunning", "topper", "decoration", "pool"],
  "Delivery/pickup": ["delivery", "pickup", "deliver", "shipping", "arrived"],
  "Room condition": ["room", "smelled", "musty", "spotless", "clean", "air conditioning"],
};

// Words that negate the term right after them (or up to a couple words
// later), e.g. "not clean", "wasn't helpful", "never responded".
const NEGATORS = ["not", "no", "never", "without", "hardly", "barely"];

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "i");
  return pattern.test(text);
}

function wordOccurrences(text: string, word: string): number[] {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    indices.push(match.index);
    if (match.index === pattern.lastIndex) pattern.lastIndex++;
  }
  return indices;
}

function isNegatedAt(text: string, index: number): boolean {
  const before = text.slice(0, index).trim();
  if (!before) return false;
  const precedingWords = before
    .split(/\s+/)
    .slice(-3)
    .map((w) => w.toLowerCase().replace(/[^a-z']/g, ""));
  return precedingWords.some((w) => NEGATORS.includes(w) || w.endsWith("n't"));
}

// True if `word` appears in `text` at least once WITHOUT a preceding negator.
function hasNonNegatedWord(text: string, word: string): boolean {
  return wordOccurrences(text, word).some((i) => !isNegatedAt(text, i));
}

// True if `word` appears in `text` at least once WITH a preceding negator.
function hasNegatedWord(text: string, word: string): boolean {
  return wordOccurrences(text, word).some((i) => isNegatedAt(text, i));
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
  let anySevere = false;

  for (const sentence of sentences) {
    // A negated positive ("not clean") reads as a complaint, not praise.
    const positiveHit = POSITIVE_WORDS.some((w) => hasNonNegatedWord(sentence, w));
    const negatedPositiveHit = POSITIVE_WORDS.some((w) => hasNegatedWord(sentence, w));
    // A negated negative ("wasn't rude") is treated as neutral rather than
    // assumed to flip all the way to positive — stays conservative.
    const negativeHit = NEGATIVE_WORDS.some((w) => hasNonNegatedWord(sentence, w));
    const severeHit = SEVERE_WORDS.some((w) => hasNonNegatedWord(sentence, w));

    const isPositive = positiveHit;
    const isNegative = negativeHit || negatedPositiveHit || severeHit;

    const themes = themesInSentence(sentence);

    if (isPositive) anyPositive = true;
    if (isNegative) anyNegative = true;
    if (severeHit) anySevere = true;

    if (isPositive && isNegative) {
      // Genuinely mixed clause (e.g. "friendly yet slow") — reflect the
      // theme on both sides instead of silently dropping it.
      themes.forEach((t) => {
        positiveThemes.add(t);
        negativeThemes.add(t);
      });
    } else if (isPositive) {
      themes.forEach((t) => positiveThemes.add(t));
    } else if (isNegative) {
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

  const suggestedResponse = buildResponse(sentiment, positiveThemesArr, negativeThemesArr, anySevere);

  let priority: AnalysisResult["priority"] =
    sentiment === "Negative" ? "High" : sentiment === "Mixed" ? "Medium" : "Low";

  // A health/safety/urgency signal always wins, regardless of how the rest
  // of the review reads.
  if (anySevere) priority = "High";

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
  negativeThemes: string[],
  severe: boolean
): string {
  const positivePart = positiveThemes.length
    ? `We're so glad you enjoyed the ${positiveThemes.join(" and ").toLowerCase()}.`
    : "";

  const negativePart = negativeThemes.length
    ? `We appreciate you letting us know about the ${negativeThemes
        .join(" and ")
        .toLowerCase()}, and we're already working on improving this.`
    : "";

  // A health/safety/urgency signal needs to be acknowledged even when it
  // didn't map to one of the named themes above.
  const severePart = severe
    ? "We take this concern seriously, especially anything related to health or safety, and want to address it right away — please contact us directly."
    : "";

  let response: string;
  if (sentiment === "Positive") {
    response = `Thank you so much for the kind words! ${positivePart} We look forward to serving you again soon.`;
  } else if (sentiment === "Negative") {
    response = `Thank you for sharing this with us. ${negativePart} We'd love the chance to make it right — please reach out to us directly.`;
  } else if (sentiment === "Mixed") {
    response = `Thank you for your feedback. ${positivePart} ${negativePart}`.trim();
  } else {
    response = "Thank you for taking the time to share your experience with us — we appreciate the feedback.";
  }

  if (severe) {
    response = `${response} ${severePart}`.trim();
  }

  return response;
}
