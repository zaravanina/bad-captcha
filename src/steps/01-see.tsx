"use client";

import { useEffect, useState } from "react";
import { defineStep, type StepProps } from "@/captcha/types";

const COLS = 5;
const ROWS = 6;
const TIME = 30;
const MAX_MOVES = 15;

type RGB = [number, number, number];

const PALETTES: [RGB, RGB, RGB, RGB][] = [
  [[220, 60, 60], [235, 200, 70], [60, 120, 210], [90, 190, 110]],
  [[200, 70, 150], [240, 150, 80], [70, 90, 190], [80, 190, 180]],
  [[180, 60, 70], [120, 170, 80], [150, 90, 180], [70, 160, 150]],
];

export default defineStep({
  sense: "See",
  title: "Sort the hues",
  instructions: "arrange the hues. it should feel right.",
  Component: HueSort,
});

type Game = {
  colors: RGB[];
  locked: boolean[];
  order: number[];
  moves: number;
  left: number;
  drift: number;
  note: string;
};

function newGame(note = ""): Game {
  const [tl, tr, bl, br] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const colors: RGB[] = [];
  const locked: boolean[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const u = x / (COLS - 1);
      const v = y / (ROWS - 1);
      colors.push(
        [0, 1, 2].map(
          (i) => (tl[i] * (1 - u) + tr[i] * u) * (1 - v) + (bl[i] * (1 - u) + br[i] * u) * v,
        ) as RGB,
      );
      locked.push((x === 0 || x === COLS - 1) && (y === 0 || y === ROWS - 1));
    }
  }
  const order = colors.map((_, i) => i);
  const free = order.filter((i) => !locked[i]);
  const shuffled = [...free].sort(() => Math.random() - 0.5);
  free.forEach((pos, k) => (order[pos] = shuffled[k]));
  return { colors, locked, order, moves: 0, left: TIME, drift: 0, note };
}

function hueShift([r, g, b]: RGB, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${cl(m[0] * r + m[1] * g + m[2] * b)},${cl(m[3] * r + m[4] * g + m[5] * b)},${cl(m[6] * r + m[7] * g + m[8] * b)})`;
}

function HueSort({ pass, fail }: StepProps) {
  const [game, setGame] = useState(() => newGame());
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setGame((g) =>
        g.left <= 1 ? newGame("too slow.") : { ...g, left: g.left - 1, drift: g.drift + 4 },
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function pick(pos: number) {
    if (game.locked[game.order[pos]]) return;
    if (selected === null) return setSelected(pos);
    if (selected === pos) return setSelected(null);

    const order = [...game.order];
    [order[selected], order[pos]] = [order[pos], order[selected]];
    setSelected(null);
    if (game.moves + 1 >= MAX_MOVES) {
      setGame(newGame());
      fail("Out of moves. Are you a robot?");
    } else {
      setGame({ ...game, order, moves: game.moves + 1, note: "" });
    }
  }

  function verify() {
    if (game.order.every((t, i) => t === i)) pass();
    else fail("No.");
  }

  return (
    <div className="select-none bg-[#8a8d93] p-4 font-[Arial,sans-serif] text-[#7b7e84]">
      <div className="grid aspect-[5/6] grid-cols-5 gap-0.5">
        {game.order.map((t, pos) => (
          <div
            key={pos}
            onClick={() => pick(pos)}
            className={`relative transition-transform ${selected === pos ? "scale-[0.88]" : ""} ${
              game.locked[t] ? "cursor-not-allowed" : "cursor-grab"
            }`}
            style={{ background: hueShift(game.colors[t], game.drift) }}
          >
            {game.locked[t] && (
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/20" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] tabular-nums text-[#7e8187]">
          ⏱ 0:{String(game.left).padStart(2, "0")} · moves {game.moves}/{MAX_MOVES}
          {game.note && ` · ${game.note}`}
        </span>
        <button
          onClick={verify}
          className="bg-[#8f9298] px-4 py-2 text-xs font-bold text-[#878a90] outline-none"
        >
          verify
        </button>
      </div>
    </div>
  );
}
