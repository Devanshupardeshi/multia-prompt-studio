import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getApprovedPosterFile } from "@/lib/poster-reference-system";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const file = getApprovedPosterFile(request.nextUrl.searchParams.get("id") ?? undefined);
  if (!file) {
    return NextResponse.json({ error: "Poster reference not found" }, { status: 404 });
  }

  try {
    const image = await readFile(
      path.join(process.cwd(), "Poster Design", "Recent Made posters", file),
    );
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Poster reference unavailable" }, { status: 404 });
  }
}

