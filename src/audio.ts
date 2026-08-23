import { state } from './state';
import { showToast } from './ui';

// 0.35-second beep sound base64 WAV data URI (fade-out to prevent clicks)
const BEEP_WAV_B64 = 'data:audio/wav;base64,UklGRhQLAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfAKAAB/pbmzlWxMQ1Z7ori1mHBOQ1N3nre2m3NRQ1Fzm7a3nndTQ09wmLS4oXtWRE1slLK4pH5ZRUtpkbC5p4JcRklmja65qYZfR0hiiay5q4liSEdfhqm5ro1mSkZcgqa4r5BpTEZaf6O3sZRtTkVXe6C2s5dwUEVVd521tJp0UkVSdJq0tZ13VUVQcJeytqB7WEZObZOwtqN/WkdNapCut6WCXUhLZo2st6iGYElKY4mqt6qJY0pJYIantqyMZ0xIXoKltq6Qak5IW3+ita+TbVBHWHuftLGWcVJHVnics7KZdFRHVHSZsrOceFZIUnGWsLSfe1lIUG6TrrShflxJT2qPrbWkgl9KTWeMqrWmhWFLTGSJqLWoiWRMS2KFprSqjGhOSl+Co7Ssj2tPSlx+obOtkm5RSVp7nrKvlXFTSVh4m7GwmHVWSVZ1mLCxm3hYSlRxla6ynXtaSlJukq2yoH9dS1Frj6uyooJgTE9oi6mzpYVjTU5liKeyp4hlTk1jhaSyqItoUExggqKyqo5sUUxef5+xrJFvU0xbe52wrZRyVUxZeJqvrpd1V0xXdZeur5p4WkxWcpSssJx7XExUb5GrsJ9+Xk1SbI6psKGCYU5RaYunsKOFZE9QZoilsKWIZ1BPZIWjsKeLaVJPYYKgsKiObFNOX3+er6qRb1VOXXubrquTcldOW3iZrayWdVlOWXWWrK2ZeFtOV3KTqq2be11PVnCQqa6dfmBPVG2Np66fgmJQU2qKpa6hhGVRUmeHo66jh2hSUWWEoa6limpUUWOBn62mjW1VUGB+na2okHBXUF58mqypknNZUFx5mKuqlXZbUFt2laqrl3ldUFlzkqirmnxfUVdwj6esnH5hUVZujaWsnoFkUlVriqSsoIRmU1Rph6KsoodpVFNmhKCso4prVlNkgZ2rpYxuV1Jifpurpo9xWVJgfJmqp5JzWlJeeZapqJR2XFJcdpSoqZZ5XlJbdJGmqZh8YFNZcY+lqpt+Y1NYboyjqpyBZVRXbImiqp6EZ1VWaoegqqCHalZVZ4SeqqGJbFdVZYGcqaOMb1lUY3+aqaSOcVpUYXyYqKWRdFxUYHmVp6aTd15UXneTpqeVeWBUXHSQpaeXfGJVW3KOo6iZfmRVWm+LoqibgWZWWW2JoKidhGhXWGuGnqiehmtYV2iEnKegiW1ZV2aBmqehi29bVmV/mKaijXJcVmN8lqajkHReVmF5lKWkkndgVmB3kqSllHlhV151j6OllnxjV11yjaGlmH5lWFxwi6CmmoFnWFtuiJ6mm4NpWVpshp2mnYZsWllqg5ulnohuW1logZmln4pwXVlmf5ekoI1zXlhkfJWkoY91YFhjepOjopF3YVhhd5Gio5N6Y1lgdY+ho5V8ZVlfc4yfo5Z+Z1pecYqepJiBaVpdb4idpJqDa1tcbYWbo5uFbVxba4OZo5yIb11baYGYo52KcV9bZ3+Wop6Mc2BbZnyUop+OdmFaZHqSoaCQeGNbY3iQoKGSemRbYnaOn6GTfGZbYXSMnqGVfmhcYHKJnKGXgWpcX3CHm6GYg2xdXm6FmaGZhW5eXWyDmKGah3BfXWqBlqGciXJgXWl+lKCci3RiXWd8k5+djXZjXWZ6kZ+ej3hkXWV4j56ekXpmXWN2jZ2fknxoXWJ0i5yflH9xXmFyiZqflYFrX2Fwh5mfloNtX2BvhZifmIVvYGBtg5afmYdxYV9rgZWfmohzYl9qf5Oem4p1Y19pfJGdm4x3ZV9ne5CdnI55Zl9meY6cnI97aF9ld4ybnZF9aWBkdYqanZJ+a2Bjc4iZnZSAbGFjcYaXnZWCbmFicISWnZaEcGJiboKVnZeGcmNhbYCTnJiIc2Rha36SnJmKdWVhan2Qm5mLd2ZhaXuOm5qNeWhhaHmNmpqOe2lhZ3eLmZuQfWtiZnaJmJuRf2xiZXSHl5uSgG5jZXKGlpuTgm9jZHGElJuUhHFkZG+Ck5uVhnNlY26AkpqWh3RmY21/kJqXiXZnY2x9j5mXinhoY2p7jZmYjHlpY2l5jJiYjXtrY2l4ipeZjn1sZGh2iJaZkH5tZGd1h5WZkYBvZWZzhZSZkoJwZWZyg5OZk4NyZmZxgpKZlIVzZ2VvgJCYlIZ1aGVuf4+YlYh3aWVtfY2Xlol4amVse4yXlot6a2VreouWlox7bGZqeImVl419bmZqd4iUl45+b2ZpdYaTl4+AcGdodIWSl5CCcmdoc4ORl5GDc2hocoKQlpKEdGlncYCPlpOGdmpnb3+OlpOHd2tnbn2MlZSIeWxnbnyLlZSKem1nbXqKlJSLfG5obHmIk5WMfW9oa3iHkpWNfnBoa3aFkZWOgHFpanWEkJWPgXNqanSDj5SPg3RqanOBjpSQhHVranKAjZSRhXdsaXF/jJSRhnhtaXB9i5OSiHltaW98ipKSiXtuam57iZKSinxvam55h5GSi31wam14hpCTi35ya213hZCTjIBza2x2g4+SjYF0bGx1go6SjoJ1bGx0gY2SjoN2bWxzgIySj4R3bmxyf4uRj4Z5bmxxfYqRkId6b2xxfImQkIh7cGxwe4iQkIh8cWxweoaPkIl9cmxveYWPkIp+c21veISOkIuAdG1ud4ONkIyBdW5udoKMkIyCdm5udYGLkI2Dd29udICKkI2EeG9udH+Jj42FeXBuc32Ij46GenFucnyHjo6He3JucnuGjo6HfHNucXqFjY6IfXNucXqEjY6Jf3RvcHmDjI6Jf3VvcHiCi46KgHZwcHeBio6KgXdwcHaAio6LgnhxcHZ/iY6Lg3lxcHV/iI2MhHpycHR+h42MhXtzcHR9hoyMhXxzcHN8hYyMhn10cHN7hYuMh351cXN6hIuMh352cXJ5g4qMiH92cXJ5goqMiIB3cnJ4gYmMiYF4cnJ3gIiMiYJ5c3J3f4eLiYN6c3J2f4eLioN7dHJ2foaLioR7dHJ1fYWKioR8dXJ1fISKioV9dnJ1e4SJioZ+dnN0e4OJioZ+d3N0eoKIioZ/eHN0eoGIioeAeHR0eYGHioeBeXR0eYCHioeBenV0eH+GiYiCe3V0eH+FiYiCe3Z0d36FiYiDfHZ0d32EiIiDfXd0d32DiIiEfXd1dnyDh4iEfnh1dnuCh4iFf3h1dnuBh4iFf3l1dnuBhoiFgHp2dnqAhoiGgHp2dnqAhYeGgXt3dnl/hIeGgXt3dnl+hIeGgnx3dnl+g4eGgnx4dnl9g4aGgn14dnh9goaGg355d3h9goaGg355d3h8gYWGg356d3h8gYWGhH96d3h7gISGhH97eHh7gISFhIB7eHh7f4OFhIB8eHh7f4OFhIF8eXh6foOFhIF9eXh6foKEhIF9enh6foKEhIF9enl6fYGEhIJ+enl6fYGEhIJ+e3l6fYGDhIJ/e3l6fYCDhIJ/e3p6fICDhIJ/fHp6fH+Cg4J/fHp6fH+Cg4KAfXp6fH+Cg4KAfXt6fH+Bg4KAfXt6fH6BgoKAfnt7fH6BgoKAfnx7fH6AgoKAfnx7fH6AgoKBfnx7fH2AgYKBf3x7fH1/gYKBf318fH1/gYGBf318fH1/gYGBf318fH1/gIGAf318fH1/gIGAf359fH1/gIGAf359fX1+gICAf359fX1+f4CAf359fX1+f4CAf359fX1+f4CAf35+fX1+f3+Af39+fX5+f39/f39+fn5+f39/f39+fn5+f39/f39+fn5+';

