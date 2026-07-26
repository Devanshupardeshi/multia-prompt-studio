"use client";

import { useEffect, useRef, useState } from "react";

interface ReasoningTraceProps {
  /** Accumulated reasoning text; empty until the model starts thinking. */
  text: string;
  /** Coarse stage label, e.g. "Writing the production contract". */
  status: string | null;
  isActive: boolean;
  /** Shown while waiting for the first reasoning token. */
  idleLabel?: string;
}

/**
 * Live view of the model's reasoning while a long generation runs.
 *
 * These calls take 30–90 seconds. Without this the interface is a spinner and the
 * only honest thing it can say is "wait" — so a slow run is indistinguishable from
 * a hung one. Showing the actual trace makes the wait legible, and it doubles as
 * design feedback: you can see which metaphor is being considered and why, and
 * kill a run early if it is heading somewhere wrong.
 */
export function ReasoningTrace({ text, status, isActive, idleLabel }: ReasoningTraceProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Follow the tail as it streams, the way a log viewer does.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [text]);

  if (!isActive && !text) return null;

  const hasText = text.trim().length > 0;

  return (
    <section
      className={`poster-reasoning ${expanded ? "is-expanded" : ""}`}
      aria-label="Model reasoning"
    >
      <div className="poster-reasoning-head">
        <span className="poster-reasoning-status">
          {isActive && <i className="poster-reasoning-pulse" aria-hidden="true" />}
          {status ?? (isActive ? (idleLabel ?? "Thinking") : "Reasoning trace")}
        </span>
        {hasText && (
          <button type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {hasText ? (
        <div className="poster-reasoning-body custom-scrollbar" ref={scrollRef} aria-live="polite">
          <p>{text}</p>
        </div>
      ) : (
        <div className="poster-reasoning-idle">
          <span /><span /><span />
        </div>
      )}
    </section>
  );
}
