/**
 * Newline-delimited JSON streaming between our routes and the studio clients.
 *
 * Why hand-rolled rather than the AI SDK's UI stream: `@ai-sdk/react` is
 * deliberately not installed (it peer-conflicts with React 19.2), so the clients
 * use plain fetch. NDJSON over `response.body` needs no dependency and is trivial
 * to reason about.
 *
 * Why stream at all: these calls take 30–90s. Sending nothing for that long is
 * what makes a serverless platform kill the request mid-flight — the first byte
 * has to leave early and keep flowing. It also turns a blind spinner into visible
 * reasoning, which is the difference between "stuck" and "working".
 */

export type StreamEvent =
  /** Coarse progress before the model starts producing tokens. */
  | { type: "status"; message: string }
  /** A chunk of the model's reasoning trace. */
  | { type: "reasoning"; text: string }
  /** Terminal success. Shape is route-specific. */
  | { type: "result"; data: unknown }
  /** Terminal failure, already human-readable. */
  | { type: "error"; error: string; status?: number };

const encoder = new TextEncoder();

export function encodeStreamEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export interface StreamWriter {
  status: (message: string) => void;
  reasoning: (text: string) => void;
  result: (data: unknown) => void;
  error: (error: string, status?: number) => void;
}

/**
 * Runs `work` inside a stream. The response starts immediately, so the client and
 * the platform both see activity long before the model finishes.
 */
export function streamingResponse(
  work: (writer: StreamWriter) => Promise<void>,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        controller.enqueue(encodeStreamEvent(event));
      };

      const writer: StreamWriter = {
        status: (message) => send({ type: "status", message }),
        reasoning: (text) => send({ type: "reasoning", text }),
        result: (data) => send({ type: "result", data }),
        error: (error, status) => send({ type: "error", error, status }),
      };

      // Flush a first byte before any slow setup work (image prep, prompt build),
      // so the connection is unmistakably alive from the start.
      send({ type: "status", message: "Starting" });

      try {
        await work(writer);
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "The request failed.",
        });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      // text/plain rather than application/x-ndjson: some proxies buffer unknown
      // content types, which would defeat the point of streaming.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Reads an NDJSON event stream. Calls `onEvent` for every parsed event and
 * resolves once the stream ends.
 */
export async function readEventStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error("The server returned an empty response.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drain = (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as StreamEvent);
        } catch {
          // A partial or malformed line is not worth failing the whole stream over.
        }
      }
      newline = buffer.indexOf("\n");
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    drain(decoder.decode(value, { stream: true }));
  }
  drain(decoder.decode());
}
