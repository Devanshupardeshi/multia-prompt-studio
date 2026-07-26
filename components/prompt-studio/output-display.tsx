"use client";

import { useState, useCallback, useEffect } from "react";

import { GenerationMode, ImageRenderState, isImageMode, isVideoMode } from "@/lib/shared-types";

interface OutputDisplayProps {
  json: string | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate: () => void;
  hasImage?: boolean;
  mode?: GenerationMode;
  queuedUntil?: number | null;
  queueMessage?: string | null;
  /** GPT Image 2 render state — only ever leaves "idle" on the GPT-5.6 Sol path. */
  image?: ImageRenderState;
  onRetryImage?: () => void;
}

// Live countdown shown while the request is queued waiting for a free key in the pool.
function QueueWaiting({ until, message }: { until: number; message?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="text-xs text-white/30 font-mono">prompt.json</span>
        <span className="text-[11px] text-amber-400/70">queued…</span>
      </div>
      <div className="code-block-body">
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rounded-full border-2 border-amber-400/20" />
            <span className="absolute inset-0 rounded-full border-2 border-amber-400/80 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-white/70 font-body">{message || "Waiting for a free key…"}</p>
          <p className="text-2xl font-mono text-amber-300 tabular-nums">{secs}s</p>
          <p className="text-[12px] text-white/35 font-body max-w-sm">
            All keys are briefly at their rate limit. We&apos;ll retry automatically the moment one frees
            up — no need to press anything.
          </p>
        </div>
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function syntaxHighlight(json: string): string {
  // Escape before injecting via dangerouslySetInnerHTML — model output is untrusted.
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function OutputDisplay({
  json,
  isLoading,
  error,
  onRegenerate,
  hasImage,
  mode,
  queuedUntil,
  queueMessage,
  image = { status: "idle" },
  onRetryImage,
}: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [activeLayer, setActiveLayer] = useState(0);

  // The tab index is shared by the 3D-layer, video-shot, and research-section
  // tab strips, which have different lengths — reset it when the mode changes.
  useEffect(() => {
    setActiveLayer(0);
  }, [mode]);

  // Single clipboard helper for every "Copy" button in this component.
  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleCopy = useCallback(() => {
    if (json) copyText(json);
  }, [json, copyText]);

  // Parse once for the standard-mode view; fall back to raw text so a
  // non-JSON response renders instead of crashing the page.
  let prettyJson = json ?? "";
  let jsonBytes = prettyJson.length;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      prettyJson = JSON.stringify(parsed, null, 2);
      jsonBytes = JSON.stringify(parsed).length;
    } catch {
      // keep raw text
    }
  }

  if (!json && !isLoading && !error) {
    return (
      <section className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <div className="text-white/15 mb-3">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mx-auto"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-sm text-white/20 font-body">
              Your generated JSON prompt will appear here
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-white/20" />
          <span className="text-xs text-white/30 font-body uppercase tracking-[0.2em]">
            Generated Prompt
          </span>
        </div>

        {/* Error state */}
        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5 mb-4">
            <p className="text-sm text-red-400 font-body">{error}</p>
            <button
              onClick={onRegenerate}
              className="btn-multia btn-multia-sm mt-3"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Queued waiting for a free key (pool briefly drained) */}
        {isLoading && queuedUntil ? (
          <QueueWaiting until={queuedUntil} message={queueMessage} />
        ) : null}

        {/* Loading skeleton */}
        {isLoading && !queuedUntil && (
          <div className="code-block">
            <div className="code-block-header">
              <span className="text-xs text-white/30 font-mono">
                prompt.json
              </span>
              <span className="text-[11px] text-white/20">generating...</span>
            </div>
            <div className="code-block-body space-y-2">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton-pulse h-4 rounded"
                  style={{
                    width: `${Math.random() * 40 + 40}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reference Image Reminder */}
        {hasImage && json && !isLoading && (
          <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 mb-4 flex gap-3 items-start">
            <span className="text-yellow-500/80 text-lg leading-none">💡</span>
            <div>
              <p className="text-sm text-yellow-500/80 font-body font-medium mb-1">Remember Your Reference Image!</p>
              <p className="text-[13px] text-yellow-500/60 font-body">
                Be sure to provide the same reference image to the final AI generation tool along with this prompt to get the best result.
              </p>
            </div>
          </div>
        )}

        {/* JSON output — standard modes */}
        {json && !isLoading && mode !== "3d_website" && mode !== "awwwards_website" && !(mode && isVideoMode(mode)) && (
          <div className="code-block">
            <div className="code-block-header">
              <span className="text-xs text-white/40 font-mono">
                prompt.json
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
                  id="copy-button"
                >
                  {copied ? (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadFile(json, `prompt-${Date.now()}.json`, "application/json")}
                  className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
                  id="download-button"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            <div className="code-block-body custom-scrollbar max-h-[500px] overflow-y-auto">
              <pre>
                <code
                  dangerouslySetInnerHTML={{
                    __html: syntaxHighlight(prettyJson),
                  }}
                />
              </pre>
            </div>

            {/* Actions below */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-white/15 font-body">
                {jsonBytes} bytes
              </span>
              <button
                onClick={onRegenerate}
                className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5"
                id="regenerate-button"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* GPT Image 2 render — only reached on the GPT-5.6 Sol path */}
        {mode && isImageMode(mode) && image.status !== "idle" && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-white/40 font-body uppercase tracking-[0.2em]">
                Generated Image
              </span>
              <span className="flex-1 h-px bg-white/5" />
            </div>

            {image.status === "loading" && (
              <div className="border border-white/10 rounded-xl bg-white/[0.02] p-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
                <p className="text-[13px] text-white/40 font-body">
                  Rendering with GPT Image 2 — this can take a minute.
                </p>
              </div>
            )}

            {image.status === "signed-out" && (
              <div className="border border-white/10 rounded-xl bg-white/[0.02] p-5">
                <p className="text-[13px] text-white/50 font-body">
                  Sign in with ChatGPT (top-right) to generate an image from this prompt.
                </p>
              </div>
            )}

            {image.status === "error" && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5">
                <p className="text-[13px] text-red-400/80 font-body mb-3">{image.error}</p>
                {onRetryImage && (
                  <button
                    onClick={onRetryImage}
                    className="text-[11px] text-white/50 hover:text-white transition-colors font-body uppercase tracking-wider px-3 py-1.5 rounded border border-white/10 hover:border-white/30"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {image.status === "success" && (
              <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image}
                  alt="Image generated from the prompt by GPT Image 2"
                  className="w-full h-auto block"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/5">
                  <span className="text-[11px] text-white/30 font-mono">
                    {image.width}x{image.height} PNG
                    {" / "}source {image.sourceWidth}x{image.sourceHeight}
                    {image.upscaled ? " / upscaled" : ""}
                    {" / "}{image.quality}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={image.image}
                      download={`multia-${mode}-${image.width}x${image.height}.png`}
                      className="text-[11px] text-white/40 hover:text-white/80 transition-colors font-body uppercase tracking-wider px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      Download PNG
                    </a>
                    {onRetryImage && (
                      <button
                        onClick={onRetryImage}
                        className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider px-2 py-1 rounded hover:bg-white/5"
                      >
                        Re-render
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3D Website — 5-Layer Creative Brief output */}
        {json && !isLoading && mode === "3d_website" && (() => {
          let parsed: any = {};
          try { parsed = JSON.parse(json); } catch { parsed = {}; }
          const layers = [
            { key: "layer_1_fonts", label: "01 — Fonts", icon: "Aa" },
            { key: "layer_2_color", label: "02 — Color", icon: "🎨" },
            { key: "layer_3_glass", label: "03 — Glass", icon: "✨" },
            { key: "layer_4_layout", label: "04 — Layout", icon: "📐" },
            { key: "layer_5_motion", label: "05 — Motion", icon: "🎬" },
            { key: "full_prompt", label: "Full Prompt", icon: "📋" },
          ];

          return (
            <div className="space-y-4">
              {/* Layer tabs */}
              <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                {layers.map((layer, i) => (
                  <button
                    key={layer.key}
                    onClick={() => setActiveLayer(i)}
                    className={`px-3 py-2 text-xs font-body uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 ${
                      activeLayer === i ? "bg-white text-black" : "text-white/50 hover:text-white"
                    }`}
                  >
                    <span>{layer.icon}</span>
                    {layer.label}
                  </button>
                ))}
              </div>

              {/* Active layer content */}
              <div className="code-block">
                <div className="code-block-header">
                  <span className="text-xs text-white/40 font-mono">
                    {layers[activeLayer].label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(parsed[layers[activeLayer].key] || "")}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
                    >
                      {copied ? "Copied!" : "Copy Layer"}
                    </button>
                    <button
                      onClick={() => copyText(parsed.full_prompt || "")}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      📋 Copy Full Prompt
                    </button>
                  </div>
                </div>

                <div className="code-block-body custom-scrollbar max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-body">
                    {parsed[layers[activeLayer].key] || "No content generated for this layer."}
                  </pre>
                </div>

                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-white/15 font-body">
                    Layer {activeLayer + 1} of {layers.length}
                  </span>
                  <button
                    onClick={onRegenerate}
                    className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Awwwards 3D — single cohesive build prompt */}
        {json && !isLoading && mode === "awwwards_website" && (() => {
          let parsed: any = {};
          try { parsed = JSON.parse(json); } catch { parsed = {}; }
          const fullPrompt: string = parsed.full_prompt || "";

          return (
            <div className="space-y-4">
              {/* Concept line */}
              {parsed.concept && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                  <span className="text-[10px] text-white/30 font-body uppercase tracking-[0.2em]">The Concept</span>
                  <p className="text-sm text-white/80 font-body mt-1 leading-relaxed">{parsed.concept}</p>
                </div>
              )}

              {/* The build prompt */}
              <div className="code-block">
                <div className="code-block-header">
                  <span className="text-xs text-white/40 font-mono">build_prompt.md</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(fullPrompt)}
                      className="text-[11px] text-white/80 hover:text-white transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10"
                    >
                      {copied ? "Copied!" : "🚀 Copy Prompt"}
                    </button>
                    <button
                      onClick={() => downloadFile(fullPrompt, `awwwards-prompt-${Date.now()}.md`, "text/markdown")}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      ⬇ Download .md
                    </button>
                  </div>
                </div>

                <div className="code-block-body custom-scrollbar max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-body">
                    {fullPrompt || "No prompt generated."}
                  </pre>
                </div>

                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-white/15 font-body">
                    Paste into Claude Code to build the site · generate any Image Asset Brief images in Image mode
                  </span>
                  <button
                    onClick={onRegenerate}
                    className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Video — single shot or storyboard */}
        {json && !isLoading && mode && isVideoMode(mode) && (() => {
          let parsed: any = {};
          try { parsed = JSON.parse(json); } catch { parsed = {}; }
          const isStory = Array.isArray(parsed.shots);
          const shots: any[] = isStory ? parsed.shots : [parsed];
          const idx = Math.min(activeLayer, Math.max(shots.length - 1, 0));
          const shot = shots[idx] || {};

          return (
            <div className="space-y-4">
              {/* Storyboard global summary */}
              {isStory && parsed.global && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-1">
                  <span className="text-[10px] text-white/30 font-body uppercase tracking-[0.2em]">Storyboard · {shots.length} shots</span>
                  {parsed.global.concept && <p className="text-sm text-white/70 font-body">{parsed.global.concept}</p>}
                  {parsed.global.consistency_anchors && <p className="text-[12px] text-white/40 font-body">Consistency: {parsed.global.consistency_anchors}</p>}
                </div>
              )}

              {/* Shot tabs (storyboard only) */}
              {isStory && shots.length > 1 && (
                <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                  {shots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveLayer(i)}
                      className={`px-3 py-2 text-xs font-body uppercase tracking-wider rounded transition-colors ${
                        idx === i ? "bg-white text-black" : "text-white/50 hover:text-white"
                      }`}
                    >
                      Shot {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* The paste-ready prompt */}
              <div className="code-block">
                <div className="code-block-header">
                  <span className="text-xs text-white/40 font-mono">
                    {isStory ? `shot_${idx + 1}.prompt` : "video_prompt"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(shot.prompt || "")}
                      className="text-[11px] text-white/80 hover:text-white transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10"
                    >
                      {copied ? "Copied!" : "🎬 Copy Prompt"}
                    </button>
                    {shot.negative_prompt && (
                      <button
                        onClick={() => copyText(shot.negative_prompt || "")}
                        className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
                      >
                        Copy Negative
                      </button>
                    )}
                    <button
                      onClick={() => downloadFile(json, `video-prompt-${Date.now()}.json`, "application/json")}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      ⬇ JSON
                    </button>
                  </div>
                </div>
                <div className="code-block-body custom-scrollbar max-h-[300px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-white/90 leading-relaxed font-body">
                    {shot.prompt || "No prompt generated."}
                  </pre>
                </div>
                {shot.negative_prompt && (
                  <div className="px-4 py-3 border-t border-white/5">
                    <span className="text-[10px] text-white/30 font-body uppercase tracking-[0.2em]">Negative</span>
                    <p className="text-[12px] text-white/45 font-body mt-1">{shot.negative_prompt}</p>
                  </div>
                )}
              </div>

              {/* Full structured JSON (secondary) */}
              <details className="code-block">
                <summary className="code-block-header cursor-pointer list-none text-xs text-white/40 font-mono">
                  Full structured JSON (camera · timing · audio · settings)
                </summary>
                <div className="code-block-body custom-scrollbar max-h-[400px] overflow-y-auto">
                  <pre><code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(parsed, null, 2)) }} /></pre>
                </div>
              </details>

              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-white/15 font-body">
                  Paste the prompt into {parsed?.video_settings?.style ? "your video model" : "Runway / Kling / Veo"}
                </span>
                <button
                  onClick={onRegenerate}
                  className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Regenerate
                </button>
              </div>
            </div>
          );
        })()}

        {/* Deep Research — 10-Section structured JSON output */}
        {json && !isLoading && mode === "deep_research" && (() => {
          let parsed: any = {};
          try { parsed = JSON.parse(json); } catch { parsed = {}; }
          const sectionDefs = [
            { key: "section_01_executive_summary", label: "Executive Summary" },
            { key: "section_02_market_landscape", label: "Market Landscape" },
            { key: "section_03_competitor_deep_dive", label: "Competitor Deep Dive" },
            { key: "section_04_brand_strategy", label: "Brand Strategy" },
            { key: "section_05_visual_identity", label: "Visual Identity" },
            { key: "section_06_messaging_content", label: "Messaging & Content" },
            { key: "section_07_website_strategy", label: "Website Strategy" },
            { key: "section_08_website_sitemap", label: "Website Sitemap" },
            { key: "section_09_design_system", label: "Design System" },
            { key: "section_10_action_plan", label: "Action Plan" },
          ];
          const sections = [...sectionDefs, { key: "full_report", label: "Full Report" }];

          // Helper: format sub-field key to readable label
          const formatSubKey = (key: string) =>
            key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          // Helper: get section content as flat text for copying
          const getSectionText = (sectionKey: string): string => {
            // Full report = client-side merge of all sections
            if (sectionKey === "full_report") {
              return sectionDefs
                .map((s) => `## ${s.label}\n\n${getSectionText(s.key)}`)
                .join("\n\n---\n\n");
            }
            const data = parsed[sectionKey];
            if (!data) return "";
            if (typeof data === "string") return data;
            if (typeof data === "object") {
              return Object.entries(data)
                .map(([k, v]) => `### ${formatSubKey(k)}\n\n${v}`)
                .join("\n\n---\n\n");
            }
            return String(data);
          };

          const handleDownloadReport = () => {
            const reportText = typeof parsed.full_report === "string"
              ? parsed.full_report
              : sections
                  .filter(s => s.key.startsWith("section_"))
                  .map(s => `## ${s.label}\n\n${getSectionText(s.key)}`)
                  .join("\n\n---\n\n");
            downloadFile(reportText, `research-report-${Date.now()}.md`, "text/markdown");
          };

          // Generate beautiful standalone HTML report
          const handleDownloadHtml = () => {
            // Convert markdown-like text to HTML
            const mdToHtml = (text: string): string => {
              if (!text) return "";
              return text
                // Tables: detect markdown tables and convert
                .replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
                  const headerCells = header.split("|").filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join("");
                  const rows = body.trim().split("\n").map((row: string) => {
                    const cells = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join("");
                    return `<tr>${cells}</tr>`;
                  }).join("");
                  return `<div class="table-wrap"><table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
                })
                // Bold
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                // Italic
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                // Inline code
                .replace(/`(.+?)`/g, "<code>$1</code>")
                // Numbered lists
                .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>')
                // Bullet points
                .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
                // Wrap consecutive li elements in ul/ol
                .replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, "<ul>$1</ul>")
                // Line breaks to paragraphs
                .replace(/\n\n+/g, "</p><p>")
                .replace(/\n/g, "<br>")
                ;
            };

            const sectionHtmlBlocks = sectionDefs.map((s, i) => {
              const data = parsed[s.key];
              if (!data || typeof data !== "object") return "";

              const subFields = Object.entries(data).map(([subKey, subValue]) => {
                const content = mdToHtml(String(subValue));
                return `
                  <div class="sub-section">
                    <h3>${formatSubKey(subKey)}</h3>
                    <div class="content"><p>${content}</p></div>
                  </div>`;
              }).join("");

              return `
                <section class="report-section" id="section-${i + 1}">
                  <div class="section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <div class="section-number">${String(i + 1).padStart(2, "0")}</div>
                    <h2>${s.label}</h2>
                    <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div class="section-body">${subFields}</div>
                </section>`;
            }).join("");

            const businessName = (parsed.section_01_executive_summary?.research_overview || "").match(/for\s+([^,]+)/i)?.[1] || "Research Report";

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${businessName} — Deep Research Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface-2: #1a1a24;
    --border: rgba(255,255,255,0.06);
    --text: #e8e8ed;
    --text-secondary: rgba(255,255,255,0.55);
    --text-muted: rgba(255,255,255,0.3);
    --accent: #6366f1;
    --accent-glow: rgba(99,102,241,0.15);
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }

  /* Hero */
  .hero {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1035 50%, #0f0f1a 100%);
    padding: 80px 40px 60px;
    text-align: center;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12), transparent 70%);
  }
  .hero h1 {
    font-size: clamp(28px, 5vw, 48px);
    font-weight: 800;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    margin-bottom: 12px;
  }
  .hero .subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
    position: relative;
  }
  .hero .meta {
    margin-top: 24px;
    display: flex;
    gap: 24px;
    justify-content: center;
    flex-wrap: wrap;
    position: relative;
  }
  .hero .meta span {
    font-size: 12px;
    color: var(--text-muted);
    padding: 6px 16px;
    background: rgba(255,255,255,0.04);
    border-radius: 100px;
    border: 1px solid var(--border);
  }

  /* Navigation */
  .toc {
    max-width: 900px;
    margin: 40px auto 20px;
    padding: 0 24px;
  }
  .toc-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .toc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }
  .toc-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    text-decoration: none;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .toc-item:hover {
    background: var(--surface-2);
    color: var(--text);
    border-color: rgba(99,102,241,0.3);
  }
  .toc-item .num {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    min-width: 22px;
  }

  /* Sections */
  .container { max-width: 900px; margin: 0 auto; padding: 20px 24px 80px; }
  .report-section {
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    overflow: hidden;
    transition: all 0.3s;
  }
  .report-section:hover { border-color: rgba(255,255,255,0.1); }
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
  }
  .section-header:hover { background: rgba(255,255,255,0.02); }
  .section-number {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-glow);
    padding: 6px 10px;
    border-radius: 6px;
    min-width: 36px;
    text-align: center;
  }
  .section-header h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.3px;
    flex: 1;
  }
  .chevron { transition: transform 0.3s; color: var(--text-muted); }
  .collapsed .chevron { transform: rotate(-90deg); }
  .collapsed .section-body { display: none; }
  .section-body { padding: 0 24px 24px; }

  /* Sub-sections */
  .sub-section {
    padding: 20px 0;
    border-bottom: 1px solid var(--border);
  }
  .sub-section:last-child { border-bottom: none; }
  .sub-section h3 {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sub-section h3::before {
    content: '';
    width: 3px;
    height: 14px;
    background: var(--accent);
    border-radius: 2px;
  }

  /* Content */
  .content { color: var(--text-secondary); font-size: 14px; line-height: 1.8; }
  .content p { margin-bottom: 12px; }
  .content strong { color: var(--text); font-weight: 600; }
  .content ul { padding-left: 20px; margin: 12px 0; }
  .content li { margin-bottom: 8px; }
  .content li.numbered { list-style: decimal; }
  .content code {
    background: rgba(99,102,241,0.1);
    color: #a5b4fc;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  /* Tables */
  .table-wrap {
    overflow-x: auto;
    margin: 16px 0;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    background: var(--surface-2);
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }

  /* Footer */
  .footer {
    text-align: center;
    padding: 40px 24px;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 12px;
  }

  /* Print */
  @media print {
    body { background: #fff; color: #1a1a1a; font-size: 12px; }
    .hero { background: #f8f8fa; padding: 40px 20px; }
    .hero h1 { background: none; -webkit-text-fill-color: #1a1a1a; }
    .report-section { border-color: #e5e5e5; background: #fff; break-inside: avoid; }
    .section-header { cursor: default; }
    .collapsed .section-body { display: block !important; }
    .chevron { display: none; }
    .toc { display: none; }
    .content, td, .hero .subtitle, .hero .meta span { color: #444; }
    th { background: #f0f0f0; color: #1a1a1a; }
    .sub-section h3 { color: #4338ca; }
    .section-number { background: #ede9fe; color: #4338ca; }
  }

  @media (max-width: 640px) {
    .hero { padding: 48px 20px 40px; }
    .toc-grid { grid-template-columns: 1fr; }
    .section-header { padding: 16px; }
    .section-body { padding: 0 16px 16px; }
  }
</style>
</head>
<body>
  <header class="hero">
    <h1>${businessName}</h1>
    <p class="subtitle">Deep Research Report</p>
    <div class="meta">
      <span>Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      <span>${sectionDefs.length} Sections</span>
      <span>Powered by Multia Prompt Studio</span>
    </div>
  </header>

  <nav class="toc">
    <div class="toc-label">Table of Contents</div>
    <div class="toc-grid">
      ${sectionDefs.map((s, i) => `<a class="toc-item" href="#section-${i + 1}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${s.label}</a>`).join("")}
    </div>
  </nav>

  <main class="container">
    ${sectionHtmlBlocks}
  </main>

  <footer class="footer">
    ${businessName} — Deep Research Report &middot; Generated by Multia Prompt Studio &middot; ${new Date().getFullYear()}
  </footer>
</body>
</html>`;

            downloadFile(html, `research-report-${Date.now()}.html`, "text/html");
          };

          const currentSectionKey = sections[activeLayer]?.key;
          const currentData = parsed[currentSectionKey];
          const currentText = getSectionText(currentSectionKey);

          return (
            <div className="space-y-4">
              {/* Section tabs — scrollable */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-white/5 rounded-lg border border-white/10">
                {sections.map((section, i) => (
                  <button
                    key={section.key}
                    onClick={() => setActiveLayer(i)}
                    className={`px-2.5 py-2 text-[10px] font-body uppercase tracking-wider rounded transition-colors flex items-center gap-1 ${
                      activeLayer === i ? "bg-white text-black" : "text-white/50 hover:text-white"
                    }`}
                  >
                    <span className="hidden sm:inline">{section.label}</span>
                    <span className="sm:hidden">{section.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {/* Active section content */}
              <div className="code-block">
                <div className="code-block-header">
                  <span className="text-xs text-white/40 font-body flex items-center gap-2">
                    {sections[activeLayer]?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(currentText)}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
                    >
                      {copied ? "Copied!" : "Copy Section"}
                    </button>
                    <button
                      onClick={() => copyText(typeof parsed.full_report === "string" ? parsed.full_report : JSON.stringify(parsed, null, 2))}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      📄 Copy Full Report
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                    >
                      ⬇ Download .md
                    </button>
                    <button
                      onClick={handleDownloadHtml}
                      className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 border border-indigo-500/30 hover:border-indigo-500/60"
                    >
                      🌐 Download HTML
                    </button>
                  </div>
                </div>

                <div className="code-block-body custom-scrollbar max-h-[700px] overflow-y-auto">
                  {/* If section is a nested object, render sub-fields */}
                  {currentData && typeof currentData === "object" ? (
                    <div className="space-y-6 p-2">
                      {Object.entries(currentData).map(([subKey, subValue]) => (
                        <div key={subKey} className="border-b border-white/5 pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[11px] font-body uppercase tracking-wider text-white/50 font-semibold">
                              {formatSubKey(subKey)}
                            </h4>
                            <button
                              onClick={() => copyText(String(subValue))}
                              className="text-[10px] text-white/20 hover:text-white/60 transition-colors font-body uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-white/5"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-body">
                            {String(subValue)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-body">
                      {currentText || "No content generated for this section."}
                    </pre>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-white/15 font-body">
                    Section {activeLayer + 1} of {sections.length}
                    {currentText && (
                      <> · {currentText.length.toLocaleString()} chars</>
                    )}
                    {currentData && typeof currentData === "object" && (
                      <> · {Object.keys(currentData).length} sub-fields</>
                    )}
                  </span>
                  <button
                    onClick={onRegenerate}
                    className="text-[11px] text-white/30 hover:text-white/70 transition-colors font-body uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
