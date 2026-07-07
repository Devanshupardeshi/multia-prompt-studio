import { NextRequest, NextResponse, after } from "next/server";
import { generatePrompt, PoolBusyError } from "@/lib/gemini";
import { incrementDailyPromptCount } from "@/lib/prompt-count-server";
import { getSettingsCached } from "@/lib/api-keys";

// Claude (OpenRouter) and heavy Awwwards/3D Gemini calls can run long — give them room.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = body;

    // Basic validation based on mode
    if (payload.mode === "standard" && (!payload.description || !payload.description.trim())) {
      return NextResponse.json({ error: "Description is required for standard mode" }, { status: 400 });
    }
    if (payload.mode === "face_swap" && (!payload.sourceFaceImage || !payload.targetPoseImage)) {
      return NextResponse.json({ error: "Source Face and Target Pose images are required for face swap mode" }, { status: 400 });
    }
    if (payload.mode === "mockup" && (!payload.logoImage)) {
      return NextResponse.json({ error: "Logo image is required for mockup mode" }, { status: 400 });
    }
    if (payload.mode === "poster_design" && (!payload.description || !payload.description.trim()) && (!payload.headlineText || !payload.headlineText.trim())) {
      return NextResponse.json({ error: "A topic description or headline is required for Poster Design mode" }, { status: 400 });
    }
    if (payload.mode === "3d_website" && (!payload.brandName || !payload.brandName.trim())) {
      return NextResponse.json({ error: "Brand name is required for 3D Website mode" }, { status: 400 });
    }
    if (payload.mode === "awwwards_website" && (!payload.brandName || !payload.brandName.trim())) {
      return NextResponse.json({ error: "Brand name is required for Awwwards 3D mode" }, { status: 400 });
    }
    if (payload.mode === "deep_research" && (!payload.businessName || !payload.businessName.trim())) {
      return NextResponse.json({ error: "Business name is required for Deep Research mode" }, { status: 400 });
    }
    if (payload.mode === "video_standard" && (!payload.description || !payload.description.trim())) {
      return NextResponse.json({ error: "A scene description is required for Text-to-Video mode" }, { status: 400 });
    }
    if (payload.mode === "video_logo_animation" && !payload.logoImage) {
      return NextResponse.json({ error: "A logo image is required for Video Logo Animation mode" }, { status: 400 });
    }
    if (payload.mode === "video_product_showcase" && !payload.productImage && (!payload.productDescription || !payload.productDescription.trim())) {
      return NextResponse.json({ error: "A product image or description is required for Video Product Showcase mode" }, { status: 400 });
    }

    // Maintenance kill-switch (toggled live from the admin panel).
    const settings = await getSettingsCached();
    if (settings.maintenance_mode) {
      return NextResponse.json(
        {
          error: "The studio is in maintenance mode right now. Please check back shortly.",
          maintenance: true,
        },
        { status: 503 }
      );
    }

    const result = await generatePrompt(payload);
    // Count after the response is sent — don't make the user wait on this write.
    after(() => incrementDailyPromptCount());

    return NextResponse.json({ json: result });
  } catch (error) {
    // Pool drained — every key is cooling/exhausted. Return a structured, queue-able
    // response so the studio can show a live countdown and auto-retry.
    if (error instanceof PoolBusyError) {
      return NextResponse.json(
        {
          error: error.message,
          poolBusy: true,
          soonestRecoveryAt: error.soonestRecoveryAt,
          retryAfterMs: error.retryAfterMs,
        },
        { status: 503 }
      );
    }

    console.error("Generate API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate prompt";

    // Check if it's a config error
    if (message.includes("No Gemini API keys")) {
      return NextResponse.json(
        { error: "API keys not configured. Add keys in the admin panel (/admin) or to .env.local" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
