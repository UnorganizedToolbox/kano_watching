import os

def create_markov_svg(path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180" width="100%" height="100%">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#fafafa" rx="6" stroke="#e5e7eb" stroke-width="1"/>
  
  <!-- Definitions for Markers -->
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
    </marker>
    <marker id="arrow-grey" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#6b7280" />
    </marker>
  </defs>

  <!-- Node 1: Math -->
  <circle cx="80" cy="90" r="28" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2" />
  <text x="80" y="94" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e1b4b" text-anchor="middle">数学 (S₁)</text>
  
  <!-- Node 2: English -->
  <circle cx="210" cy="90" r="28" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2" />
  <text x="210" y="94" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e1b4b" text-anchor="middle">英語 (S₂)</text>

  <!-- Node 3: Break -->
  <circle cx="340" cy="90" r="28" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" />
  <text x="340" y="94" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1f2937" text-anchor="middle">休憩 (S₃)</text>

  <!-- Transition: Math to English -->
  <path d="M 80 90 A 85 85 0 0 1 210 90" fill="none" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="145" y="55" font-family="sans-serif" font-size="10" fill="#4f46e5" text-anchor="middle" font-weight="bold">P₁₂ = 30%</text>

  <!-- Transition: English to Math -->
  <path d="M 210 90 A 85 85 0 0 1 80 90" fill="none" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="145" y="135" font-family="sans-serif" font-size="10" fill="#4f46e5" text-anchor="middle" font-weight="bold">P₂₁ = 10%</text>

  <!-- Transition: Math to Break -->
  <path d="M 80 90 L 340 90" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow-grey)" />
  <text x="275" y="84" font-family="sans-serif" font-size="10" fill="#374151" text-anchor="middle" font-weight="bold">P₁₃ = 60%</text>

  <!-- Transition: English to Break -->
  <path d="M 210 90 L 340 90" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow-grey)" />
  <text x="275" y="112" font-family="sans-serif" font-size="10" fill="#374151" text-anchor="middle" font-weight="bold">P₂₃ = 80%</text>

  <!-- Self loops -->
  <!-- Math self loop -->
  <path d="M 68 65 C 50 20, 110 20, 92 65" fill="none" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="80" y="25" font-family="sans-serif" font-size="9" fill="#4f46e5" text-anchor="middle">P₁₁ = 10%</text>

  <!-- English self loop -->
  <path d="M 198 65 C 180 20, 240 20, 222 65" fill="none" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="210" y="25" font-family="sans-serif" font-size="9" fill="#4f46e5" text-anchor="middle">P₂₂ = 10%</text>
</svg>
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Created Markov SVG at {path}")

def create_regression_svg(path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220" width="100%" height="100%">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#fafafa" rx="6" stroke="#e5e7eb" stroke-width="1"/>
  
  <!-- Grid Lines -->
  <line x1="50" y1="40" x2="380" y2="40" stroke="#e5e7eb" stroke-width="1" />
  <line x1="50" y1="80" x2="380" y2="80" stroke="#e5e7eb" stroke-width="1" />
  <line x1="50" y1="120" x2="380" y2="120" stroke="#e5e7eb" stroke-width="1" />
  <line x1="50" y1="160" x2="380" y2="160" stroke="#e5e7eb" stroke-width="1" />

  <!-- Y-Axis Labels -->
  <text x="42" y="44" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="end">60s</text>
  <text x="42" y="84" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="end">40s</text>
  <text x="42" y="124" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="end">20s</text>
  <text x="42" y="164" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="end">0s</text>

  <!-- Axes -->
  <line x1="50" y1="20" x2="50" y2="160" stroke="#4b5563" stroke-width="1.5" />
  <line x1="50" y1="160" x2="390" y2="160" stroke="#4b5563" stroke-width="1.5" />
  
  <!-- Axis Labels -->
  <text x="220" y="195" font-family="sans-serif" font-size="10" fill="#1f2937" text-anchor="middle" font-weight="bold">連続サイクル数 (x)</text>
  <text x="15" y="90" font-family="sans-serif" font-size="10" fill="#1f2937" text-anchor="middle" font-weight="bold" transform="rotate(-90 15 90)">反応遅延秒数 (y)</text>

  <!-- X-Axis Labels (Sessions) -->
  <text x="100" y="175" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="middle">#1</text>
  <text x="160" y="175" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="middle">#2</text>
  <text x="220" y="175" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="middle">#3</text>
  <text x="280" y="175" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="middle">#4</text>
  <text x="340" y="175" font-family="sans-serif" font-size="9" fill="#6b7280" text-anchor="middle">#5</text>

  <!-- Data Points (Scatter) -->
  <!-- (1, 5) -> x=100, y=160 - 5*2 = 150 -->
  <circle cx="100" cy="150" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />
  <!-- (2, 12) -> x=160, y=160 - 12*2 = 136 -->
  <circle cx="160" cy="136" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />
  <!-- (3, 20) -> x=220, y=160 - 20*2 = 120 -->
  <circle cx="220" cy="120" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />
  <!-- (4, 45) -> x=280, y=160 - 45*2 = 70 -->
  <circle cx="280" cy="70" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />
  <!-- (5, 52) -> x=340, y=160 - 52*2 = 56 -->
  <circle cx="340" cy="56" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />

  <!-- Regression Line y = 12.8x - 12.2 -->
  <!-- For x=1 (100): y = 160 - 0.6*2 = 158.8 -->
  <!-- For x=5 (340): y = 160 - 51.8*2 = 56.4 -->
  <line x1="80" y1="160" x2="360" y2="45" stroke="#ef4444" stroke-width="2" stroke-linecap="round" />
  
  <!-- Line Label -->
  <text x="320" y="35" font-family="sans-serif" font-size="9" fill="#ef4444" font-weight="bold">回帰直線 y = ax + b (a &gt; 0)</text>
</svg>
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Created Regression SVG at {path}")

if __name__ == "__main__":
    dir_path = "/home/user/Documents/projects/math-diagnostic-tool"
    create_markov_svg(os.path.join(dir_path, "markov.svg"))
    create_regression_svg(os.path.join(dir_path, "regression.svg"))