// 1-second silent MP3 base64 data URI
const SILENT_MP3_B64 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDkAAAAAAAAAGw9wrNaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

let globalBgmEl: HTMLVideoElement | null = null; // Uses HTMLVideoElement to support video (mp4/mov) soundtrack playback on iOS
let alertSrcUrl: string = BEEP_WAV_B64; // Stores alert source URL (local mp3 file or fallback beep)

export function initAudio(): void {
  try {
    if (!globalBgmEl) {
      // Create a hidden video element to support video (.mp4/.mov) soundtrack playback on iOS
      globalBgmEl = document.createElement('video');
      globalBgmEl.id = 'hidden-bgm-video';
      globalBgmEl.loop = true;
      globalBgmEl.setAttribute('playsinline', 'true');
      globalBgmEl.setAttribute('webkit-playsinline', 'true');
      
      // Hide completely but keep in DOM for iOS activation
      globalBgmEl.style.position = 'fixed';
      globalBgmEl.style.top = '0';
      globalBgmEl.style.left = '0';
      globalBgmEl.style.width = '1px';
      globalBgmEl.style.height = '1px';
      globalBgmEl.style.opacity = '0.001';
      globalBgmEl.style.pointerEvents = 'none';
      globalBgmEl.style.zIndex = '-9999';
      
      document.body.appendChild(globalBgmEl);
    }
  } catch (e) {
    console.error("Failed to initialize HTML5 Audio/Video components:", e);
  }
}

