let globalAudioCtx: AudioContext | null = null;
let globalAudioEl: HTMLAudioElement | null = null; // HTML5 silent loop element for iOS Safari background wake-lock

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

export function startSilentLoop(): void {
  try {
    initAudioContext();
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    
    if (!globalAudioEl) {
      globalAudioEl = new Audio();
      // 1-second silent MP3 base64 data URI
      globalAudioEl.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDkAAAAAAAAAGw9wrNaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      globalAudioEl.loop = true;
      globalAudioEl.setAttribute('playsinline', 'true');
    }
    
    globalAudioEl.play().catch(e => {
      console.warn("Silent audio play was blocked or failed:", e);
    });
  } catch (err) {
    console.error("Failed to start silent loop:", err);
  }
}

export function stopSilentLoop(): void {
  try {
    if (globalAudioEl) {
      globalAudioEl.pause();
    }
  } catch (e) {
    console.error("Failed to stop silent loop:", e);
  }
}

export function playPomoAlert(): void {
  try {
    // Stop the silent loop so we can play the alert
    stopSilentLoop();
    
    initAudioContext();
    if (!globalAudioCtx) return;
    
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    
    const now = globalAudioCtx.currentTime;
    
    // Play 3 beep sequences (sharp beeps: "Beep... Beep... Beep...")
    for (let i = 0; i < 3; i++) {
      const startTime = now + i * 0.5;
      const stopTime = startTime + 0.35;
      
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.8, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, stopTime);
      
      osc.start(startTime);
      osc.stop(stopTime);
    }
  } catch (err) {
    console.error("Audio beep failed:", err);
  }
}
