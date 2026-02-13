const AUDIO_FILES = {
  select: "./assets/sfx/select.wav",
  legal: "./assets/sfx/legal.wav",
  fail: "./assets/sfx/fail.wav",
  clear: "./assets/sfx/clear.wav",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createBeep(audioCtx, { frequency, duration, gain = 0.04, type = "sine", frequencyEnd = null }) {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (frequencyEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequencyEnd), now + duration);
  }

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(clamp(gain, 0.001, 0.08), now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp);
  amp.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function createFallbackPlayer() {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  return {
    play(type) {
      const audioCtx = ensureCtx();

      switch (type) {
        case "select":
          createBeep(audioCtx, { frequency: 520, duration: 0.08, gain: 0.03, type: "triangle" });
          break;
        case "legal":
          createBeep(audioCtx, {
            frequency: 420,
            frequencyEnd: 700,
            duration: 0.16,
            gain: 0.04,
            type: "sine",
          });
          break;
        case "fail":
          createBeep(audioCtx, {
            frequency: 320,
            frequencyEnd: 190,
            duration: 0.2,
            gain: 0.045,
            type: "sawtooth",
          });
          break;
        case "clear":
          createBeep(audioCtx, {
            frequency: 460,
            frequencyEnd: 820,
            duration: 0.18,
            gain: 0.042,
            type: "triangle",
          });
          window.setTimeout(() => {
            createBeep(audioCtx, {
              frequency: 620,
              frequencyEnd: 980,
              duration: 0.22,
              gain: 0.04,
              type: "triangle",
            });
          }, 120);
          break;
        default:
          break;
      }
    },
  };
}

export function createAudioController() {
  const fallback = createFallbackPlayer();
  const byKey = {};
  let unlocked = false;

  for (const [key, src] of Object.entries(AUDIO_FILES)) {
    const audio = new Audio(src);
    audio.preload = "auto";
    byKey[key] = audio;
  }

  function unlock() {
    if (unlocked) {
      return;
    }
    unlocked = true;
    for (const audio of Object.values(byKey)) {
      audio.volume = 0.72;
      // Prime audio context by attempting muted micro-play.
      audio.muted = true;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }, 0);
    }
  }

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  function play(type) {
    const audio = byKey[type];
    if (!audio) {
      fallback.play(type);
      return;
    }
    try {
      audio.currentTime = 0;
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => fallback.play(type));
      }
    } catch {
      fallback.play(type);
    }
  }

  return { play };
}
