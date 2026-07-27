import { NextResponse } from "next/server";
import { parseFeedbackInput, recordFeedback } from "@/lib/feedback";

// Uploading the rated artwork means a multi-megabyte body.
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * Records studio feedback — a star rating from the designer, or an automatically
 * captured failure.
 *
 * Deliberately always answers 200 with an `ok` flag rather than erroring: this is
 * called after the user has already got (or failed to get) their poster, and a
 * telemetry write must never surface as a second failure on top of the first.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" });
  }

  const input = parseFeedbackInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: "A rating of 1–5 stars is required." });
  }

  const ok = await recordFeedback(input);
  return NextResponse.json({ ok });
}
