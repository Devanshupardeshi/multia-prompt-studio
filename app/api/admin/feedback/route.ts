import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { listFeedback, summariseFeedback } from "@/lib/feedback";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Defence in depth: proxy.ts already guards /api/admin/*.
  if (!(await isRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit")) || 200;
  const feedback = await listFeedback(limit);

  return NextResponse.json({ feedback, summary: summariseFeedback(feedback) });
}
