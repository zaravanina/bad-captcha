"use client";

import { useState, useSyncExternalStore } from "react";
import { steps } from "@/steps";
import DevBar, { devBarEnabled } from "./DevBar";
import FinalScreen from "./FinalScreen";
import type { Step, StepProps } from "./types";

const subscribe = () => () => {};

export default function CaptchaFlow() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <main className="grid flex-1 place-items-center bg-neutral-200 p-4">
      <div className="w-full max-w-md bg-white p-6 shadow-lg">
        {isClient ? <Flow /> : <p className="text-sm text-neutral-400">Loading…</p>}
      </div>
    </main>
  );
}

function stepFromUrl() {
  const n = Number(new URLSearchParams(window.location.search).get("step"));
  return n >= 1 && n <= steps.length ? n - 1 : 0;
}

function Flow() {
  const [index, setIndex] = useState(stepFromUrl);
  const [fails, setFails] = useState(0);
  const [message, setMessage] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  const [run, setRun] = useState(0);
  const [showDevBar] = useState(devBarEnabled);

  const done = index >= steps.length;

  function pass() {
    setMessage("");
    if (index + 1 >= steps.length) setSeconds(Math.round((Date.now() - startedAt) / 1000));
    setIndex(index + 1);
  }

  function fail(text = "Wrong. Try again.") {
    setFails((f) => f + 1);
    setMessage(text);
  }

  function restart() {
    setIndex(0);
    setFails(0);
    setMessage("");
    setStartedAt(Date.now());
    setRun((r) => r + 1);
  }

  function goTo(i: number) {
    if (i >= steps.length) setSeconds(Math.round((Date.now() - startedAt) / 1000));
    setIndex(i);
    setMessage("");
    setRun((r) => r + 1);
    const url = new URL(window.location.href);
    if (i < steps.length) url.searchParams.set("step", String(i + 1));
    else url.searchParams.delete("step");
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      {done ? (
        <FinalScreen seconds={seconds} fails={fails} onRestart={restart} />
      ) : (
        <StepView step={steps[index]} index={index} stepKey={`${run}-${index}`} message={message} pass={pass} fail={fail} />
      )}
      {showDevBar && <DevBar current={index} onGoTo={goTo} />}
    </>
  );
}

type StepViewProps = StepProps & {
  step: Step;
  index: number;
  stepKey: string;
  message: string;
};

function StepView({ step, index, stepKey, message, pass, fail }: StepViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between text-xs text-neutral-500">
          <span className="font-semibold uppercase tracking-wide">Verify you are human</span>
          <span>
            Step {index + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 h-1 bg-neutral-200">
          <div className="h-full bg-neutral-800 transition-all" style={{ width: `${(index / steps.length) * 100}%` }} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{step.sense}</p>
        <h1 className="text-xl font-bold">{step.title}</h1>
        <p className="text-sm text-neutral-500">{step.instructions}</p>
      </div>

      <step.Component key={stepKey} pass={pass} fail={fail} />

      <p className="min-h-5 text-sm text-red-600" role="status">
        {message}
      </p>
    </div>
  );
}
