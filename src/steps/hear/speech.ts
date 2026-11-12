"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

export const SPEECH_UNSUPPORTED = "unsupported";

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechErrorMessage(error: string): string {
  if (error === SPEECH_UNSUPPORTED) return "This browser cannot recognize speech. Try Chrome or Edge.";
  if (error === "network") {
    return "network: the speech service could not be reached. Check your internet (and VPN), and use Google Chrome or Edge. Brave and other Chromium browsers can't do this.";
  }
  return `${error}. Allow the mic and try again.`;
}

export function useSpeechRecognition(maxMs: number) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      recognition.current?.abort();
    },
    [],
  );

  function start(onDone: (text: string) => void) {
    const Ctor = recognitionCtor();
    if (!Ctor) return setError(SPEECH_UNSUPPORTED);

    setError(null);
    setTranscript("");
    setInterim("");
    let text = "";
    let pending = "";
    let failed = false;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) text += ` ${result[0].transcript}`;
        else pending += result[0].transcript;
      }
      setTranscript(text.trim());
      setInterim(pending);
    };
    rec.onerror = (e) => {
      failed = true;
      setError(e.error);
    };
    rec.onend = () => {
      clearTimeout(timer.current);
      recognition.current = null;
      setListening(false);
      setInterim("");
      if (!failed) onDone(`${text} ${pending}`);
    };

    recognition.current = rec;
    rec.start();
    setListening(true);
    timer.current = setTimeout(() => rec.stop(), maxMs);
  }

  function stop() {
    recognition.current?.stop();
  }

  return { listening, transcript, interim, error, start, stop };
}
