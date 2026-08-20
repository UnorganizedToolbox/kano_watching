let globalAudioCtx: AudioContext | null = null;

export function initAudioContext(): void {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    
    // Play a tiny, virtually silent sound to unlock AudioContext on iOS/iPadOS Safari
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.frequency.setValueAtTime(440, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.00001, globalAudioCtx.currentTime);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.01);
  } catch (e) {
    console.error("Web Audio API is not supported or failed to initialize:", e);
  }
}

export function playPomoAlert(): void {
  try {
    initAudioContext();
    if (!globalAudioCtx) return;
    
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 1.2);
    osc.stop(globalAudioCtx.currentTime + 1.2);
  } catch (err) {
    console.error("Audio beep failed:", err);
  }
}
