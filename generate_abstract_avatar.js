const fs = require('fs');

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function generateSVG(seedString, filename) {
    // Simple hash
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = Math.imul(31, hash) + seedString.charCodeAt(i) | 0;
    }
    const rand = mulberry32(hash);
    
    // Palettes
    const palettes = [
        ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7'],
        ['#3a86ff', '#8338ec', '#ff006e', '#fb5607', '#ffbe0b'],
        ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
        ['#0081a7', '#00afb9', '#fdfcdc', '#fed9b7', '#f07167']
    ];
    
    const palette = palettes[Math.floor(rand() * palettes.length)];
    const bg = palette[0];
    const colors = palette.slice(1);
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <rect width="100" height="100" fill="${bg}" />`;
    
    const numShapes = Math.floor(rand() * 4) + 3; // 3 to 6 shapes
    
    for (let i = 0; i < numShapes; i++) {
        const type = Math.floor(rand() * 3); // 0: circle, 1: rect, 2: polygon
        const color = colors[Math.floor(rand() * colors.length)];
        const x = rand() * 100;
        const y = rand() * 100;
        const size = rand() * 40 + 20;
        const rot = rand() * 360;
        
        if (type === 0) {
            svg += `<circle cx="${x}" cy="${y}" r="${size/2}" fill="${color}" opacity="0.85" />`;
        } else if (type === 1) {
            svg += `<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${color}" transform="rotate(${rot} ${x} ${y})" opacity="0.85" />`;
        } else {
            // Triangle
            const r = size/2;
            svg += `<polygon points="${x},${y-r} ${x+r},${y+r} ${x-r},${y+r}" fill="${color}" transform="rotate(${rot} ${x} ${y})" opacity="0.85" />`;
        }
    }
    
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

generateSVG('user123', 'abstract_1.svg');
generateSVG('admin456', 'abstract_2.svg');
generateSVG('kano789', 'abstract_3.svg');
