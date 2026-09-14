"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analyzer";
import type { Tone } from "@/lib/ai-provider";

type ResultWithSource = AnalysisResult & { source?: "ai" | "fallback" };

const EXAMPLE = "The cake was delicious but the wait time was too long.";
const TONES: Tone[] = ["Professional", "Friendly", "Apologetic"];

const SENTIMENT_STYLES: Record<AnalysisResult["sentiment"], string> = {
  Positive: "bg-sage/15 text-sage border-sage/30",
  Negative: "bg-clay/15 text-clay border-clay/30",
  Mixed: "bg-amber-bg text-amber-text border-amber-border",
  Neutral: "bg-mist-bg text-mist-text border-mist-border",
};

const PRIORITY_STYLES: Record<AnalysisResult["priority"], string> = {
  High: "bg-red-100 text-red-700 border-red-300",
  Medium: "bg-amber-bg text-amber-text border-amber-border",
  Low: "bg-mist-bg text-mist-text border-mist-border",
};

export default function Home() {
  const [review, setReview] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultWithSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editableResponse, setEditableResponse] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setCopied(false);
    if (!review.trim()) {
      setError("Paste a review first — that's what gets analyzed.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      setEditableResponse(data.suggestedResponse);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(editableResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <div className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-denim/10 blur-3xl"
        />

        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-denim">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 text-cream"
              aria-hidden="true"
            >
              <path d="M12 2 L13.8 9.2 L21 12 L13.8 14.8 L12 22 L10.2 14.8 L3 12 L10.2 9.2 Z" />
            </svg>
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-denim">
            AI Review Analyzer
          </p>
        </div>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Know what your customers really said, in one glance.
        </h1>
        <p className="mt-4 max-w-lg text-ink/70">
          Paste a review below. You'll get the sentiment, what's working, what
          isn't, and a response you can send today.
        </p>
      </div>

      <div className="mt-10">
        <label htmlFor="review" className="text-sm font-medium text-ink/80">
          Customer review
        </label>
        {!review && (
          <p className="mt-1 text-xs text-ink/50">
            Tip: paste one real customer review — from Google, Yelp, email,
            wherever it came from.
          </p>
        )}
        <textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={EXAMPLE}
          rows={5}
          className={`mt-2 w-full rounded-lg border p-4 text-ink placeholder:text-ink/35 focus:border-denim focus:outline-none focus:ring-2 focus:ring-denim/20 ${
            review ? "border-black/15 bg-white" : "border-denim/30 bg-denim/[0.08]"
          }`}
        />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium text-ink/60">Tone:</span>
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                tone === t
                  ? "border-denim bg-denim text-cream"
                  : "border-black/15 bg-white text-ink/60 hover:border-denim/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-denim px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-denim-dark disabled:opacity-50"
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin text-cream/70"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? "Analyzing…" : "Analyze review"}
          </button>
          <button
            onClick={() => setReview(EXAMPLE)}
            className="rounded-full border border-denim/30 bg-denim/5 px-3 py-1.5 text-xs font-medium text-denim transition hover:bg-denim/10"
          >
            Try an example
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      </div>

      {loading && (
        <div className="mt-10 flex items-center gap-3 rounded-xl border border-denim/20 bg-denim/[0.06] p-5">
          <svg
            className="h-5 w-5 flex-none animate-spin text-denim"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-ink/70">
            Analyzing sentiment, themes, and drafting a response…
          </p>
        </div>
      )}

      {result && (
        <div className="mt-10 space-y-6 border-t border-black/10 pt-8">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink/40">
                Sentiment
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm ${SENTIMENT_STYLES[result.sentiment]}`}
              >
                {result.sentiment}
              </span>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink/40">
                Priority
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm ${PRIORITY_STYLES[result.priority]}`}
              >
                {result.priority}
              </span>
            </div>
            {result.source && (
              <span className="pb-1.5 text-xs text-ink/40">
                {result.source === "ai"
                  ? "Analyzed with Gemini"
                  : "Analyzed with built-in rules (AI unavailable)"}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-sage/25 bg-sage/[0.05] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-sage">
                What's working
              </h2>
              {result.positiveThemes.length ? (
                <ul className="mt-3 space-y-1.5 text-sm text-ink/75">
                  {result.positiveThemes.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-sage/60" />
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm italic text-ink/40">
                  Nothing flagged.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-clay/25 bg-clay/[0.05] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-clay">
                Needs attention
              </h2>
              {result.negativeThemes.length ? (
                <ul className="mt-3 space-y-1.5 text-sm text-ink/75">
                  {result.negativeThemes.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-clay/60" />
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm italic text-ink/40">
                  Nothing flagged.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-denim/25 bg-denim/[0.08] p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h2 className="text-base font-semibold text-ink">
                Suggested response
              </h2>
              <span className="text-xs text-ink/40">
                Edit freely before sending
              </span>
            </div>
            <textarea
              value={editableResponse}
              onChange={(e) => setEditableResponse(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-lg border border-black/15 bg-white p-4 text-sm leading-relaxed text-ink/80 shadow-sm focus:border-denim focus:outline-none focus:ring-2 focus:ring-denim/20"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="rounded-md bg-denim px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-denim-dark"
              >
                Copy response
              </button>
              {copied && (
                <span className="text-sm text-sage">Copied!</span>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}