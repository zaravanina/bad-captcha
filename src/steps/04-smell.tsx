"use client";

import { defineStep, type StepProps } from "@/captcha/types";
import { ColorPicker, css, rgbToHsl, useColorPicker, useFlash, type RGB } from "@/captcha/color-picker";

const SHOW_GUESS_MS = 3000;
const MINT_HUES = [90, 240];
const MIN_SATURATION = 20;
const MIN_LIGHTNESS = 15;
const MAX_LIGHTNESS = 85;

export default defineStep({
  sense: "Smell",
  title: "Smell the color",
  instructions: "Answer with a color. Pick RGB, HSL or CMYK.",
  Component: SmellColor,
});

function smellsLikeMint(rgb: RGB) {
  const [h, s, l] = rgbToHsl(rgb);
  if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) return false;
  return h >= MINT_HUES[0] && h <= MINT_HUES[1];
}

function SmellColor({ pass, fail }: StepProps) {
  const picker = useColorPicker();
  const [shownGuess, showGuess] = useFlash<RGB>(SHOW_GUESS_MS);

  function check() {
    const guess = picker.read();
    if (!guess) return fail("Fill in every value within its range.");
    if (smellsLikeMint(guess.rgb)) return pass();
    showGuess(guess.rgb);
    fail("That is not what mint smells like.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded bg-neutral-100 py-5">
        <div className="flex gap-3 text-5xl" aria-hidden>
          {["🌿", "🍃", "🌱"].map((p, i) => (
            <span key={p} style={{ transform: `rotate(${(i - 1) * 12}deg)` }}>
              {p}
            </span>
          ))}
        </div>
        <p className="px-4 text-center text-lg font-semibold">Which color matches the smell of mint?</p>
        {shownGuess && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 bg-white/90 px-2 py-1 text-[10px] font-semibold">
            <span className="h-4 w-4 rounded-sm" style={{ background: css(shownGuess) }} />
            Your color
          </div>
        )}
      </div>

      <ColorPicker picker={picker} onCheck={check} />
    </div>
  );
}
