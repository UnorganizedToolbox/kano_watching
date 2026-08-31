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
  ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226'],
  ['#0f172a', '#38bdf8', '#818cf8', '#c084fc', '#e879f9']
];

export default function ProceduralAvatar({ seed, className = "" }: { seed: string, className?: string }) {
  const hash = getHash(seed);
  const rand = mulberry32(hash);
  
  const totalStyles = 7;
  const style = Math.floor(rand() * totalStyles); 
  // 0: Shapes, 1: Lissajous, 2: Identicon, 3: Truchet, 4: Mandala, 5: Circuit, 6: LowPoly
  
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

  if (style === 3) {
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

  if (style === 4) {
    // Mandala
    const layers = Math.floor(rand() * 3) + 3; // 3 to 5 layers
    const elements = [];
    
    for(let l=0; l<layers; l++) {
      const sides = Math.floor(rand() * 6) + 3; // 3 to 8 sides
      const radius = 10 + (l * (40 / layers));
      const rotOffset = rand() * 360;
      const isFilled = rand() > 0.5;
      const color = colors[Math.floor(rand() * colors.length)];
      
      let points = [];
      for(let i=0; i<sides; i++) {
          const angle = (Math.PI * 2 * i) / sides;
          const px = 50 + radius * Math.cos(angle);
          const py = 50 + radius * Math.sin(angle);
          points.push(`${px},${py}`);
      }
      
      const stroke = isFilled ? 'none' : color;
      const fill = isFilled ? color : 'none';
      const opacity = isFilled ? 0.4 : 0.8;
      
      elements.push(
        <polygon key={`poly-${l}`} points={points.join(' ')} fill={fill} stroke={stroke} strokeWidth="1.5" opacity={opacity} transform={`rotate(${rotOffset} 50 50)`}/>
      );
      
      if (rand() > 0.5) {
        elements.push(
          <circle key={`circ-${l}`} cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="0.5" opacity="0.5"/>
        );
      }
    }
    
    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        <rect width="100" height="100" fill={bg} />
        {elements}
      </svg>
    );
  }

  if (style === 5) {
    // Circuit Board
    const color = colors[Math.floor(rand() * colors.length)];
    const numPaths = 6;
    const elements = [];
    
    for(let i=0; i<numPaths; i++) {
        let x = Math.floor(rand() * 5) * 20 + 10;
        let y = Math.floor(rand() * 5) * 20 + 10;
        let d = `M ${x} ${y} `;
        
        elements.push(<circle key={`start-${i}`} cx={x} cy={y} r="3" fill={color} />);
        
        const steps = Math.floor(rand() * 3) + 2;
        for(let s=0; s<steps; s++) {
            const dir = Math.floor(rand() * 4);
            const dist = (Math.floor(rand() * 2) + 1) * 20;
            if (dir === 0) y = Math.max(10, y - dist);
            if (dir === 1) x = Math.min(90, x + dist);
            if (dir === 2) y = Math.min(90, y + dist);
            if (dir === 3) x = Math.max(10, x - dist);
            
            if (rand() > 0.5) {
                const offset = 10;
                if (dir % 2 === 0) x += (rand()>0.5?offset:-offset);
                else y += (rand()>0.5?offset:-offset);
            }
            d += `L ${x} ${y} `;
        }
        elements.push(<path key={`path-${i}`} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />);
        elements.push(<circle key={`end-${i}`} cx={x} cy={y} r="2" fill="none" stroke={color} strokeWidth="1.5" />);
    }

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        <rect width="100" height="100" fill={bg} />
        {elements}
      </svg>
    );
  }

  if (style === 6) {
    // Low Poly
    const hue = Math.floor(rand() * 360);
    const grid = 4;
    const step = 100 / grid;
    const pts = [];
    
    for(let y=0; y<=grid; y++) {
        let row = [];
        for(let x=0; x<=grid; x++) {
            const px = (x * step) + (rand() * step - step/2);
            const py = (y * step) + (rand() * step - step/2);
            row.push({x: px, y: py});
        }
        pts.push(row);
    }
    
    const elements = [];
    for(let y=0; y<grid; y++) {
        for(let x=0; x<grid; x++) {
            const p1 = pts[y][x];
            const p2 = pts[y][x+1];
            const p3 = pts[y+1][x];
            const p4 = pts[y+1][x+1];
            
            const lum1 = 40 + rand() * 40;
            const lum2 = 40 + rand() * 40;
            
            const color1 = `hsl(${hue}, 60%, ${lum1}%)`;
            const color2 = `hsl(${hue}, 60%, ${lum2}%)`;
            
            elements.push(<polygon key={`poly1-${x}-${y}`} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={color1} stroke={color1} strokeWidth="0.5"/>);
            elements.push(<polygon key={`poly2-${x}-${y}`} points={`${p2.x},${p2.y} ${p4.x},${p4.y} ${p3.x},${p3.y}`} fill={color2} stroke={color2} strokeWidth="0.5"/>);
        }
    }

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
        {elements}
      </svg>
    );
  }
  
  return null;
}
