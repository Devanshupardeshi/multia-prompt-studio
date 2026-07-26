import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getPosterLogoFile } from "@/lib/poster-logos";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const file = getPosterLogoFile(
    request.nextUrl.searchParams.get("id") ?? undefined,
    request.nextUrl.searchParams.get("variant") ?? undefined,
  );
  if (!file) {
    return NextResponse.json({ error: "Logo asset not supplied yet" }, { status: 404 });
  }

  try {
    const image = await readFile(path.join(process.cwd(), "Poster Design", "Logos", file));
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo asset unavailable" }, { status: 404 });
  }
}
