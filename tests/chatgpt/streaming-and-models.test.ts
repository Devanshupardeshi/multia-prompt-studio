import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DEFAULT_PROMPT_MODEL,
  discoverChatGptModels,
  labelForModel,
  toModelList,
} from "../../lib/chatgpt-models";
import {
  encodeStreamEvent,
  readEventStream,
  streamingResponse,
  type StreamEvent,
} from "../../lib/stream-protocol";

describe("model discovery never breaks generation", () => {
  test("an empty list still offers the default", () => {
    const models = toModelList([]);
    assert.equal(models.length, 1);
    assert.equal(models[0].id, DEFAULT_PROMPT_MODEL);
    assert.equal(models[0].isDefault, true);
  });

  test("the default is always present and always listed first", () => {
    const models = toModelList(["gpt-5.6-terra", "zzz-model"]);
    assert.equal(models[0].id, DEFAULT_PROMPT_MODEL, "the recommended model must lead");
    assert.ok(models.some((model) => model.id === "gpt-5.6-terra"));
  });

  test("exactly one model is marked default", () => {
    const defaults = toModelList(["gpt-5.6-terra", DEFAULT_PROMPT_MODEL]).filter(
      (model) => model.isDefault,
    );
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].id, DEFAULT_PROMPT_MODEL);
  });

  test("non-prompt models are filtered out of the picker", () => {
    const ids = toModelList([
      "gpt-image-2",
      "text-embedding-3-large",
      "whisper-1",
      "gpt-5.6-terra",
    ]).map((model) => model.id);
    assert.ok(!ids.includes("gpt-image-2"), "the image model is not a prompt model");
    assert.ok(!ids.some((id) => id.includes("embedding")));
    assert.ok(!ids.includes("whisper-1"));
    assert.ok(ids.includes("gpt-5.6-terra"));
  });

  test("duplicates collapse", () => {
    const ids = toModelList([DEFAULT_PROMPT_MODEL, DEFAULT_PROMPT_MODEL, "gpt-5.6-terra"]).map(
      (model) => model.id,
    );
    assert.equal(new Set(ids).size, ids.length);
  });

  test("known models get real names, unknown ones stay readable", () => {
    assert.equal(labelForModel("gpt-5.6-sol"), "GPT-5.6 Sol");
    assert.equal(labelForModel("gpt-5.6-terra"), "GPT-5.6 Terra");
    assert.match(labelForModel("some-future-model"), /Some Future Model/);
  });
});

describe("Codex catalogue parsing matches the real response shape", () => {
  // The catalogue is not OpenAI-shaped: the array is `models` (not `data`), entries
  // are keyed by `slug` (not `id`), and `client_version` is a required query param.
  // Getting any of these wrong makes discovery silently return only the default.
  const CATALOGUE = {
    models: [
      { slug: "gpt-5.6-sol", visibility: "list", supported_in_api: true },
      { slug: "gpt-5.6-terra", visibility: "list", supported_in_api: true },
      { slug: "gpt-5.6-internal", visibility: "hidden", supported_in_api: true },
      { slug: "gpt-5.6-noapi", visibility: "list", supported_in_api: false },
      { id: "wrong-key-shape" },
    ],
  };

  async function discoverFrom(body: unknown, url: { value?: string } = {}) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      url.value = String(input);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      return await discoverChatGptModels({ authorization: "Bearer x" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  test("the request carries the required client_version", async () => {
    const url: { value?: string } = {};
    await discoverFrom(CATALOGUE, url);
    assert.match(url.value ?? "", /\/models\?client_version=/);
  });

  test("public models are read from `models[].slug`", async () => {
    const ids = (await discoverFrom(CATALOGUE)).map((model) => model.id);
    assert.ok(ids.includes("gpt-5.6-sol"));
    assert.ok(ids.includes("gpt-5.6-terra"), "a second real model must surface");
    assert.ok(ids.length > 1, "discovery must produce alternatives, or the picker hides");
  });

  test("hidden and non-API models are excluded", async () => {
    const ids = (await discoverFrom(CATALOGUE)).map((model) => model.id);
    assert.ok(!ids.includes("gpt-5.6-internal"), "visibility!=list must be dropped");
    assert.ok(!ids.includes("gpt-5.6-noapi"), "supported_in_api=false must be dropped");
  });

  test("an OpenAI-shaped body yields only the default, proving the shape matters", async () => {
    const ids = (await discoverFrom({ data: [{ id: "gpt-5.6-terra" }] })).map((m) => m.id);
    assert.deepEqual(ids, [DEFAULT_PROMPT_MODEL]);
  });

  test("a malformed body degrades to the default instead of throwing", async () => {
    assert.deepEqual((await discoverFrom({ nope: true })).map((m) => m.id), [
      DEFAULT_PROMPT_MODEL,
    ]);
  });
});

describe("the streaming protocol survives a round trip", () => {
  async function collect(response: Response) {
    const events: StreamEvent[] = [];
    await readEventStream(response, (event) => events.push(event));
    return events;
  }

  test("status, reasoning and result arrive in order", async () => {
    const response = streamingResponse(async (writer) => {
      writer.status("Thinking");
      writer.reasoning("considering ");
      writer.reasoning("a clay coin bank");
      writer.result({ json: "{}" });
    });

    const events = await collect(response);
    // The helper always opens with a status so the first byte leaves immediately.
    assert.equal(events[0].type, "status");
    assert.deepEqual(
      events.filter((event) => event.type === "reasoning").map((e) => (e as { text: string }).text),
      ["considering ", "a clay coin bank"],
    );
    const result = events.at(-1);
    assert.equal(result?.type, "result");
    assert.deepEqual((result as { data: unknown }).data, { json: "{}" });
  });

  test("a thrown error becomes an error event rather than a broken stream", async () => {
    const events = await collect(
      streamingResponse(async () => {
        throw new Error("Codex refused");
      }),
    );
    const error = events.at(-1);
    assert.equal(error?.type, "error");
    assert.match((error as { error: string }).error, /Codex refused/);
  });

  test("the response headers defeat proxy buffering", () => {
    const response = streamingResponse(async (writer) => writer.result({}));
    assert.match(response.headers.get("Content-Type") ?? "", /text\/plain/);
    assert.equal(response.headers.get("X-Accel-Buffering"), "no");
    assert.match(response.headers.get("Cache-Control") ?? "", /no-transform/);
  });

  test("events split across chunk boundaries still parse", async () => {
    // Simulates a reader delivering a partial line, which is normal over the wire.
    const encoded = Buffer.concat([
      Buffer.from(encodeStreamEvent({ type: "reasoning", text: "abc" })),
      Buffer.from(encodeStreamEvent({ type: "result", data: { ok: true } })),
    ]).toString();
    const midpoint = Math.floor(encoded.length / 2);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(encoded.slice(0, midpoint)));
        controller.enqueue(encoder.encode(encoded.slice(midpoint)));
        controller.close();
      },
    });

    const events = await collect(new Response(stream));
    assert.equal(events.length, 2);
    assert.equal(events[1].type, "result");
  });

  test("a malformed line is skipped instead of failing the stream", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{not json}\n"));
        controller.enqueue(encodeStreamEvent({ type: "status", message: "ok" }));
        controller.close();
      },
    });

    const events = await collect(new Response(stream));
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "status");
  });
});
