"use client";

import { useEffect, useRef, useState } from "react";
import { defineStep, type StepProps } from "@/captcha/types";

export default defineStep({
  devLabel: "Emotion",
  sense: "CAPTCHA 06 — EMOTIONS",
  title: "You're almost done! 🎉",
  instructions: "How would you rate your experience?",
  Component: Emotion,
});

type Rating = 1 | 2 | 3 | 4 | 5;
type EmotionState =
  | { stage: "select" }
  | { stage: "response"; rating: 2 | 3 | 4 | 5 }
  | { stage: "confirm-first" | "confirm-second"; rating: 1 };

const responses = {
  2: {
    message: "A little harsh. Try again.",
    button: "Reconsider my rating",
  },
  3: {
    message: "Too neutral. Try feeling something.",
    button: "Try feeling something",
  },
  4: {
    message: "Suspiciously positive. Try again.",
    button: "Prove I'm human",
  },
  5: {
    message: "Nobody enjoyed it that much.",
    button: "I'm not a robot!",
  },
};

const buttonStyle = "w-full px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

function Emotion({ pass, fail, restart }: StepProps) {
  const [state, setState] = useState<EmotionState>({ stage: "select" });
  const [previewRating, setPreviewRating] = useState<Rating | null>(null);
  const completed = useRef(false);
  const firstStar = useRef<HTMLButtonElement>(null);
  const selectedRating = state.stage === "select" ? 0 : state.rating;

  useEffect(() => {
    if (state.stage === "select") firstStar.current?.focus();
  }, [state.stage]);

  function selectRating(rating: Rating) {
    if (state.stage !== "select") return;
    setPreviewRating(null);
    if (rating === 1) setState({ stage: "confirm-first", rating: 1 });
    else {
      setState({ stage: "response", rating });
      fail("");
    }
  }

  function reconsiderRating() {
    setState({ stage: "select" });
    setPreviewRating(null);
  }

  function confirmNegativeFeedback() {
    if (state.stage === "confirm-first") {
      setState({ stage: "confirm-second", rating: 1 });
    } else if (state.stage === "confirm-second" && !completed.current) {
      completed.current = true;
      pass();
    }
  }

  const confirmationButtons = [
    <button key="confirm" type="button" onClick={confirmNegativeFeedback} className={`${buttonStyle} bg-neutral-900 text-white hover:bg-neutral-800`}>
      Yes, I&apos;m sure
    </button>,
    <button key="restart" type="button" onClick={restart} className={`${buttonStyle} border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50`}>
      Actually, let&apos;s try again
    </button>,
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm italic text-neutral-500">We value your honest feedback.</p>
      <div role="group" aria-label="Rate your experience from 1 to 5 stars" className="flex justify-center gap-1" onMouseLeave={() => setPreviewRating(null)}>
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <button
            key={rating}
            ref={rating === 1 ? firstStar : undefined}
            type="button"
            aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
            aria-pressed={selectedRating === rating}
            disabled={state.stage !== "select"}
            onMouseEnter={() => setPreviewRating(rating)}
            onFocus={() => setPreviewRating(rating)}
            onBlur={() => setPreviewRating(null)}
            onClick={() => selectRating(rating)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-sm text-4xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-default ${rating <= (state.stage === "select" ? previewRating ?? 0 : selectedRating) ? "text-amber-400" : "text-neutral-300"}`}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
      </div>
      {state.stage === "select" ? (
        <p className="text-center text-xs text-neutral-400">Select a rating to continue.</p>
      ) : (
        <div key={state.stage} className="emotion-feedback flex flex-col gap-4 border-t border-neutral-200 pt-5">
          <div role="status" aria-live="polite" aria-atomic="true">
            {state.rating !== 1 && (
              <p className="mb-2 text-sm text-red-600">Wrong</p>
            )}
            <p className="text-sm leading-relaxed text-neutral-600">
              {state.rating === 1
                ? "Are you sure? We worked hard on this."
                : responses[state.rating].message}
            </p>
            {state.stage === "confirm-second" && (
              <p className="mt-3 text-sm font-semibold text-neutral-900">Still sure? Last chance.</p>
            )}
          </div>
          {state.rating === 1 ? (
            <div className="grid grid-cols-1 gap-2">
              {state.stage === "confirm-second" ? [...confirmationButtons].reverse() : confirmationButtons}
            </div>
          ) : (
            <button type="button" onClick={reconsiderRating} className={`${buttonStyle} bg-neutral-900 text-white hover:bg-neutral-800`}>
              {responses[state.rating].button}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
