"use client";

import { useState } from "react";
import type { PosterClarificationQuestion } from "@/lib/poster-types";

interface PosterStudioClarificationProps {
  questions: PosterClarificationQuestion[];
  isLoading: boolean;
  onSubmit: (answers: Record<string, string>) => void;
}

export function PosterStudioClarification({
  questions,
  isLoading,
  onSubmit,
}: PosterStudioClarificationProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered = questions.every((question) => Boolean(answers[question.id]));

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
        {questions.map((question) => (
          <fieldset key={question.id} className="poster-clarification-question">
            <legend>{question.question}</legend>
            <div className="poster-clarification-options" role="radiogroup" aria-label={question.question}>
              {question.options.map((option) => {
                const selected = answers[question.id] === option;
                return (
                  <button
                    type="button"
                    key={option}
                    role="radio"
                    aria-checked={selected}
                    disabled={isLoading}
                    className={`poster-clarification-option ${selected ? "is-selected" : ""}`}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        className="btn-multia poster-clarification-continue"
        disabled={!allAnswered || isLoading}
        onClick={() => onSubmit(answers)}
      >
        {isLoading ? "Generating…" : "Continue"}
      </button>
    </section>
  );
}
