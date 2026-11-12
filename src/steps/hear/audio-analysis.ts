export const FRAME = 2048;
export const HOP = 512;
const UNVOICED_RMS = 0.01;
const VOICED_PEAK = 0.6;
const CONTOUR_POINTS = 20;

export function makeCoo(sr: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.floor(1.4 * sr));
  const pulseLen = Math.floor(0.32 * sr);
  for (const start of [0.05, 0.5, 0.95]) {
    const s0 = Math.floor(start * sr);
    let phase = 0;
    for (let i = 0; i < pulseLen && s0 + i < out.length; i++) {
      const p = i / pulseLen;
      const f = 380 + 120 * Math.sin(Math.PI * p) - 60 * p;
      phase += (2 * Math.PI * f) / sr;
      const env = Math.sin(Math.PI * p) ** 2;
      const noise = (Math.random() * 2 - 1) * 0.004;
      out[s0 + i] += 0.5 * env * (Math.sin(phase) + 0.35 * Math.sin(2 * phase)) + noise;
    }
  }
  return out;
}

export function rms(samples: Float32Array, from = 0, to = samples.length): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  return to > from ? Math.sqrt(sum / (to - from)) : 0;
}

function frameStarts(length: number): number[] {
  const starts: number[] = [];
  for (let s = 0; s + FRAME <= length; s += HOP) starts.push(s);
  return starts;
}

export function frameRms(samples: Float32Array): number[] {
  return frameStarts(samples.length).map((s) => rms(samples, s, s + FRAME));
}

export function pitchContour(samples: Float32Array, sr: number): number[] {
  const minLag = Math.floor(sr / 1000);
  const maxLag = Math.ceil(sr / 150);
  return frameStarts(samples.length).map((s) => {
    if (rms(samples, s, s + FRAME) < UNVOICED_RMS) return 0;
    let energy = 0;
    for (let i = 0; i < FRAME; i++) energy += samples[s + i] * samples[s + i];
    let bestLag = 0;
    let bestPeak = 0;
    for (let lag = minLag; lag <= maxLag && lag < FRAME; lag++) {
      let c = 0;
      for (let i = 0; i < FRAME - lag; i++) c += samples[s + i] * samples[s + i + lag];
      const peak = c / energy;
      if (peak > bestPeak) {
        bestPeak = peak;
        bestLag = lag;
      }
    }
    return bestPeak > VOICED_PEAK && bestLag ? sr / bestLag : 0;
  });
}

export function pulseCount(envelope: number[]): number {
  const threshold = 0.3 * Math.max(0, ...envelope);
  if (threshold <= 0) return 0;
  let count = 0;
  let armed = true;
  for (const v of envelope) {
    if (armed && v >= threshold) {
      count++;
      armed = false;
    } else if (!armed && v < 0.6 * threshold) {
      armed = true;
    }
  }
  return count;
}

function voicedFrames(contour: number[]): number[] {
  return contour.flatMap((f, i) => (f > 0 ? [i] : []));
}

export function voicedDuration(contour: number[], sr: number): number {
  const voiced = voicedFrames(contour);
  if (voiced.length < 2) return 0;
  return ((voiced[voiced.length - 1] - voiced[0]) * HOP) / sr;
}

export function medianPitch(contour: number[]): number {
  const voiced = contour.filter((f) => f > 0).sort((a, b) => a - b);
  if (!voiced.length) return 0;
  const mid = Math.floor(voiced.length / 2);
  return voiced.length % 2 ? voiced[mid] : (voiced[mid - 1] + voiced[mid]) / 2;
}

export function resampleContour(contour: number[], points = CONTOUR_POINTS): number[] {
  const voiced = voicedFrames(contour);
  if (!voiced.length) return new Array(points).fill(0);
  const first = voiced[0];
  const last = voiced[voiced.length - 1];
  return Array.from({ length: points }, (_, k) => {
    const t = first + ((last - first) * k) / (points - 1);
    let nearest = voiced[0];
    for (const v of voiced) if (Math.abs(v - t) < Math.abs(nearest - t)) nearest = v;
    return contour[nearest];
  });
}

export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : 0;
}

export type CooFeatures = {
  rms: number;
  medianPitch: number;
  duration: number;
  pulses: number;
  contour: number[];
};

export function analyzeCoo(samples: Float32Array, sr: number): CooFeatures {
  const contour = pitchContour(samples, sr);
  return {
    rms: rms(samples),
    medianPitch: medianPitch(contour),
    duration: voicedDuration(contour, sr),
    pulses: pulseCount(frameRms(samples)),
    contour: resampleContour(contour),
  };
}

export type Check = { name: string; value: string; threshold: string; pass: boolean };

export function judgeCoo(user: CooFeatures, ref: CooFeatures, lenient: boolean): Check[] {
  const t = lenient
    ? { rms: 0.008, pitch: [200, 900], ratio: [0.4, 2.5], pulses: 2, corr: -0.1 }
    : { rms: 0.02, pitch: [250, 800], ratio: [0.6, 1.6], pulses: 1, corr: 0.3 };
  const ratio = ref.duration ? user.duration / ref.duration : 0;
  const corr = pearson(user.contour, ref.contour);
  const pulseDiff = Math.abs(user.pulses - ref.pulses);

  return [
    { name: "Loudness (RMS)", value: user.rms.toFixed(3), threshold: `≥ ${t.rms}`, pass: user.rms >= t.rms },
    {
      name: "Median pitch",
      value: `${Math.round(user.medianPitch)} Hz`,
      threshold: `${t.pitch[0]}–${t.pitch[1]} Hz`,
      pass: user.medianPitch >= t.pitch[0] && user.medianPitch <= t.pitch[1],
    },
    {
      name: "Duration ratio",
      value: ratio.toFixed(2),
      threshold: `${t.ratio[0]}–${t.ratio[1]}`,
      pass: ratio >= t.ratio[0] && ratio <= t.ratio[1],
    },
    {
      name: "Pulse count",
      value: `${user.pulses} (bird: ${ref.pulses})`,
      threshold: `± ${t.pulses}`,
      pass: pulseDiff <= t.pulses,
    },
    { name: "Contour match", value: corr.toFixed(2), threshold: `≥ ${t.corr}`, pass: corr >= t.corr },
  ];
}
