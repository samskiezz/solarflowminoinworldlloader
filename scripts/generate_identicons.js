const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashHex(s){
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}
function hsl(h,s,l){
  return `hsl(${h} ${s}% ${l}%)`;
}

function svgFor(id){
  const hex = hashHex(id);
  const h1 = parseInt(hex.slice(0,4),16) % 360;
  const h2 = (h1 + 120 + (parseInt(hex.slice(4,8),16)%60)) % 360;
  const h3 = (h1 + 240 + (parseInt(hex.slice(8,12),16)%60)) % 360;

  // 5x5 symmetric grid
  const bits = [];
  for(let i=0;i<15;i++){
    bits.push(parseInt(hex.slice(12+i, 13+i),16) % 2);
  }

  const cell=12, pad=10;
  const size = pad*2 + cell*5;

  const bg = hsl(h1, 70, 10);
  const cA = hsl(h2, 80, 55);
  const cB = hsl(h3, 85, 60);

  let rects='';
  for(let r=0;r<5;r++){
    for(let c=0;c<3;c++){
      const on = bits[r*3+c] === 1;
      if(!on) continue;
      const x = pad + c*cell;
      const y = pad + r*cell;
      const fill = (r+c)%2===0 ? cA : cB;
      rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}"/>`;
      const mx = pad + (4-c)*cell;
      if(mx!==x){
        rects += `<rect x="${mx}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}"/>`;
      }
    }
  }

  const label = String(id).slice(0,6).toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>\n`+
`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n`+
`  <defs>\n`+
`    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n`+
`      <stop offset="0" stop-color="${hsl(h1,80,18)}"/>\n`+
`      <stop offset="1" stop-color="${hsl(h1,80,8)}"/>\n`+
`    </linearGradient>\n`+
`  </defs>\n`+
`  <rect x="0" y="0" width="${size}" height="${size}" rx="18" fill="url(#g)"/>\n`+
`  <rect x="6" y="6" width="${size-12}" height="${size-12}" rx="14" fill="${bg}" opacity="0.35"/>\n`+
`  ${rects}\n`+
`  <text x="${size/2}" y="${size-8}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="10" fill="rgba(255,255,255,0.72)">${label}</text>\n`+
`</svg>\n`;
}

const docs = path.join(__dirname,'..','docs');
const hivePath = path.join(docs,'hive_state.json');
const outDir = path.join(docs,'avatars','identicons');
fs.mkdirSync(outDir,{recursive:true});

const hive = JSON.parse(fs.readFileSync(hivePath,'utf8'));
const roster = hive?.minions?.roster || [];

for(const m of roster){
  const id = m.id;
  const svg = svgFor(id);
  const out = path.join(outDir, `${id}.svg`);
  fs.writeFileSync(out, svg);
  m.avatar_url = `./avatars/identicons/${id}.svg`;
}

// write hive back (canonical source of truth)
fs.writeFileSync(hivePath, JSON.stringify(hive, null, 2) + '\n');
console.log('generate_identicons ok', roster.length);
