"use client";

import { useState } from "react";
import type { PosterClarificationQuestion } from "@/lib/poster-types";

interface PosterStudioClarificationProps {
  questions: PosterClarificationQuestion[];
  isLoading: boolean;
  onSubmit: (answers: Record<string, string>) => void;
  /** Re-asks the model for different options, excluding the ones already shown. */
  onRequestDifferentOptions: () => void;
}

export function PosterStudioClarification({
  questions,
  isLoading,
  onSubmit,
  onRequestDifferentOptions,
}: PosterStudioClarificationProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Which questions the user has switched into free-text mode.
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});

  const setAnswer = (id: string, value: string) =>
    setAnswers((current) => ({ ...current, [id]: value }));

  const allAnswered = questions.every((question) => Boolean(answers[question.id]?.trim()));

  return (
    <section className="poster-clarification" aria-label="Clarifying questions">
      <div className="poster-block-heading">
        <div>
          <span>Before generating</span>
          <h2>A couple of quick questions</h2>
        </div>
        <p>GPT-5.6 Sol wants to confirm the direction before writing the production prompt.</p>
      </div>

      <div className="poster-clarification-list">
        {questions.map((question) => {
          const isCustom = Boolean(customMode[question.id]);
          return (
            <fieldset key={question.id} className="poster-clarification-question">
              <legend>{question.question}</legend>
              <div
                className="poster-clarification-options"
                role="radiogroup"
                aria-label={question.question}
              >
                {question.options.map((option) => {
                  const selected = !isCustom && answers[question.id] === option;
                  return (
                    <button
                      type="button"
                      key={option}
                      role="radio"
                      aria-checked={selected}
                      disabled={isLoading}
                      className={`poster-clarification-option ${selected ? "is-selected" : ""}`}
                      onClick={() => {
                        setCustomMode((current) => ({ ...current, [question.id]: false }));
                        setAnswer(question.id, option);
                      }}
                    >
                      {option}
                    </button>
                  );
                })}

                <button
                  type="button"
                  role="radio"
                  aria-checked={isCustom}
                  disabled={isLoading}
                  className={`poster-clarification-option poster-clarification-custom-toggle ${
                    isCustom ? "is-selected" : ""
                  }`}
                  onClick={() => {
                    const next = !isCustom;
                    setCustomMode((current) => ({ ...current, [question.id]: next }));
                    // Leaving custom mode clears the typed value so a stale answer
                    // can't be submitted from a hidden input.
                    if (!next) setAnswer(question.id, "");
                  }}
                >
                  Something else…
                </button>
              </div>

              {isCustom && (
                <label className="poster-clarification-custom">
                  <span>Describe the figure you want</span>
                  <input
                    type="text"
                    autoFocus
                    maxLength={200}
                    disabled={isLoading}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswer(question.id, event.currentTarget.value)}
                    placeholder="e.g. A brass gullak shaped like a temple hundi, coins at the slot"
                  />
                  <small>Name a real object and what it should mean. {200 - (answers[question.id]?.length ?? 0)} characters left.</small>
                </label>
              )}
            </fieldset>
          );
        })}
      </div>

      <div className="poster-clarification-actions">
        <button
          type="button"
          className="btn-multia poster-clarification-continue"
          disabled={!allAnswered || isLoading}
          onClick={() => onSubmit(answers)}
        >
          {isLoading ? "Generating…" : "Continue"}
        </button>
        <button
          type="button"
          className="poster-clarification-more"
          disabled={isLoading}
          onClick={onRequestDifferentOptions}
        >
          Show me different options
        </button>
      </div>
    </section>
  );
}
