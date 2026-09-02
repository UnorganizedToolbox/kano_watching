const fs = require('fs');

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// 1. Spirograph / Lissajous
function generateLissajous(filename, hashVal) {
    const rand = mulberry32(hashVal);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <rect width="100" height="100" fill="#1e1e2f" />`;
    
    const A = 40; const B = 40;
    const a = Math.floor(rand() * 5) + 1;
    const b = Math.floor(rand() * 5) + 1;
    const delta = rand() * Math.PI;
    const hue = Math.floor(rand() * 360);
    
    let path = `M `;
    for(let t=0; t<=Math.PI*20; t+=0.1) {
        const x = 50 + A * Math.sin(a * t + delta);
        const y = 50 + B * Math.sin(b * t);
        path += `${x},${y} `;
    }
    
    svg += `<path d="${path}" fill="none" stroke="hsl(${hue}, 80%, 60%)" stroke-width="2" opacity="0.8" />`;
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

// 2. Identicon (Symmetric Grid)
function generateIdenticon(filename, hashVal) {
    const rand = mulberry32(hashVal);
    const hue = Math.floor(rand() * 360);
    const color = `hsl(${hue}, 70%, 50%)`;
    const bg = '#f0f0f0';
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <rect width="100" height="100" fill="${bg}" />`;
    
    const grid = 5;
    const size = 100 / grid;
    
    for(let x=0; x<Math.ceil(grid/2); x++) {
        for(let y=0; y<grid; y++) {
            if(rand() > 0.5) {
                // Draw left side
                svg += `<rect x="${x*size}" y="${y*size}" width="${size}" height="${size}" fill="${color}" />`;
                // Draw right side (symmetric)
                if(x !== Math.floor(grid/2)) {
                    svg += `<rect x="${(grid-1-x)*size}" y="${y*size}" width="${size}" height="${size}" fill="${color}" />`;
                }
            }
        }
    }
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

// 3. Truchet Tiles (Maze-like lines)
function generateTruchet(filename, hashVal) {
    const rand = mulberry32(hashVal);
    const hue = Math.floor(rand() * 360);
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <rect width="100" height="100" fill="#222" />`;
    
    const size = 20;
    for(let x=0; x<100; x+=size) {
        for(let y=0; y<100; y+=size) {
            const isFlipped = rand() > 0.5;
            if(isFlipped) {
                svg += `<line x1="${x}" y1="${y}" x2="${x+size}" y2="${y+size}" stroke="hsl(${hue}, 80%, 70%)" stroke-width="4" stroke-linecap="round" />`;
            } else {
                svg += `<line x1="${x+size}" y1="${y}" x2="${x}" y2="${y+size}" stroke="hsl(${hue}, 80%, 70%)" stroke-width="4" stroke-linecap="round" />`;
            }
        }
    }
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

generateLissajous('lissajous.svg', 12345);
generateIdenticon('identicon.svg', 67890);
generateTruchet('truchet.svg', 111213);

