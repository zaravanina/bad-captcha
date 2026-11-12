"use client";

import { useEffect, useState } from "react";
import { steps } from "@/steps";

type Props = {
  current: number;
  onGoTo: (index: number) => void;
};

export function devBarEnabled() {
  return process.env.NODE_ENV === "development" || new URLSearchParams(window.location.search).has("dev");
}

export default function DevBar({ current, onGoTo }: Props) {
  const [open, setOpen] = useState(true);
  const last = steps.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.key === "ArrowRight") onGoTo(Math.min(current + 1, last));
      else if (e.key === "ArrowLeft") onGoTo(Math.max(current - 1, 0));
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, last, onGoTo]);

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-amber-400 text-black" : "bg-white/10 text-white hover:bg-white/20"}`;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-2xl bg-neutral-900/95 p-2 font-sans shadow-xl">
      <button onClick={() => setOpen(!open)} className="px-2 text-[10px] font-bold tracking-widest text-amber-400">
        DEV {open ? "▾" : "▸"}
      </button>
      {open && (
        <>
          {steps.map((s, i) => (
            <button key={i} onClick={() => onGoTo(i)} className={pill(current === i)}>
              {i + 1}. {s.sense}
            </button>
          ))}
          <button onClick={() => onGoTo(last)} className={pill(current === last)}>
            Final
          </button>
          <button onClick={() => onGoTo(current)} className={pill(false)} title="Restart this step">
            ↻
          </button>
          <span className="hidden px-1 text-[10px] text-white/40 sm:inline">Alt + ← →</span>
        </>
      )}
    </div>
  );
}
