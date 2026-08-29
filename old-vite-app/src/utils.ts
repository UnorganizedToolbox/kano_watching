export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function formatCoef(val: number, isFirst: boolean): string {
  if (val === 0) return "";
  if (val === 1) return isFirst ? "" : "+";
  if (val === -1) return "-";
  if (val > 0) return isFirst ? `${val}` : `+${val}`;
  return `${val}`;
}

export function formatPoly(a: number, b: number, c: number): string {
  let poly = "";
  if (a !== 0) {
    const coefA = formatCoef(a, true);
    poly += `${coefA}x^2`;
  }
  if (b !== 0) {
    const coefB = formatCoef(b, poly === "");
    poly += `${coefB}x`;
  }
  if (c !== 0) {
    if (c > 0) {
      poly += poly === "" ? `${c}` : `+${c}`;
    } else {
      poly += `${c}`;
    }
  }
  return poly;
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomRange(min: number, max: number, excludeZero: boolean = false): number {
  let val = Math.floor(Math.random() * (max - min + 1)) + min;
  if (excludeZero && val === 0) {
    val = randomRange(min, max, excludeZero);
  }
  return val;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function cleanInvalidJsonBraces(jsonStr: string): string {
  let openBraces = 0;
  let closeBraces = 0;
  let cutIndex = jsonStr.length;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '{') openBraces++;
    else if (char === '}') closeBraces++;

    if (closeBraces > openBraces) {
      cutIndex = i;
      break;
    }
  }
  return jsonStr.substring(0, cutIndex);
}

export function formatTimeSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

export function formatPomoTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function compressImage(base64Str: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
  });
}

export function preventMobileZoom(): void {
  // Prevent double-tap zoom
  let lastTouchTime = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchTime <= 300) {
      event.preventDefault();
    }
    lastTouchTime = now;
  }, { passive: false });

  // Prevent pinch zoom
  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });
}
