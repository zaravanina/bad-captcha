"use client";

import { defineStep, type StepProps } from "@/captcha/types";

export default defineStep({
  sense: "Emotion",
  title: "Emotion step (placeholder)",
  instructions: "Whoever owns Emotion: replace this file with your step.",
  Component: Emotion,
});

function Emotion({ pass }: StepProps) {
  return (
    <button onClick={pass} className="border border-dashed border-neutral-400 py-6 text-sm text-neutral-500">
      Not built yet, click to skip
    </button>
  );
}
