import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Studio feedback: star ratings a designer leaves on a finished render, plus
 * failures the app records on its own. Both land in one table so the admin view
 * shows successes and failures on a single timeline — a 3-star average means
 * something different if half the runs that day errored out.
 */

export const FEEDBACK_BUCKET = "studio-feedback";

export type FeedbackKind = "rating" | "error";
export type FeedbackSource = "poster" | "prompt-studio";

export interface FeedbackInput {
  kind: FeedbackKind;
  source: FeedbackSource;
  mode?: string | null;
  rating?: number | null;
  comment?: string | null;
  errorMessage?: string | null;
  errorStage?: string | null;
  topic?: string | null;
  headline?: string | null;
  promptModel?: string | null;
  /** Data URL of the rated artwork. Uploaded to storage, never stored inline. */
  image?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  promptJson?: unknown;
  metadata?: Record<string, unknown> | null;
}

export interface FeedbackRow {
  id: string;
  created_at: string;
  kind: FeedbackKind;
  source: string;
  mode: string | null;
  rating: number | null;
  comment: string | null;
  error_message: string | null;
  error_stage: string | null;
  topic: string | null;
  headline: string | null;
  prompt_model: string | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  prompt_json: unknown;
  metadata: Record<string, unknown> | null;
}

/** Row plus a short-lived signed URL, since the bucket is private. */
export type FeedbackRowWithImage = FeedbackRow & { imageUrl: string | null };

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function clampText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

/** Normalises whatever the client posted into a row we are willing to store. */
export function parseFeedbackInput(body: unknown): FeedbackInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;

  const kind = source.kind === "error" ? "error" : source.kind === "rating" ? "rating" : null;
  if (!kind) return null;

  const studio =
    source.source === "poster" || source.source === "prompt-studio" ? source.source : null;
  if (!studio) return null;

  const ratingValue = Number(source.rating);
  const rating =
    kind === "rating" && Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5
      ? ratingValue
      : null;
  // A rating row with no stars is not feedback, it is an empty form submission.
  if (kind === "rating" && rating === null) return null;

  const width = Number(source.imageWidth);
  const height = Number(source.imageHeight);

  return {
    kind,
    source: studio,
    mode: clampText(source.mode, 60),
    rating,
    comment: clampText(source.comment, 2000),
    errorMessage: clampText(source.errorMessage, 1000),
    errorStage: clampText(source.errorStage, 40),
    topic: clampText(source.topic, 300),
    headline: clampText(source.headline, 300),
    promptModel: clampText(source.promptModel, 60),
    image: typeof source.image === "string" ? source.image : null,
    imageWidth: Number.isFinite(width) ? width : null,
    imageHeight: Number.isFinite(height) ? height : null,
    promptJson: source.promptJson ?? null,
    metadata:
      source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? (source.metadata as Record<string, unknown>)
        : null,
  };
}

/**
 * Records one piece of feedback. Returns false when Supabase is not configured —
 * feedback is never allowed to break a generation the user already completed.
 */
export async function recordFeedback(input: FeedbackInput): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.warn("Supabase is not configured; skipping feedback insert.");
    return false;
  }

  let imagePath: string | null = null;

  if (input.image) {
    const match = input.image.match(DATA_IMAGE);
    if (match) {
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.byteLength <= MAX_IMAGE_BYTES) {
        const extension = match[1] === "jpeg" ? "jpg" : match[1];
        const path = `${input.source}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from(FEEDBACK_BUCKET)
          .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });

        if (error) {
          // Losing the screenshot is worth far less than losing the rating text.
          console.error("Feedback image upload failed; storing the rating without it:", error);
        } else {
          imagePath = path;
        }
      }
    }
  }

  const { error } = await supabase.from("studio_feedback").insert({
    kind: input.kind,
    source: input.source,
    mode: input.mode,
    rating: input.rating,
    comment: input.comment,
    error_message: input.errorMessage,
    error_stage: input.errorStage,
    topic: input.topic,
    headline: input.headline,
    prompt_model: input.promptModel,
    image_path: imagePath,
    image_width: input.imageWidth,
    image_height: input.imageHeight,
    prompt_json: input.promptJson ?? null,
    metadata: input.metadata,
  });

  if (error) {
    console.error("Failed to record studio feedback:", error);
    return false;
  }

  return true;
}

export interface FeedbackSummary {
  total: number;
  ratings: number;
  errors: number;
  averageRating: number | null;
  /** Star value → how many ratings gave it. */
  distribution: Record<number, number>;
}

export function summariseFeedback(rows: FeedbackRow[]): FeedbackSummary {
  const ratings = rows.filter((row) => row.kind === "rating" && row.rating !== null);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of ratings) distribution[row.rating as number] += 1;

  return {
    total: rows.length,
    ratings: ratings.length,
    errors: rows.filter((row) => row.kind === "error").length,
    averageRating: ratings.length
      ? Math.round((ratings.reduce((sum, row) => sum + (row.rating ?? 0), 0) / ratings.length) * 100) / 100
      : null,
    distribution,
  };
}

/** Lists feedback newest-first, with signed image URLs for the admin view. */
export async function listFeedback(limit = 200): Promise<FeedbackRowWithImage[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("studio_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (error) {
    console.error("Failed to list studio feedback:", error);
    return [];
  }

  const rows = (data ?? []) as FeedbackRow[];
  const paths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  // One batched call rather than one per row.
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from(FEEDBACK_BUCKET)
      .createSignedUrls(paths, 60 * 60);
    for (const entry of urls ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map((row) => ({
    ...row,
    imageUrl: row.image_path ? signed.get(row.image_path) ?? null : null,
  }));
}

const CSV_COLUMNS: Array<{ header: string; value: (row: FeedbackRow) => string }> = [
  { header: "Date", value: (row) => new Date(row.created_at).toISOString() },
  { header: "Kind", value: (row) => row.kind },
  { header: "Studio", value: (row) => row.source },
  { header: "Mode", value: (row) => row.mode ?? "" },
  { header: "Rating", value: (row) => (row.rating === null ? "" : String(row.rating)) },
  { header: "Comment", value: (row) => row.comment ?? "" },
  { header: "Topic", value: (row) => row.topic ?? "" },
  { header: "Headline", value: (row) => row.headline ?? "" },
  { header: "Model", value: (row) => row.prompt_model ?? "" },
  { header: "Error stage", value: (row) => row.error_stage ?? "" },
  { header: "Error", value: (row) => row.error_message ?? "" },
  {
    header: "Image size",
    value: (row) => (row.image_width && row.image_height ? `${row.image_width}x${row.image_height}` : ""),
  },
  { header: "Image path", value: (row) => row.image_path ?? "" },
];

function csvCell(value: string): string {
  // Excel treats a leading =, +, - or @ as a formula, so prefix those with a quote.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Excel-ready CSV. A UTF-8 BOM is essential here: without it Excel reads the file
 * as the local codepage and mangles ₹ and Devanagari, which this campaign's
 * comments and topics are full of.
 */
export function toFeedbackCsv(rows: FeedbackRow[]): string {
  const lines = [
    CSV_COLUMNS.map((column) => csvCell(column.header)).join(","),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvCell(column.value(row))).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}
