"use client";

import { useState } from "react";
import { defineStep, type StepProps } from "@/captcha/types";
import {
  CHANNELS,
  ColorPicker,
  css,
  hslToRgb,
  useColorPicker,
  useFlash,
  valuesIn,
  type RGB,
} from "@/captcha/color-picker";

const TOLERANCE = 5;
const SHOW_GUESS_MS = 3000;
// Demo cheat: from the third Check on, entering these RGB values always passes.
const CHEAT_FROM_ATTEMPT = 3;
const CHEAT_RGB = [50, 80, 10];

export default defineStep({
  sense: "See",
  title: "Match the color",
  instructions: "Enter the values of the color shown. Pick RGB, HSL or CMYK.",
  Component: ColorMatch,
});

function randomColor(): RGB {
  return hslToRgb(Math.random() * 360, 0.3 + Math.random() * 0.7, 0.2 + Math.random() * 0.6);
}

function ColorMatch({ pass, fail }: StepProps) {
  const [target] = useState(randomColor);
  const picker = useColorPicker();
  const [shownGuess, showGuess] = useFlash<RGB>(SHOW_GUESS_MS);
  const [attempts, setAttempts] = useState(0);

  function check() {
    const attempt = attempts + 1;
    setAttempts(attempt);
    const guess = picker.read();
    if (!guess) return fail("Fill in every value within its range.");

    const isCheat =
      attempt >= CHEAT_FROM_ATTEMPT && guess.mode === "RGB" && guess.values.every((v, i) => v === CHEAT_RGB[i]);
    if (isCheat) return pass();

    const channels = CHANNELS[guess.mode];
    const expected = valuesIn(target, guess.mode);
    const diffs = guess.values.map((v, i) => {
      const d = Math.abs(v - expected[i]);
      return channels[i].wraps ? Math.min(d, channels[i].max - d) : d;
    });

    if (diffs.every((d) => d === 0)) {
      showGuess(guess.rgb);
      return fail("Too perfect. Only a robot matches it exactly.");
    }
    if (diffs.some((d) => d > TOLERANCE)) {
      showGuess(guess.rgb);
      return fail("That is not the same color.");
    }
    pass();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-32 w-full overflow-hidden rounded">
        <div className="flex-1" style={{ background: css(target) }} />
        {shownGuess && (
          <div className="relative flex-1" style={{ background: css(shownGuess) }}>
            <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Your color
            </span>
          </div>
        )}
      </div>

      <ColorPicker picker={picker} onCheck={check} />
    </div>
  );
}
