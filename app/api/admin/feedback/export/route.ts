import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { listFeedback, toFeedbackCsv } from "@/lib/feedback";

export const runtime = "nodejs";

/** Excel-openable CSV of all feedback. */
export async function GET(request: NextRequest) {
  if (!(await isRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await listFeedback(500);
  const filename = `multia-feedback-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(toFeedbackCsv(rows), {
    headers: {
      // text/csv rather than an .xlsx: Excel opens this natively, and the UTF-8 BOM
      // in toFeedbackCsv keeps ₹ and Devanagari intact. No dependency needed.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
