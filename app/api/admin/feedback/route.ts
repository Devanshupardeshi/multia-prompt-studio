import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { deleteFeedback, listFeedback, summariseFeedback } from "@/lib/feedback";

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

/** Removes one piece of feedback, image included: DELETE /api/admin/feedback?id=… */
export async function DELETE(request: NextRequest) {
  if (!(await isRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "An id is required." }, { status: 400 });
  }

  if (!(await deleteFeedback(id))) {
    return NextResponse.json({ error: "That feedback no longer exists." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
