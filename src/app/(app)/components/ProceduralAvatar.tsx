import React from 'react';

// Simple seeded PRNG
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

const PALETTES = [
  ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
  ['#0081a7', '#00afb9', '#fdfcdc', '#fed9b7', '#f07167'],
  ['#335c67', '#fff3b0', '#e09f3e', '#9e2a2b', '#540b0e'],
  ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
  ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226']
];

export default function ProceduralAvatar({ seed, className = "" }: { seed: string, className?: string }) {
  const hash = getHash(seed);
  const rand = mulberry32(hash);
  
  const style = Math.floor(rand() * 4); // 0: Shapes, 1: Lissajous, 2: Identicon, 3: Truchet
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)];
  const bg = palette[0];
  const colors = palette.slice(1);

  if (style === 0) {
    // Abstract Shapes
    const numShapes = Math.floor(rand() * 4) + 3;
    const shapes = Array.from({ length: numShapes }).map((_, i) => {
      const type = Math.floor(rand() * 3);
      const color = colors[Math.floor(rand() * colors.length)];
      const x = rand() * 100;
      const y = rand() * 100;
      const size = rand() * 40 + 20;
      const rot = rand() * 360;
      return { type, color, x, y, size, rot, key: i };
    });

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        <rect width="100" height="100" fill={bg} />
        {shapes.map((s) => {
          if (s.type === 0) return <circle key={s.key} cx={s.x} cy={s.y} r={s.size/2} fill={s.color} opacity="0.85" />;
          if (s.type === 1) return <rect key={s.key} x={s.x - s.size/2} y={s.y - s.size/2} width={s.size} height={s.size} fill={s.color} transform={`rotate(${s.rot} ${s.x} ${s.y})`} opacity="0.85" />;
          const r = s.size/2;
          return <polygon key={s.key} points={`${s.x},${s.y-r} ${s.x+r},${s.y+r} ${s.x-r},${s.y+r}`} fill={s.color} transform={`rotate(${s.rot} ${s.x} ${s.y})`} opacity="0.85" />;
        })}
      </svg>
    );
  }

  if (style === 1) {
    // Lissajous
    const A = 40; const B = 40;
    const a = Math.floor(rand() * 5) + 1;
    const b = Math.floor(rand() * 5) + 1;
    const delta = rand() * Math.PI;
    const color = colors[Math.floor(rand() * colors.length)];
    
    let path = `M `;
    for(let t=0; t<=Math.PI*20; t+=0.1) {
      const x = 50 + A * Math.sin(a * t + delta);
      const y = 50 + B * Math.sin(b * t);
      path += `${x},${y} `;
    }

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        <rect width="100" height="100" fill={bg} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" opacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (style === 2) {
    // Identicon
    const color = colors[Math.floor(rand() * colors.length)];
    const grid = 5;
    const size = 100 / grid;
    const blocks = [];

    for(let x=0; x<Math.ceil(grid/2); x++) {
      for(let y=0; y<grid; y++) {
        if(rand() > 0.5) {
          blocks.push(<rect key={`${x}-${y}`} x={x*size} y={y*size} width={size + 0.5} height={size + 0.5} fill={color} />);
          if(x !== Math.floor(grid/2)) {
            blocks.push(<rect key={`sym-${x}-${y}`} x={(grid-1-x)*size} y={y*size} width={size + 0.5} height={size + 0.5} fill={color} />);
          }
        }
      }
    }

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        <rect width="100" height="100" fill={bg} />
        {blocks}
      </svg>
    );
  }

  // Truchet Tiles
  const color = colors[Math.floor(rand() * colors.length)];
  const size = 20;
  const lines = [];
  
  for(let x=0; x<100; x+=size) {
    for(let y=0; y<100; y+=size) {
      if(rand() > 0.5) {
        lines.push(<line key={`${x}-${y}`} x1={x} y1={y} x2={x+size} y2={y+size} stroke={color} strokeWidth="4" strokeLinecap="round" />);
      } else {
        lines.push(<line key={`${x}-${y}`} x1={x+size} y1={y} x2={x} y2={y+size} stroke={color} strokeWidth="4" strokeLinecap="round" />);
      }
    }
  }

  return (
    <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
      <rect width="100" height="100" fill={bg} />
      {lines}
    </svg>
  );
}
