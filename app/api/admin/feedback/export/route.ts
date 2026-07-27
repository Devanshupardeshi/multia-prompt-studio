import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { listFeedback, toFeedbackCsv, type FeedbackKind } from "@/lib/feedback";

export const runtime = "nodejs";

/** Excel-openable CSV. `?kind=rating` or `?kind=error` exports just that kind. */
export async function GET(request: NextRequest) {
  if (!(await isRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = request.nextUrl.searchParams.get("kind");
  const kind: FeedbackKind | undefined =
    requested === "rating" || requested === "error" ? requested : undefined;

  const rows = await listFeedback(500);
  const label = kind === "rating" ? "ratings" : kind === "error" ? "errors" : "feedback";
  const filename = `multia-${label}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(toFeedbackCsv(rows, kind), {
    headers: {
      // text/csv rather than an .xlsx: Excel opens this natively, and the UTF-8 BOM
      // in toFeedbackCsv keeps ₹ and Devanagari intact. No dependency needed.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
