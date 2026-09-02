const fs = require('fs');

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// 1. Mandala / Sacred Geometry
function generateMandala(filename, hash) {
    const rand = mulberry32(hash);
    const bg = '#111827';
    const fg = `hsl(${Math.floor(rand() * 360)}, 80%, 65%)`;
    const fg2 = `hsl(${Math.floor(rand() * 360)}, 80%, 65%)`;
    
    let svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bg}"/>`;
    
    const layers = Math.floor(rand() * 3) + 3; // 3 to 5 layers
    for(let l=0; l<layers; l++) {
        const sides = Math.floor(rand() * 6) + 3; // 3 to 8 sides
        const radius = 10 + (l * (40 / layers));
        const rotOffset = rand() * 360;
        const isFilled = rand() > 0.5;
        const color = rand() > 0.5 ? fg : fg2;
        
        let points = [];
        for(let i=0; i<sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            const px = 50 + radius * Math.cos(angle);
            const py = 50 + radius * Math.sin(angle);
            points.push(`${px},${py}`);
        }
        
        const stroke = isFilled ? 'none' : color;
        const fill = isFilled ? color : 'none';
        const opacity = isFilled ? 0.3 : 0.8;
        
        svg += `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="${opacity}" transform="rotate(${rotOffset} 50 50)"/>`;
        
        if (rand() > 0.5) {
            svg += `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>`;
        }
    }
    
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

// 2. Fluid Blobs
function generateBlob(filename, hash) {
    const rand = mulberry32(hash);
    const bg = `hsl(${Math.floor(rand() * 360)}, 30%, 90%)`;
    let svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bg}"/>`;
    
    const layers = 3;
    const hue = Math.floor(rand() * 360);
    
    for(let l=0; l<layers; l++) {
        const points = [];
        const numPoints = 8;
        const rBase = 45 - l * 12;
        
        for(let i=0; i<numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints;
            const r = rBase + (rand() * 10 - 5);
            points.push({
                x: 50 + r * Math.cos(angle),
                y: 50 + r * Math.sin(angle)
            });
        }
        
        let d = `M ${(points[0].x + points[numPoints-1].x)/2} ${(points[0].y + points[numPoints-1].y)/2} `;
        for(let i=0; i<numPoints; i++) {
            const p1 = points[i];
            const p2 = points[(i+1)%numPoints];
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            d += `Q ${p1.x} ${p1.y} ${cx} ${cy} `;
        }
        
        svg += `<path d="${d}" fill="hsl(${hue + l*20}, 70%, 60%)" opacity="0.8"/>`;
    }
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

// 3. Circuit Board
function generateCircuit(filename, hash) {
    const rand = mulberry32(hash);
    const bg = '#0f172a';
    const color = '#38bdf8'; 
    
    let svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bg}"/>`;
    
    const numPaths = 6;
    for(let i=0; i<numPaths; i++) {
        let x = Math.floor(rand() * 5) * 20 + 10;
        let y = Math.floor(rand() * 5) * 20 + 10;
        let d = `M ${x} ${y} `;
        
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
        
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
        svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;
        svg += `<circle cx="${x}" cy="${y}" r="2" fill="none" stroke="${color}" stroke-width="1.5" />`;
    }
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

// 4. Low Poly
function generateLowPoly(filename, hash) {
    const rand = mulberry32(hash);
    const hue = Math.floor(rand() * 360);
    
    let svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">`;
    
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
    
    for(let y=0; y<grid; y++) {
        for(let x=0; x<grid; x++) {
            const p1 = pts[y][x];
            const p2 = pts[y][x+1];
            const p3 = pts[y+1][x];
            const p4 = pts[y+1][x+1];
            
            const lum1 = 40 + rand() * 40;
            const lum2 = 40 + rand() * 40;
            
            svg += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="hsl(${hue}, 60%, ${lum1}%)" stroke="hsl(${hue}, 60%, ${lum1}%)" stroke-width="0.5"/>`;
            svg += `<polygon points="${p2.x},${p2.y} ${p4.x},${p4.y} ${p3.x},${p3.y}" fill="hsl(${hue}, 60%, ${lum2}%)" stroke="hsl(${hue}, 60%, ${lum2}%)" stroke-width="0.5"/>`;
        }
    }
    svg += `</svg>`;
    fs.writeFileSync(filename, svg);
}

generateMandala('mandala.svg', 101);
generateBlob('blob.svg', 202);
generateCircuit('circuit.svg', 303);
generateLowPoly('lowpoly.svg', 404);
