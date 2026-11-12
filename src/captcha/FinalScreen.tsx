type Props = {
  seconds: number;
  fails: number;
  onRestart: () => void;
};

export default function FinalScreen({ seconds, fails, onRestart }: Props) {
  const minutes = Math.floor(seconds / 60);
  const time = minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-green-600 text-3xl text-white">✓</div>
      <h2 className="text-2xl font-bold">Congratulations, you have proven your humanity!</h2>
      <p className="text-sm text-neutral-600">Your frustration, disappointment, and complete lack of patience confirm that you&apos;re human.</p>
      <p className="text-sm text-neutral-500">Thank you for your feedback. We will not be taking it into consideration.</p>
      <p className="text-neutral-600">
        It took you <b>{time}</b> and <b>{fails}</b> failed {fails === 1 ? "attempt" : "attempts"}.
      </p>
      <button onClick={onRestart} className="bg-neutral-900 px-5 py-2 text-sm font-semibold text-white">
        Verify again
      </button>
    </div>
  );
}
