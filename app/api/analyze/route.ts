import { NextRequest, NextResponse } from "next/server";
import { analyzeReview } from "@/lib/analyzer";
import { analyzeWithAI, type Tone } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const review = body?.review;
  const tone: Tone = body?.tone ?? "Professional";

  if (typeof review !== "string" || review.trim().length === 0) {
    return NextResponse.json(
      { error: "Please paste a review to analyze." },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeWithAI(review, tone);
    return NextResponse.json({ ...result, source: "ai" });
  } catch (err) {
    console.error("AI analysis failed, falling back to rule-based analyzer:", err);
    const fallback = analyzeReview(review);
    return NextResponse.json({ ...fallback, source: "fallback" });
  }
}