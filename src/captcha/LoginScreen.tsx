"use client";

import { useEffect, useRef, useState } from "react";

export default function LoginScreen({ onVerify }: { onVerify: () => void }) {
  const [verifying, setVerifying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function startVerification() {
    if (verifying) return;
    setVerifying(true);
    timer.current = setTimeout(onVerify, 750);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div>
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-neutral-500">Enter your details to continue.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-semibold">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="Enter your username"
          required
          className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </div>

      <div className="flex min-h-20 items-center justify-between gap-3 rounded-sm border border-neutral-300 bg-neutral-50 px-3 py-3 shadow-sm">
        <label className={`flex min-w-0 items-center gap-3 text-sm ${verifying ? "cursor-wait" : "cursor-pointer"}`}>
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              aria-label="I'm not a robot"
              checked={verifying}
              disabled={verifying}
              onChange={startVerification}
              className={`h-7 w-7 cursor-pointer appearance-none rounded-xs border-2 border-neutral-400 bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${verifying ? "opacity-0" : ""}`}
            />
            {verifying && <span aria-hidden="true" className="absolute h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600 motion-reduce:animate-none" />}
          </span>
          <span role="status">{verifying ? "Verifying…" : "I'm not a robot"}</span>
        </label>
        <div className="shrink-0 text-center text-neutral-500" aria-hidden="true">
          <svg viewBox="0 0 40 40" className="mx-auto h-9 w-9" fill="none">
            <path d="M32 17A13 13 0 0 0 10 10" stroke="#4285f4" strokeWidth="6" />
            <path d="m26 17 11 2-1-12" fill="#4285f4" />
            <path d="M8 23a13 13 0 0 0 22 7" stroke="#9ca3af" strokeWidth="6" />
            <path d="m14 23-11-2 1 12" fill="#9ca3af" />
          </svg>
          <p className="text-[10px]">reCAPTCHA</p>
          <p className="mt-0.5 text-[8px]">Privacy - Terms</p>
        </div>
      </div>

      <button
        type="submit"
        disabled
        className="cursor-not-allowed bg-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-400"
      >
        Log in
      </button>
    </form>
  );
}
