import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildUserParts } from "../../lib/gemini";
import { geminiPartsToUserContent } from "../../lib/openai-prompt";
import type { GeneratePayload } from "../../lib/shared-types";

// Guards the one thing that silently breaks between Gemini and ChatGPT: the
// Gemini request shape uses { inlineData: { mimeType, data } } and the AI SDK wants
// { type: "image", image, mediaType }. If the adapter drops or mangles those, the
// prompt still generates — just blind to every image the user uploaded.

const PNG_BODY = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGMAAgAABAAB";
const PNG = `data:image/png;base64,${PNG_BODY}`;
const JPEG_BODY = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAE";
const JPEG = `data:image/jpeg;base64,${JPEG_BODY}`;

function basePayload(mode: GeneratePayload["mode"]): GeneratePayload {
  return {
    mode,
    description: "a red bicycle leaning on a wall",
    styles: ["Photorealistic"],
    characterName: "",
    useCharacter: false,
    targetModel: "gpt-image",
  };
}

function imageParts(content: ReturnType<typeof geminiPartsToUserContent>) {
  assert.ok(Array.isArray(content), "user content should be an array, not a bare string");
  return content.filter((part): part is { type: "image"; image: string; mediaType: string } =>
    typeof part === "object" && part !== null && (part as { type?: string }).type === "image",
  );
}

function convert(payload: GeneratePayload) {
  return geminiPartsToUserContent(buildUserParts(payload));
}

describe("reference images reach the ChatGPT model", () => {
  test("standard mode forwards every reference image with its media type", () => {
    const content = convert({ ...basePayload("standard"), referenceImages: [PNG, JPEG] });
    const images = imageParts(content);

    assert.equal(images.length, 2, "both reference images should survive the conversion");
    assert.deepEqual(
      images.map((i) => i.mediaType),
      ["image/png", "image/jpeg"],
      "media types must be preserved so the provider decodes correctly",
    );
    // The payload must be raw base64 — a leftover "data:...;base64," prefix is
    // accepted by the type system but rejected by the provider.
    assert.equal(images[0].image, PNG_BODY);
    assert.equal(images[1].image, JPEG_BODY);
    for (const image of images) {
      assert.ok(!image.image.startsWith("data:"), "image payload must not keep the data URL prefix");
    }
  });

  test("face swap forwards both the source face and the target pose", () => {
    const images = imageParts(
      convert({ ...basePayload("face_swap"), sourceFaceImage: PNG, targetPoseImage: JPEG }),
    );
    assert.equal(images.length, 2);
    assert.deepEqual(images.map((i) => i.mediaType), ["image/png", "image/jpeg"]);
  });

  test("mockup forwards both the logo and the mockup reference", () => {
    const images = imageParts(
      convert({ ...basePayload("mockup"), logoImage: PNG, mockupReferenceImage: JPEG }),
    );
    assert.equal(images.length, 2);
    assert.deepEqual(images.map((i) => i.mediaType), ["image/png", "image/jpeg"]);
  });

  test("each image keeps the labelling text part that tells the model its role", () => {
    const content = convert({
      ...basePayload("face_swap"),
      sourceFaceImage: PNG,
      targetPoseImage: JPEG,
    });
    const text = (content as { type: string; text?: string }[])
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    assert.match(text, /SOURCE FACE/i, "the source face label must survive");
    assert.match(text, /TARGET POSE/i, "the target pose label must survive");
  });

  test("the brief itself is always forwarded, images or not", () => {
    const content = convert(basePayload("standard"));
    const text = (content as { type: string; text?: string }[])
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    assert.match(text, /a red bicycle leaning on a wall/);
    assert.equal(imageParts(content).length, 0, "no images supplied means no image parts");
  });

  test("a malformed data URL is dropped rather than sent as broken image data", () => {
    const images = imageParts(
      convert({ ...basePayload("standard"), referenceImages: ["not-a-data-url", PNG] }),
    );
    assert.equal(images.length, 1, "only the valid image should be forwarded");
    assert.equal(images[0].image, PNG_BODY);
  });
});
