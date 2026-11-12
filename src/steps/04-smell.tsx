"use client";

import { defineStep, type StepProps } from "@/captcha/types";

export default defineStep({
  sense: "Smell",
  title: "Smell step (placeholder)",
  instructions: "Whoever owns Smell: replace this file with your step.",
  Component: Smell,
});

function Smell({ pass }: StepProps) {
  return (
    <button onClick={pass} className="border border-dashed border-neutral-400 py-6 text-sm text-neutral-500">
      Not built yet, click to skip
    </button>
  );
}
