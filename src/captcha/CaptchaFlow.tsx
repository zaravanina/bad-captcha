"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { steps } from "@/steps";
import DevBar, { devBarEnabled } from "./DevBar";
import FinalScreen from "./FinalScreen";
import LoginScreen from "./LoginScreen";
import type { Step, StepProps } from "./types";

const subscribe = () => () => {};

const stepPositions = [
  "-translate-x-1 sm:-translate-x-[min(6vw,5.5rem)] sm:-translate-y-4",
  "translate-x-1 translate-y-2 sm:translate-x-[min(5vw,4.5rem)] sm:translate-y-7",
  "-translate-x-1 translate-y-2 sm:-translate-x-[min(4vw,3.5rem)] sm:translate-y-8",
  "translate-x-1 -translate-y-2 sm:translate-x-[min(6vw,5.5rem)] sm:-translate-y-7",
  "-translate-x-1 -translate-y-2 sm:-translate-x-[min(5vw,4.5rem)] sm:-translate-y-5",
];

export default function CaptchaFlow() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <main className="relative grid flex-1 place-items-center bg-neutral-200 px-4 pb-16 pt-24 text-neutral-900">
      {isClient ? <Flow /> : <div className="w-full max-w-md bg-white p-6 shadow-lg"><p className="text-sm text-neutral-400">Loading…</p></div>}
    </main>
  );
}

function stepFromUrl() {
  const n = Number(new URLSearchParams(window.location.search).get("step"));
  return Number.isInteger(n) && n >= 1 && n <= steps.length + 1 ? n - 1 : -1;
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
  const started = index >= 0;

  useEffect(() => {
    function restoreFromUrl() {
      setIndex(stepFromUrl());
      setMessage("");
      setRun((r) => r + 1);
    }
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  function navigateTo(i: number) {
    if (!Number.isInteger(i) || i < -1 || i > steps.length) return;
    const url = new URL(window.location.href);
    if (i === -1) url.searchParams.delete("step");
    else url.searchParams.set("step", String(i + 1));
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url);
    }
    setIndex(i);
  }

  function pass() {
    setMessage("");
    if (index + 1 >= steps.length) setSeconds(Math.round((Date.now() - startedAt) / 1000));
    navigateTo(index + 1);
  }

  function fail(text = "Wrong. Try again.") {
    setFails((f) => f + 1);
    setMessage(text);
  }

  function restart() {
    navigateTo(0);
    setFails(0);
    setSeconds(0);
    setMessage("");
    setStartedAt(Date.now());
    setRun((r) => r + 1);
  }

  function backToLogin() {
    navigateTo(-1);
    setFails(0);
    setMessage("");
    setSeconds(0);
    setStartedAt(Date.now());
    setRun((r) => r + 1);
  }

  function goTo(i: number) {
    if (i >= steps.length) setSeconds(Math.round((Date.now() - startedAt) / 1000));
    navigateTo(i);
    setMessage("");
    setRun((r) => r + 1);
  }

  return (
    <>
      {started && (
        <button
          type="button"
          onClick={backToLogin}
          className="absolute left-4 top-4 text-xs text-neutral-500 hover:text-neutral-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          Back to login
        </button>
      )}
      <div className={`w-full max-w-md bg-white p-6 shadow-lg ${started && !done ? stepPositions[index] ?? "" : ""}`}>
      {!started ? (
        <LoginScreen onVerify={() => {
          setStartedAt(Date.now());
          navigateTo(0);
        }} />
      ) : done ? (
        <FinalScreen seconds={seconds} fails={fails} onRestart={restart} />
      ) : (
        <StepView step={steps[index]} index={index} stepKey={`${run}-${index}`} message={message} pass={pass} fail={fail} restart={restart} />
      )}
      </div>
      {started && showDevBar && <DevBar current={index} onGoTo={goTo} />}
    </>
  );
}

type StepViewProps = StepProps & {
  step: Step;
  index: number;
  stepKey: string;
  message: string;
};

function StepView({ step, stepKey, message, pass, fail, restart }: StepViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between text-xs text-neutral-500">
          <span className="font-semibold uppercase tracking-wide">Verify you are human</span>
          <span>
            Step 1 of <span className="align-middle text-lg leading-none">∞</span>
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{step.sense}</p>
        <h1 className="text-xl font-bold">{step.title}</h1>
        <p className="text-sm text-neutral-500">{step.instructions}</p>
      </div>

      <step.Component key={stepKey} pass={pass} fail={fail} restart={restart} />

      <p className="min-h-5 text-sm text-red-600" role="status">
        {message}
      </p>
    </div>
  );
}
