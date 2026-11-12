"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { defineStep, type StepProps } from "@/captcha/types";

const N = 3;
const U = 64;
const PAD = 18;
const S = U + PAD * 2;
const PER_ROW = 3;
const W = Math.round(PER_ROW * S * 0.92);
const BOARD_X = Math.round((W - U * N) / 2);
const BOARD_Y = PAD;
const TRAY_TOP = BOARD_Y + U * N + PAD * 2;
const H = Math.round(TRAY_TOP + Math.ceil((N * N) / PER_ROW) * S * 0.9 + PAD);
const TIME = 60;
const FLIP_BACK_MIN_MS = 1500;
const FLIP_BACK_MAX_MS = 4500;

type Edges = [number, number, number, number];
type Piece = {
  r: number;
  c: number;
  x: number;
  y: number;
  edges: Edges;
  flipBackMs: number;
  up: boolean;
  placed: boolean;
};

export default defineStep({
  sense: "Touch",
  title: "Complete the picture",
  instructions:
    "pieces must be revealed before placement. revealed pieces expire.",
  Component: FlipJigsaw,
});

function newPieces(): Piece[] {
  const rnd = () => (Math.random() < 0.5 ? 1 : -1);
  const hz = [...Array(N)].map(() => [...Array(N)].map(rnd));
  const vt = [...Array(N)].map(() => [...Array(N)].map(rnd));
  const spots = [...Array(N * N).keys()].sort(() => Math.random() - 0.5);
  const step = (FLIP_BACK_MAX_MS - FLIP_BACK_MIN_MS) / (N * N - 1);
  const delays = [...Array(N * N).keys()]
    .map((k) => Math.round(FLIP_BACK_MIN_MS + k * step))
    .sort(() => Math.random() - 0.5);
  const pieces: Piece[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const k = spots[r * N + c];
      pieces.push({
        r,
        c,
        x: Math.round((k % PER_ROW) * S * 0.92 + Math.random() * 6),
        y: Math.round(
          TRAY_TOP + Math.floor(k / PER_ROW) * S * 0.9 + Math.random() * 6,
        ),
        edges: [
          r ? -hz[r - 1][c] : 0,
          c < N - 1 ? vt[r][c] : 0,
          r < N - 1 ? hz[r][c] : 0,
          c ? -vt[r][c - 1] : 0,
        ],
        flipBackMs: delays[r * N + c],
        up: false,
        placed: false,
      });
    }
  }
  return pieces;
}

function paintPicture(g: CanvasRenderingContext2D, size: number) {
  const sky = g.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, "#f4a261");
  sky.addColorStop(0.55, "#f7d6a5");
  sky.addColorStop(1, "#a8d5ba");
  g.fillStyle = sky;
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#fff4d6";
  g.beginPath();
  g.arc(size * 0.72, size * 0.3, size * 0.11, 0, 7);
  g.fill();
  const hill = (color: string, base: number, amp: number, phase: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, size);
    for (let x = 0; x <= size; x += 4)
      g.lineTo(x, size * base + Math.sin((x / size) * 6 + phase) * size * amp);
    g.lineTo(size, size);
    g.fill();
  };
  hill("#6a994e", 0.58, 0.05, 1);
  hill("#386641", 0.72, 0.06, 3);
  hill("#1b4332", 0.86, 0.04, 5);
  g.fillStyle = "#e76f51";
  g.beginPath();
  g.ellipse(size * 0.3, size * 0.3, size * 0.09, size * 0.11, 0, 0, 7);
  g.fill();
  g.fillStyle = "#264653";
  g.fillRect(size * 0.27, size * 0.44, size * 0.06, size * 0.04);
}

function edge(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
) {
  if (!t) return g.lineTo(x1, y1);
  const L = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / L;
  const dy = (y1 - y0) / L;
  const p = (s: number, k: number): [number, number] => [
    x0 + dx * L * s + dy * L * k * t,
    y0 + dy * L * s - dx * L * k * t,
  ];
  g.lineTo(...p(0.36, 0));
  g.bezierCurveTo(...p(0.4, 0.12), ...p(0.28, 0.26), ...p(0.5, 0.26));
  g.bezierCurveTo(...p(0.72, 0.26), ...p(0.6, 0.12), ...p(0.64, 0));
  g.lineTo(x1, y1);
}

function piecePath(g: CanvasRenderingContext2D, e: Edges) {
  g.beginPath();
  g.moveTo(PAD, PAD);
  edge(g, PAD, PAD, PAD + U, PAD, e[0]);
  edge(g, PAD + U, PAD, PAD + U, PAD + U, e[1]);
  edge(g, PAD + U, PAD + U, PAD, PAD + U, e[2]);
  edge(g, PAD, PAD + U, PAD, PAD, e[3]);
  g.closePath();
}

