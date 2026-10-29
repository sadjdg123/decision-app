// Tiny synthesized sound effects, no audio files needed.
let context = null;
let enabled = true;
let lastTick = 0;

export function setSoundEnabled(value) {
  enabled = Boolean(value);
}

function getContext() {
  if (!enabled || typeof window === "undefined") return null;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context ||= new AudioContext();
    if (context.state === "suspended") context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(audio, { frequency, start, duration, type = "sine", volume }) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playTick() {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  if (now - lastTick < 0.035) return;
  lastTick = now;
  tone(audio, {
    frequency: 1700,
    start: now,
    duration: 0.035,
    type: "square",
    volume: 0.025,
  });
}

export function playStart() {
  const audio = getContext();
  if (!audio) return;
  tone(audio, {
    frequency: 520,
    start: audio.currentTime,
    duration: 0.12,
    type: "triangle",
    volume: 0.06,
  });
}

export function playWin() {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  [660, 880, 1320].forEach((frequency, i) =>
    tone(audio, {
      frequency,
      start: now + i * 0.09,
      duration: 0.28,
      type: "triangle",
      volume: 0.07,
    }),
  );
}
