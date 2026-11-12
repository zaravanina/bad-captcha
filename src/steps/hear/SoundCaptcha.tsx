// Usage: <SoundCaptcha onSuccess={() => ...} />
// Three sound rounds (pigeon coo, sing the lyrics, Lego pain). onSuccess fires once all three pass.
// Speech recognition needs Chrome or Edge with internet; the mic needs HTTPS or localhost.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { analyzeCoo, judgeCoo, makeCoo, type Check, type CooFeatures } from "./audio-analysis";
import { normalize, speechErrorMessage, useSpeechRecognition } from "./speech";

const ROUNDS = 3;
const RECORD_MS = 4000;
const SING_MS = 15000;
const PAIN_MS = 10000;
const LENIENT_FROM_ATTEMPT = 3;
const SUCCESS_DELAY_MS = 2500;

const LYRICS = [
  "is this the real life",
  "is this just fantasy",
  "caught in a landslide",
  "easy come easy go",
  "galileo",
  "scaramouche",
  "mama just killed a man",
  "put a gun against his head",
  "thunderbolt and lightning",
  "beelzebub has a devil put aside for me",
  "nothing really matters",
  "anyway the wind blows",
];

const PAIN_PATTERNS = [/^o+w+$/, /^o+u+c+h+$/, /^a+h+$/, /^a+r+g+h*$/, /^o+w+i+e+$/];
const SWEARS = new Set(["damn", "dammit", "shit", "fuck", "fucking", "hell", "crap", "bloody", "bugger", "ffs"]);

type RoundProps = { onPass: () => void; onFail: () => void };

export default function SoundCaptcha({ onSuccess, onFail }: { onSuccess: () => void; onFail?: () => void }) {
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(false);
  const done = round >= ROUNDS;

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onSuccess, SUCCESS_DELAY_MS);
    return () => clearTimeout(id);
  }, [done, onSuccess]);

  function next() {
    setCleared(false);
    setRound((r) => r + 1);
  }

  const fail = () => onFail?.();
  const roundProps = { onPass: () => setCleared(true), onFail: fail };

  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-dashed border-neutral-400 p-4">
      {done ? (
        <p className="py-6 text-center text-lg font-semibold">
          All three rounds passed. Congratulations, you are, against all odds, human.
        </p>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Round {round + 1} of {ROUNDS}
          </p>
          {round === 0 && <PigeonRound key="pigeon" {...roundProps} />}
          {round === 1 && <SingRound key="sing" {...roundProps} />}
          {round === 2 && <PainRound key="pain" {...roundProps} />}
          {cleared && round < ROUNDS - 1 && (
            <BigButton onClick={next}>Next round</BigButton>
          )}
          {cleared && round === ROUNDS - 1 && <BigButton onClick={next}>Finish</BigButton>}
        </>
      )}
    </div>
  );
}

function BigButton({ children, ...props }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      {...props}
      className="w-full rounded-lg bg-yellow-400 px-4 py-4 text-lg font-bold text-neutral-900 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Result({ pass, children }: { pass: boolean; children: ReactNode }) {
  return <p className={`text-sm font-semibold ${pass ? "text-green-700" : "text-red-600"}`}>{children}</p>;
}

function Picture({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <p className="rounded bg-neutral-100 p-6 text-center text-sm italic text-neutral-500">{fallback}</p>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setBroken(true)} className="max-h-56 w-full rounded object-cover" />;
}

