import type { ComponentType } from "react";

export type StepProps = {
  pass: () => void;
  fail: (message?: string) => void;
};

export type Step = {
  sense: string;
  title: string;
  instructions: string;
  Component: ComponentType<StepProps>;
};

export const defineStep = (step: Step) => step;