function PieceFaces({ piece }: { piece: Piece }) {
  const front = useRef<HTMLCanvasElement>(null);
  const back = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [front.current, back.current]) {
      if (!canvas) continue;
      canvas.width = canvas.height = S * dpr;
    }
    const f = front.current?.getContext("2d");
    const b = back.current?.getContext("2d");
    if (!f || !b) return;

    f.scale(dpr, dpr);
    piecePath(f, piece.edges);
    f.save();
    f.clip();
    f.translate(PAD - piece.c * U, PAD - piece.r * U);
    paintPicture(f, U * N);
    f.restore();
    f.strokeStyle = "rgba(0,0,0,.25)";
    f.stroke();

    b.scale(dpr, dpr);
    piecePath(b, piece.edges);
    b.fillStyle = "#c9c5bc";
    b.fill();
    b.save();
    b.clip();
    b.strokeStyle = "#c2beb5";
    b.lineWidth = 2;
    for (let i = -S; i < S * 2; i += 8) {
      b.beginPath();
      b.moveTo(i, 0);
      b.lineTo(i - S, S);
      b.stroke();
    }
    b.restore();
    b.strokeStyle = "#bdb9af";
    b.stroke();
  }, [piece.edges, piece.r, piece.c]);

  return (
    <div
      className="relative h-full w-full transition-transform duration-[450ms] [transform-style:preserve-3d]"
      style={{ transform: piece.up ? "rotateY(0deg)" : "rotateY(180deg)" }}
    >
      <canvas
        ref={front}
        className="absolute inset-0 h-full w-full [backface-visibility:hidden]"
      />
      <canvas
        ref={back}
        className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]"
      />
    </div>
  );
}

function FlipJigsaw({ pass }: StepProps) {
  const [pieces, setPieces] = useState(newPieces);
  const [left, setLeft] = useState(TIME);
  const [note, setNote] = useState("");
  const [zOrder, setZOrder] = useState<number[]>(() => [
    ...Array(N * N).keys(),
  ]);
  const drag = useRef<{
    i: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const flipTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const passed = useRef(false);

  useEffect(() => {
    const timers = flipTimers.current;
    let remaining = TIME;
    const id = setInterval(() => {
      if (passed.current) return;
      remaining -= 1;
      if (remaining <= 0) {
        remaining = TIME;
        timers.forEach(clearTimeout);
        drag.current = null;
        setPieces(newPieces());
        setNote("session expired.");
      }
      setLeft(remaining);
    }, 1000);
    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, []);

  function scheduleFlipBack(i: number) {
    clearTimeout(flipTimers.current.get(i));
    flipTimers.current.set(
      i,
      setTimeout(() => {
        if (drag.current?.i === i || passed.current) return;
        setPieces((ps) =>
          ps.map((p, j) => (j === i ? { ...p, up: false } : p)),
        );
      }, pieces[i].flipBackMs),
    );
  }

  function commit(next: Piece[], i: number) {
    setPieces(next);
    scheduleFlipBack(i);
    if (!next.every((p) => p.placed)) return;
    if (next.every((p) => p.up)) {
      passed.current = true;
      flipTimers.current.forEach(clearTimeout);
      setNote("verified.");
      setTimeout(pass, 800);
    } else {
      setNote("now flip them all face up!");
    }
  }

  function flipUp(i: number) {
    if (pieces[i].up) return;
    commit(
      pieces.map((p, j) => (j === i ? { ...p, up: true } : p)),
      i,
    );
  }

  function onDown(i: number, e: PointerEvent<HTMLDivElement>) {
    if (passed.current) return;
    if (pieces[i].placed) return flipUp(i);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      i,
      sx: e.clientX,
      sy: e.clientY,
      ox: pieces[i].x,
      oy: pieces[i].y,
      moved: false,
    };
    setZOrder((z) => [...z.filter((n) => n !== i), i]);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !pieces[d.i].up) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setPieces((ps) =>
      ps.map((p, j) => (j === d.i ? { ...p, x: d.ox + dx, y: d.oy + dy } : p)),
    );
  }

  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const p = pieces[d.i];

    if (!d.moved) return flipUp(d.i);

    const tx = BOARD_X + p.c * U - PAD;
    const ty = BOARD_Y + p.r * U - PAD;
    if (Math.hypot(p.x - tx, p.y - ty) < U * 0.25) {
      commit(
        pieces.map((o, j) =>
          j === d.i ? { ...o, x: tx, y: ty, up: true, placed: true } : o,
        ),
        d.i,
      );
    } else {
      scheduleFlipBack(d.i);
    }
  }

  return (
    <div className="select-none bg-[#d6d3cc] p-3 font-[Arial,sans-serif]">
      <div className="mb-2 flex justify-between text-[11px] tabular-nums text-[#bdbab2]">
        <span>{note}</span>
        <span>0:{String(left).padStart(2, "0")}</span>
      </div>
      <div
        className="relative mx-auto touch-none"
        style={{ width: W, height: H }}
      >
        <div
          className="absolute border border-dashed border-[#cbc8c0]"
          style={{ left: BOARD_X, top: BOARD_Y, width: U * N, height: U * N }}
        />
        {pieces.map((p, i) => (
          <div
            key={i}
            className="absolute cursor-pointer touch-none [perspective:600px]"
            style={{
              left: p.x,
              top: p.y,
              width: S,
              height: S,
              zIndex: p.placed ? 0 : zOrder.indexOf(i) + 1,
            }}
            onPointerDown={(e) => onDown(i, e)}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            <PieceFaces piece={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