function PigeonRound({ onPass, onFail }: RoundProps) {
  const [status, setStatus] = useState<"idle" | "playing" | "recording" | "analyzing">("idle");
  const [attempts, setAttempts] = useState(0);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [lenient, setLenient] = useState(false);
  const [message, setMessage] = useState<{ pass: boolean; text: string } | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const reference = useRef<{ buffer: AudioBuffer; features: CooFeatures } | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      stream.current?.getTracks().forEach((t) => t.stop());
      void ctx.current?.close();
    },
    [],
  );

  function audio() {
    ctx.current ??= new AudioContext();
    return ctx.current;
  }

  function getReference() {
    if (!reference.current) {
      const ac = audio();
      const samples = makeCoo(ac.sampleRate);
      const buffer = ac.createBuffer(1, samples.length, ac.sampleRate);
      buffer.copyToChannel(samples, 0);
      reference.current = { buffer, features: analyzeCoo(samples, ac.sampleRate) };
    }
    return reference.current;
  }

  function playBird() {
    const ac = audio();
    void ac.resume();
    const source = ac.createBufferSource();
    source.buffer = getReference().buffer;
    source.connect(ac.destination);
    setStatus("playing");
    source.onended = () => timers.current.push(setTimeout(() => setStatus("idle"), 300));
    source.start();
  }

  async function record() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage({ pass: false, text: "This browser cannot record audio. A pigeon would use a different browser." });
      return;
    }
    setMessage(null);
    setChecks(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setMessage({
        pass: false,
        text: denied
          ? "Microphone denied. A pigeon would have found a way."
          : "The microphone refused to cooperate. Check it and try again.",
      });
      return;
    }

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    recorder.current = rec;
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      void analyze(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    setStatus("recording");
    timers.current.push(setTimeout(() => rec.state === "recording" && rec.stop(), RECORD_MS));
  }

  async function analyze(blob: Blob) {
    setStatus("analyzing");
    try {
      const decoded = await audio().decodeAudioData(await blob.arrayBuffer());
      // Let "Consulting the pigeons…" paint before the blocking pitch analysis.
      await new Promise((r) => setTimeout(r, 30));
      // TODO anti-cheat: reject recordings with no noise floor (digital silence between pulses)
      // or that are an exact copy of the reference coo played back into the mic.
      const user = analyzeCoo(decoded.getChannelData(0), decoded.sampleRate);
      const attempt = attempts + 1;
      const isLenient = attempt >= LENIENT_FROM_ATTEMPT;
      const result = judgeCoo(user, getReference().features, isLenient);
      setAttempts(attempt);
      setLenient(isLenient);
      setChecks(result);
      if (result.every((c) => c.pass)) {
        setMessage({ pass: true, text: "Congratulations. You are apparently a pigeon." });
        onPass();
      } else {
        setMessage({ pass: false, text: "Your coo was not convincing. Try again, with more feeling." });
        onFail();
      }
    } catch {
      setMessage({ pass: false, text: "That recording could not be decoded. Even the pigeon is confused. Try again." });
    }
    setStatus("idle");
  }

  const passed = message?.pass === true;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Pigeon coo</h2>
      <p className="text-sm text-neutral-600">Listen to the bird. Then coo it back. Exactly.</p>
      <BigButton onClick={playBird} disabled={status !== "idle" || passed}>
        {status === "playing" ? "Cooing…" : "Play the bird"}
      </BigButton>
      {status === "recording" ? (
        <BigButton onClick={() => recorder.current?.stop()}>Recording… tap to stop</BigButton>
      ) : (
        <BigButton onClick={record} disabled={status !== "idle" || passed}>
          {status === "analyzing" ? "Consulting the pigeons…" : "Coo into the mic"}
        </BigButton>
      )}
      <p className="text-xs text-neutral-500">Attempts: {attempts}</p>

      {checks && (
        <ul className="flex flex-col gap-1 text-sm">
          {checks.map((c) => (
            <li key={c.name} className="flex justify-between gap-2 border-b border-neutral-100 py-1">
              <span>
                <b className={c.pass ? "text-green-700" : "text-red-600"}>{c.pass ? "PASS" : "FAIL"}</b> {c.name}
              </span>
              <span className="tabular-nums text-neutral-600">
                {c.value} <span className="text-neutral-400">({c.threshold})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {lenient && checks && (
        <p className="text-xs italic text-neutral-500">Lenient mode: the pigeons have lowered their standards.</p>
      )}
      {message && <Result pass={message.pass}>{message.text}</Result>}
    </div>
  );
}

function SingRound({ onPass, onFail }: RoundProps) {
  const speech = useSpeechRecognition(SING_MS);
  const [attempts, setAttempts] = useState(0);
  const [matched, setMatched] = useState<string[] | null>(null);

  function sing() {
    setMatched(null);
    speech.start((text) => {
      const heard = normalize(text);
      const lines = LYRICS.filter((line) => heard.includes(line));
      setAttempts((a) => a + 1);
      setMatched(lines);
      if (lines.length) onPass();
      else onFail();
    });
  }

  const passed = !!matched?.length;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Sing it</h2>
      <Picture
        src="https://cdn.cnn.com/cnn/interactive/2018/11/opinions/queen-live-aid-cnnphotos/media/02.jpg"
        alt="Performer with a microphone"
        fallback="The photo refused to load. Picture a legend with a microphone and sing anyway."
      />
      <p className="text-sm text-neutral-600">You know the song. Sing it into the mic.</p>
      {speech.listening ? (
        <BigButton onClick={speech.stop}>Listening… tap to stop</BigButton>
      ) : (
        <BigButton onClick={sing} disabled={passed}>
          {attempts ? "Sing again" : "Start singing"}
        </BigButton>
      )}
      <Transcript text={speech.transcript} interim={speech.interim} />
      <p className="text-xs text-neutral-500">Attempts: {attempts}</p>
      {speech.error && <Result pass={false}>{speechErrorMessage(speech.error)}</Result>}
      {matched &&
        (passed ? (
          <>
            <p className="text-sm text-neutral-600">Matched: {matched.map((l) => `“${l}”`).join(", ")}</p>
            <Result pass>Round 2 passed. Your voice has been noted, and so has your taste.</Result>
          </>
        ) : (
          <Result pass={false}>
            The lyrics did not come through clearly. Sing a little louder and a little more carefully.
          </Result>
        ))}
    </div>
  );
}

function PainRound({ onPass, onFail }: RoundProps) {
  const speech = useSpeechRecognition(PAIN_MS);
  const [attempts, setAttempts] = useState(0);
  const [matched, setMatched] = useState<string[] | null>(null);

  function scream() {
    setMatched(null);
    speech.start((text) => {
      const words = normalize(text).split(" ");
      const pain = [...new Set(words.filter((w) => SWEARS.has(w) || PAIN_PATTERNS.some((p) => p.test(w))))];
      setAttempts((a) => a + 1);
      setMatched(pain);
      if (pain.length) onPass();
      else onFail();
    });
  }

  const passed = !!matched?.length;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Feel it</h2>
      <Picture
        src="/photolego.jpeg"
        alt="Cartoon of a person hopping after stepping on a Lego brick"
        fallback="The Lego picture is missing. Imagine the worst step of your life."
      />
      <p className="text-sm text-neutral-600">You just stepped on a Lego. Show us how much it hurt.</p>
      {speech.listening ? (
        <BigButton onClick={speech.stop}>Listening… tap to stop</BigButton>
      ) : (
        <BigButton onClick={scream} disabled={passed}>
          {attempts ? "Step on it again" : "Step on the Lego"}
        </BigButton>
      )}
      <Transcript text={speech.transcript} interim={speech.interim} />
      <p className="text-xs text-neutral-500">Attempts: {attempts}</p>
      {speech.error && <Result pass={false}>{speechErrorMessage(speech.error)}</Result>}
      {matched &&
        (passed ? (
          <>
            <p className="text-sm text-neutral-600">Heard: {matched.join(", ")}</p>
            <Result pass>Ouch, acknowledged. Round 3 passed. The Lego has been defeated.</Result>
          </>
        ) : (
          <Result pass={false}>That sounded like a mild inconvenience. Put some real feeling into it.</Result>
        ))}
    </div>
  );
}

function Transcript({ text, interim }: { text: string; interim: string }) {
  if (!text && !interim) return null;
  return (
    <p className="rounded bg-neutral-100 p-2 text-sm">
      {text} <span className="text-neutral-400">{interim}</span>
    </p>
  );
}
