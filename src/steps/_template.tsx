"use client";

import { useState } from "react";
import { defineStep, type StepProps } from "@/captcha/types";

export default defineStep({
  sense: "Your sense",
  title: "Type the magic word",
  instructions: 'Type "human" and press Check.',
  Component: MyStep,
});

function MyStep({ pass, fail }: StepProps) {
  const [value, setValue] = useState("");

  function check() {
    if (value === "human") pass();
    else fail("Wrong word.");
  }

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border border-neutral-300 px-2 py-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="bg-neutral-800 px-3 py-1 text-white" onClick={check}>
        Check
      </button>
    </div>
  );
}
