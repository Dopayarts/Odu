const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio not supported
  }
}

export function playCorrectSound() {
  playTone(523.25, 0.15, 'sine', 0.25); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.25), 100); // E5
  setTimeout(() => playTone(783.99, 0.25, 'sine', 0.25), 200); // G5
}

export function playWrongSound() {
  playTone(311.13, 0.2, 'square', 0.15); // Eb4
  setTimeout(() => playTone(233.08, 0.35, 'square', 0.15), 150); // Bb3
}
