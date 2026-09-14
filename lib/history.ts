// lib/history.ts
//
// Phase 1 review history: stored entirely in the browser's localStorage.
// No backend, no database — this is the one file that knows *how* history
// is persisted, so swapping to a real store later only means changing this
// file, not the UI that calls it.

import type { AnalysisResult } from "./analyzer";
import type { Tone } from "./ai-provider";

export type HistoryEntry = {
  id: string;
  timestamp: number;
  reviewText: string;
  tone: Tone;
  sentiment: AnalysisResult["sentiment"];
  priority: AnalysisResult["priority"];
  positiveThemes: string[];
  negativeThemes: string[];
  suggestedResponse: string;
  source?: "ai" | "fallback";
};

const STORAGE_KEY = "review-analyzer-history";
const MAX_ENTRIES = 20;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const updated = [entry, ...getHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage can throw (private browsing, storage full, etc.) —
    // history is a nice-to-have, so fail silently rather than break analysis.
  }
  return updated;
}
