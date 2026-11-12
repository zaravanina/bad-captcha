"use client";

import { useEffect, useRef, useState } from "react";
import { defineStep, type StepProps } from "@/captcha/types";

const MIN_HZ = 200;
const MAX_HZ = 800;
const TOLERANCE_HZ = 12;
const MAX_LISTENS = 3;

export default defineStep({
  sense: "Hear",
  title: "Match the pitch",
  instructions: "listen to the tone. make yours the same.",
  Component: Hear,
});

function Hear({ pass, fail }: StepProps) {
  const [target] = useState(() => Math.round(MIN_HZ + Math.random() * (MAX_HZ - MIN_HZ)));
  const [guess, setGuess] = useState(MIN_HZ);
  const [listens, setListens] = useState(0);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => void audio.current?.close(), []);

  function beep(hz: number, seconds: number) {
    audio.current ??= new AudioContext();
    const ctx = audio.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function listen() {
    if (listens >= MAX_LISTENS) return;
    setListens(listens + 1);
    beep(target, 0.6);
  }

  function verify() {
    if (Math.abs(guess - target) <= TOLERANCE_HZ) pass();
    else fail("That is not the same pitch.");
  }

  return (
    <div className="flex select-none flex-col gap-4 bg-[#1f1f22] p-4 font-[Arial,sans-serif] text-[#2c2c30]">
      <div className="flex items-center justify-between">
        <button
          onClick={listen}
          disabled={listens >= MAX_LISTENS}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#2a2a2e] text-lg text-[#38383d] outline-none disabled:opacity-40"
        >
          ▶
        </button>
        <span className="text-[10px]">
          {MAX_LISTENS - listens} listens left
        </span>
      </div>
      <input
        type="range"
        min={MIN_HZ}
        max={MAX_HZ}
        value={guess}
        onChange={(e) => setGuess(Number(e.target.value))}
        onPointerUp={() => beep(guess, 0.3)}
        className="w-full accent-[#2f2f34]"
      />
      <button onClick={verify} className="self-end bg-[#26262a] px-4 py-2 text-xs font-bold outline-none">
        verify
      </button>
    </div>
  );
}
