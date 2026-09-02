const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', 'utf8');

// Insert noise generator function
const noiseFunction = `
let bgmCtx: AudioContext | null = null;
let bgmNode: AudioBufferSourceNode | null = null;

function stopAmbientBgm() {
  if (bgmNode) {
    try { bgmNode.stop(); } catch(e) {}
    bgmNode.disconnect();
    bgmNode = null;
  }
}

function playAmbientBgm(type: 'none' | 'white' | 'pink' | 'brown') {
  stopAmbientBgm();
  if (type === 'none') return;
  
  try {
    if (!bgmCtx) {
      bgmCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (bgmCtx.state === 'suspended') bgmCtx.resume();
    
    const bufferSize = bgmCtx.sampleRate * 2; // 2 seconds buffer
    const buffer = bgmCtx.createBuffer(1, bufferSize, bgmCtx.sampleRate);
    const output = buffer.getChannelData(0);
    
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    let lastOut = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'white') {
        output[i] = white * 0.1;
      } 
      else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.02;
      }
      else if (type === 'brown') {
        let out = (lastOut + (0.02 * white)) / 1.02;
        lastOut = out;
        output[i] = out * 0.3;
      }
    }
    
    bgmNode = bgmCtx.createBufferSource();
    bgmNode.buffer = buffer;
    bgmNode.loop = true;
    bgmNode.connect(bgmCtx.destination);
    bgmNode.start();
  } catch (e) {
    console.error("BGM playback failed", e);
  }
}
`;

content = content.replace(/function speakText\(text: string\) \{/, noiseFunction + '\nfunction speakText(text: string) {');

// Add bgmType state
content = content.replace(/const \[soundType, setSoundType\] = useState<SoundType>\('chime'\);/,
  "const [soundType, setSoundType] = useState<SoundType>('chime');\n  const [bgmType, setBgmType] = useState<'none'|'white'|'pink'|'brown'>('none');");

// Handle bgm start/stop
content = content.replace(/const toggleTimer = \(\) => setIsRunning\(!isRunning\);/,
  `const toggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      playAmbientBgm(bgmType);
    } else {
      setIsRunning(false);
      stopAmbientBgm();
    }
  };`);
  
content = content.replace(/const handleStop = \(\) => \{/,
  `const handleStop = () => {
    stopAmbientBgm();`);
    
content = content.replace(/if \(mode === 'WORK'\) \{/,
  `stopAmbientBgm();
    if (mode === 'WORK') {`);

// Add BGM selector to UI
content = content.replace(/<span className="text-xs font-bold text-slate-400 py-1">今日: \{pomoCount\} 回<\/span>/,
  `
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            <i className="fa-solid fa-headphones text-slate-500 w-3 h-3 text-xs"></i>
            <select 
              value={bgmType}
              onChange={(e) => {
                const val = e.target.value as 'none'|'white'|'pink'|'brown';
                setBgmType(val);
                if (isRunning) playAmbientBgm(val);
              }}
              className="text-xs bg-transparent border-none text-slate-500 font-bold outline-none cursor-pointer"
              title="環境音の設定"
            >
              <option value="none">BGMなし</option>
              <option value="pink">ピンクノイズ（雨音風）</option>
              <option value="brown">ブラウンノイズ（低音）</option>
              <option value="white">ホワイトノイズ</option>
            </select>
          </div>
          <span className="text-xs font-bold text-slate-400 py-1">今日: {pomoCount} 回</span>
  `);

fs.writeFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', content);