// Pre-unlock audio context for iOS/iPadOS Safari user activation bypass
export function unlockAudio(): void {
  initAudio();
  try {
    // Request notification permission on user interaction
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(err => console.warn("Notification request blocked:", err));
    }
    
    // Play silent track immediately to unlock audio capabilities under user interaction context
    if (globalBgmEl && (!globalBgmEl.src || globalBgmEl.src === SILENT_MP3_B64)) {
      globalBgmEl.src = SILENT_MP3_B64;
      globalBgmEl.loop = true;
      globalBgmEl.play().catch(e => console.warn("BGM unlock soft-play blocked:", e));
    }
    
    const customAlertPath = `${(import.meta as any).env?.BASE_URL || '/'}audio/alarm.mp3`;
    
    // Pre-verify alert sound file
    fetch(customAlertPath, { method: 'HEAD' })
      .then(res => {
        alertSrcUrl = res.ok ? customAlertPath : BEEP_WAV_B64;
      })
      .catch(() => {
        alertSrcUrl = BEEP_WAV_B64;
      });
  } catch (err) {
    console.error("Failed to unlock audio components:", err);
  }
}

// MediaSession metadata update helper to overwrite active media (like d anime store)
function updateMediaSessionState(): void {
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.pomoState === 'work' ? '集中学習中 📝' : 'ポモドーロ休憩中 ☕',
        artist: state.pomoBgmFileName || '無音 (バックグラウンド維持)',
        album: 'kano_watching 数学学習管理',
        artwork: [
          { src: `${(import.meta as any).env?.BASE_URL || '/'}favicon.ico`, sizes: '64x64', type: 'image/x-icon' }
        ]
      });
      
      // Bind basic lockscreen handlers
      navigator.mediaSession.setActionHandler('play', () => {
        resumeBgmPlayback();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pauseBgmPlayback();
      });
    } catch (e) {
      console.warn("Failed to set MediaSession metadata:", e);
    }
  }
}

