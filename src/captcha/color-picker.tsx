"use client";

import { useEffect, useRef, useState } from "react";

export type RGB = [number, number, number];
export type Mode = "RGB" | "HSL" | "CMYK";

export const CHANNELS: Record<Mode, { label: string; max: number; wraps?: boolean }[]> = {
  RGB: [
    { label: "Red", max: 255 },
    { label: "Green", max: 255 },
    { label: "Blue", max: 255 },
  ],
  HSL: [
    { label: "Hue", max: 360, wraps: true },
    { label: "Saturation", max: 100 },
    { label: "Lightness", max: 100 },
  ],
  CMYK: [
    { label: "Cyan", max: 100 },
    { label: "Magenta", max: 100 },
    { label: "Yellow", max: 100 },
    { label: "Key (black)", max: 100 },
  ],
};

export function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

export function rgbToHsl([r, g, b]: RGB): RGB {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return [Math.round((h + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}

export function rgbToCmyk([r, g, b]: RGB) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return [0, 0, 0, 100];
  const ch = (v: number) => Math.round(((1 - v / 255 - k) / (1 - k)) * 100);
  return [ch(r), ch(g), ch(b), Math.round(k * 100)];
}

export function valuesIn(rgb: RGB, mode: Mode): number[] {
  if (mode === "RGB") return [...rgb];
  if (mode === "HSL") return rgbToHsl(rgb);
  return rgbToCmyk(rgb);
}

export function toRgb(values: number[], mode: Mode): RGB {
  if (mode === "RGB") return values as RGB;
  if (mode === "HSL") return hslToRgb(values[0], values[1] / 100, values[2] / 100);
  const [c, m, y, k] = values.map((v) => v / 100);
  return [c, m, y].map((v) => Math.round(255 * (1 - v) * (1 - k))) as RGB;
}

export const css = (rgb: RGB) => `rgb(${rgb.join(",")})`;

export type Guess = { mode: Mode; values: number[]; rgb: RGB };

export function useColorPicker() {
  const [mode, setModeState] = useState<Mode>("RGB");
  const [values, setValues] = useState<string[]>(["", "", ""]);

  function setMode(next: Mode) {
    setModeState(next);
    setValues(CHANNELS[next].map(() => ""));
  }

  function read(): Guess | null {
    const channels = CHANNELS[mode];
    const nums = values.map(Number);
    const invalid =
      values.some((v) => v.trim() === "") ||
      nums.some((v, i) => !Number.isFinite(v) || v < 0 || v > channels[i].max);
    return invalid ? null : { mode, values: nums, rgb: toRgb(nums, mode) };
  }

  return { mode, setMode, values, setValues, read };
}

export type ColorPickerState = ReturnType<typeof useColorPicker>;

export function ColorPicker({ picker, onCheck }: { picker: ColorPickerState; onCheck: () => void }) {
  const { mode, setMode, values, setValues } = picker;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1" role="radiogroup" aria-label="Color format">
        {(Object.keys(CHANNELS) as Mode[]).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 border px-3 py-1.5 text-sm font-semibold ${
              mode === m ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${CHANNELS[mode].length}, minmax(0, 1fr))` }}>
        {CHANNELS[mode].map((ch, i) => (
          <label key={`${mode}-${ch.label}`} className="flex flex-col gap-1 text-xs text-neutral-600">
            {ch.label}
            <input
              type="number"
              min={0}
              max={ch.max}
              value={values[i]}
              onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={`0–${ch.max}`}
              className="w-full border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
            />
          </label>
        ))}
      </div>

      <button onClick={onCheck} className="bg-neutral-900 py-2 text-sm font-semibold text-white">
        Check
      </button>
    </div>
  );
}

export function useFlash<T>(ms: number) {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flash(next: T) {
    clearTimeout(timer.current);
    setValue(next);
    timer.current = setTimeout(() => setValue(null), ms);
  }

  return [value, flash] as const;
}
