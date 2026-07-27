"use client";

import { downscaleImage } from "./image-downscale-client";
import { REFINE_UPLOAD_MAX_EDGE } from "./poster-refine";

/**
 * Downscales an image for upload to the refinement pass.
 *
 * Everything sent up is capped at the long-edge limit: a full 2160x2700 PNG
 * base64-encoded would exceed the platform request limit, and the render comes
 * back at full canvas size regardless — these inputs are guidance, not output.
 * Kept lossless, since the model is being asked to preserve this artwork exactly.
 *
 * Note there is no mask here. The ChatGPT OAuth transport rejects the edits API's
 * `mask` parameter, so a marked area travels as a described region in the prompt
 * instead (see describeRefineRegion).
 */
export async function prepareRefineImage(source: string): Promise<string> {
  return downscaleImage(source, { maxEdge: REFINE_UPLOAD_MAX_EDGE, format: "png" });
}