export function startBgmPlayback(): void {
  initAudio();
  if (!globalBgmEl) return;
  
  try {
    globalBgmEl.src = state.pomoBgmUrl || SILENT_MP3_B64;
    globalBgmEl.loop = true;
    
    updateMediaSessionState();
    
    globalBgmEl.play().catch(e => {
      console.warn("BGM play failed or blocked. User interaction required:", e);
    });
  } catch (err) {
    console.error("Failed to start BGM playback:", err);
  }
}

export function pauseBgmPlayback(): void {
  try {
    if (globalBgmEl) {
      globalBgmEl.pause();
    }
  } catch (err) {
    console.error("Failed to pause BGM playback:", err);
  }
}

export function resumeBgmPlayback(): void {
  try {
    if (globalBgmEl) {
      globalBgmEl.play().catch(e => {
        console.warn("BGM resume failed:", e);
      });
    }
  } catch (err) {
    console.error("Failed to resume BGM playback:", err);
  }
}

export function stopBgmPlayback(): void {
  try {
    if (globalBgmEl) {
      globalBgmEl.pause();
      globalBgmEl.src = '';
      globalBgmEl.ontimeupdate = null;
    }
  } catch (err) {
    console.error("Failed to stop BGM playback:", err);
  }
}

let timeUpdateCallback: (() => void) | null = null;

export function registerTimeUpdateCallback(cb: () => void): void {
  timeUpdateCallback = cb;
  initAudio();
  if (globalBgmEl) {
    globalBgmEl.ontimeupdate = () => {
      if (timeUpdateCallback) {
        timeUpdateCallback();
      }
    };
  }
}

export function sendWebNotification(title: string, body: string): void {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: body,
        icon: `${(import.meta as any).env?.BASE_URL || '/'}favicon.ico`
      });
    } catch (e) {
      console.warn("Failed to create Notification instance:", e);
    }
  }
}

export function playPomoAlert(forced = false): void {
  try {
    const currentPomoState = state.pomoState;
    const title = currentPomoState === 'work' ? '作業終了！☕' : '休憩終了！🚀';
    const body = currentPomoState === 'work' ? '休憩を開始してください。' : '次の作業を開始してください。';
    
    // Always trigger push notification
    sendWebNotification(title, body);
    
    // Fallback foreground toast for iPad/iOS Safari users who don't run PWA mode
    showToast(`${title} ${body}`, currentPomoState === 'work' ? 'success' : 'warning');

    // Reuse the active BGM element to bypass background autoplay security policies.
    // By keeping the same media flow running, iOS allows source updates on the fly.
    if (globalBgmEl) {
      // Unbind the ticker callback temporarily so timer changes don't fire during alert sound
      globalBgmEl.ontimeupdate = null;
      globalBgmEl.pause();
      
      // Load alert sound into active player
      globalBgmEl.src = alertSrcUrl;
      globalBgmEl.loop = false;
      
      let loopCount = 0;
      
      const handleAlertEnd = () => {
        loopCount++;
        if (loopCount < 3 && globalBgmEl) {
          // Play the sound 3 times sequentially
          globalBgmEl.currentTime = 0;
          globalBgmEl.play().catch(e => console.warn("Beep replay blocked:", e));
        } else {
          if (globalBgmEl) {
            globalBgmEl.removeEventListener('ended', handleAlertEnd);
            
            // Restore back to BGM or Silence after sound finishes
            globalBgmEl.src = state.pomoBgmUrl || SILENT_MP3_B64;
            globalBgmEl.loop = true;
            
            // Re-bind background ticker callback
            if (timeUpdateCallback) {
              globalBgmEl.ontimeupdate = () => {
                if (timeUpdateCallback) timeUpdateCallback();
              };
            }
            
            globalBgmEl.play().catch(e => console.warn("Re-stabilize silent playback blocked:", e));
          }
        }
      };
      
      globalBgmEl.addEventListener('ended', handleAlertEnd);
      globalBgmEl.play().catch(e => {
        console.warn("Alert play failed. Bypassing beep sequence:", e);
      });
    }
  } catch (err) {
    console.error("Failed to execute alert sequence:", err);
  }
}
