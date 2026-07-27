import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  parseFeedbackInput,
  summariseFeedback,
  toFeedbackCsv,
  type FeedbackRow,
} from "../lib/feedback";

function row(overrides: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: "1",
    created_at: "2026-07-27T10:00:00.000Z",
    kind: "rating",
    source: "poster",
    mode: null,
    rating: 4,
    comment: null,
    error_message: null,
    error_stage: null,
    topic: null,
    headline: null,
    prompt_model: null,
    image_path: null,
    image_width: null,
    image_height: null,
    prompt_json: null,
    metadata: null,
    ...overrides,
  };
}

describe("parseFeedbackInput", () => {
  it("rejects a rating with no stars", () => {
    assert.equal(parseFeedbackInput({ kind: "rating", source: "poster" }), null);
    assert.equal(parseFeedbackInput({ kind: "rating", source: "poster", rating: 0 }), null);
    assert.equal(parseFeedbackInput({ kind: "rating", source: "poster", rating: 6 }), null);
  });

  it("keeps an error row with no rating", () => {
    const parsed = parseFeedbackInput({
      kind: "error",
      source: "prompt-studio",
      errorStage: "artwork",
      errorMessage: "HTTP 504",
    });
    assert.equal(parsed?.rating, null);
    assert.equal(parsed?.errorStage, "artwork");
  });

  it("rejects an unknown studio or kind", () => {
    assert.equal(parseFeedbackInput({ kind: "rating", source: "elsewhere", rating: 5 }), null);
    assert.equal(parseFeedbackInput({ kind: "praise", source: "poster" }), null);
  });

  it("clamps long free text instead of dropping the row", () => {
    const parsed = parseFeedbackInput({
      kind: "rating",
      source: "poster",
      rating: 3,
      comment: "x".repeat(5000),
    });
    assert.equal(parsed?.comment?.length, 2000);
  });
});

describe("toFeedbackCsv", () => {
  it("starts with a UTF-8 BOM so Excel reads ₹ and Devanagari correctly", () => {
    const csv = toFeedbackCsv([row({ comment: "₹2,000 SIP — शानदार" })]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes("₹2,000 SIP — शानदार"));
  });

  it("neutralises a comment Excel would run as a formula", () => {
    const csv = toFeedbackCsv([row({ comment: "=HYPERLINK(\"http://evil\")" })]);
    assert.ok(csv.includes("\"'=HYPERLINK(\"\"http://evil\"\")\""));
  });
});

describe("summariseFeedback", () => {
  it("averages only rated rows and counts errors separately", () => {
    const summary = summariseFeedback([
      row({ id: "a", rating: 5 }),
      row({ id: "b", rating: 2 }),
      row({ id: "c", kind: "error", rating: null }),
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.ratings, 2);
    assert.equal(summary.errors, 1);
    assert.equal(summary.averageRating, 3.5);
    assert.equal(summary.distribution[5], 1);
  });

  it("has no average when nothing has been rated", () => {
    assert.equal(summariseFeedback([]).averageRating, null);
  });
});
