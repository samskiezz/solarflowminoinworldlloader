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
  // "Minion-ish" avatar generator (single self-contained SVG)
  // Goal: cute little humanoid / minion vibe, stable across browsers (no filters, no fancy SVG features).
  const hex = hashHex(id);
  const n = (i, mod) => parseInt(hex.slice(i, i + 2), 16) % mod;

  const size = 96;
  const bodyRx = 30;

  // Variations
  const twoEyes = n(0, 10) >= 4; // ~60% two-eyes
  const mouth = n(2, 3); // 0 smile, 1 smirk, 2 neutral
  const hair = n(4, 4); // 0..3
  const overallShade = n(6, 2); // 0/1
  const accentHue = (parseInt(hex.slice(8, 12), 16) % 360);

  const yellowA = 'hsl(48 98% 62%)';
  const yellowB = 'hsl(45 92% 52%)';
  const denimA = overallShade ? 'hsl(210 85% 40%)' : 'hsl(214 78% 36%)';
  const denimB = overallShade ? 'hsl(210 85% 34%)' : 'hsl(214 78% 30%)';
  const accent = `hsl(${accentHue} 85% 60%)`;

  const label = String(id).slice(0, 10).toUpperCase();

  // Eye geometry
  const eyeY = 36;
  const eyeR = 8;
  const pupilR = 3.5;
  const eye1X = twoEyes ? 40 : 48;
  const eye2X = 56;
  const goggleR = 13;

  function eye(x){
    // slight deterministic pupil offset (stable, never NaN)
    const hx = hashHex(id + ':' + x);
    const dx = ((parseInt(hx.slice(0, 2), 16) % 7) - 3) * 0.5;
    const dy = ((parseInt(hx.slice(2, 4), 16) % 7) - 3) * 0.45;
    return (
      `<circle cx="${x}" cy="${eyeY}" r="${goggleR}" fill="hsl(0 0% 85%)" stroke="hsl(0 0% 35%)" stroke-width="3"/>`+
      `<circle cx="${x}" cy="${eyeY}" r="${eyeR}" fill="white" stroke="hsl(0 0% 75%)" stroke-width="1"/>`+
      `<circle cx="${x + dx}" cy="${eyeY + dy}" r="${pupilR}" fill="hsl(0 0% 12%)"/>`+
      `<circle cx="${x + dx + 1.2}" cy="${eyeY + dy - 1.2}" r="1.2" fill="rgba(255,255,255,0.75)"/>`
    );
  }

  // Mouth
  let mouthPath = '';
  if(mouth === 0){
    mouthPath = `M 38 56 Q 48 66 58 56`;
  } else if(mouth === 1){
    mouthPath = `M 40 58 Q 48 64 60 57`;
  } else {
    mouthPath = `M 40 60 Q 48 59 56 60`;
  }

  // Hair spikes
  let hairPath = '';
  if(hair === 1) hairPath = `M 44 14 L 46 6 L 48 14`;
  if(hair === 2) hairPath = `M 38 16 L 40 7 L 42 16 M 54 16 L 56 7 L 58 16`;
  if(hair === 3) hairPath = `M 34 18 L 36 8 L 38 18 M 46 16 L 48 6 L 50 16 M 58 18 L 60 8 L 62 18`;

  return (
`<?xml version="1.0" encoding="UTF-8"?>\n`+
`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n`+
`  <defs>\n`+
`    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">\n`+
`      <stop offset="0" stop-color="hsl(${accentHue} 70% 14%)"/>\n`+
`      <stop offset="1" stop-color="hsl(${(accentHue + 40) % 360} 80% 8%)"/>\n`+
`    </linearGradient>\n`+
`    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">\n`+
`      <stop offset="0" stop-color="${yellowA}"/>\n`+
`      <stop offset="1" stop-color="${yellowB}"/>\n`+
`    </linearGradient>\n`+
`    <linearGradient id="denim" x1="0" y1="0" x2="0" y2="1">\n`+
`      <stop offset="0" stop-color="${denimA}"/>\n`+
`      <stop offset="1" stop-color="${denimB}"/>\n`+
`    </linearGradient>\n`+
`  </defs>\n`+
`
`+
`  <rect x="0" y="0" width="${size}" height="${size}" rx="20" fill="url(#bg)"/>\n`+
`  <rect x="6" y="6" width="${size-12}" height="${size-12}" rx="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>\n`+
`
`+
`  <!-- body -->\n`+
`  <rect x="24" y="14" width="48" height="68" rx="${bodyRx}" fill="url(#body)" stroke="rgba(0,0,0,0.25)"/>\n`+
`
`+
`  <!-- hair -->\n`+
`  ${hairPath ? `<path d="${hairPath}" stroke="rgba(0,0,0,0.35)" stroke-width="3" stroke-linecap="round" fill="none"/>` : ''}\n`+
`
`+
`  <!-- goggle strap -->\n`+
`  <rect x="22" y="30" width="52" height="12" rx="6" fill="rgba(0,0,0,0.25)"/>\n`+
`
`+
`  <!-- goggles + eyes -->\n`+
`  ${eye(eye1X)}\n`+
`  ${twoEyes ? eye(eye2X) : ''}\n`+
`  ${twoEyes ? `<path d="M ${eye1X + goggleR} ${eyeY} L ${eye2X - goggleR} ${eyeY}" stroke="hsl(0 0% 35%)" stroke-width="6" stroke-linecap="round"/>` : ''}\n`+
`
`+
`  <!-- mouth -->\n`+
`  <path d="${mouthPath}" stroke="rgba(0,0,0,0.45)" stroke-width="3" stroke-linecap="round" fill="none"/>\n`+
`
`+
`  <!-- overalls -->\n`+
`  <path d="M 28 52 C 34 48 40 48 48 52 C 56 48 62 48 68 52 L 68 82 L 28 82 Z" fill="url(#denim)"/>\n`+
`  <rect x="34" y="50" width="8" height="12" rx="3" fill="url(#denim)"/>\n`+
`  <rect x="54" y="50" width="8" height="12" rx="3" fill="url(#denim)"/>\n`+
`  <circle cx="38" cy="60" r="2.2" fill="${accent}"/>\n`+
`  <circle cx="58" cy="60" r="2.2" fill="${accent}"/>\n`+
`  <rect x="42" y="66" width="12" height="10" rx="3" fill="rgba(0,0,0,0.18)"/>\n`+
`  <path d="M 44 71 L 52 71" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="round"/>\n`+
`
`+
`  <!-- label (debuggable, small) -->\n`+
`  <text x="${size/2}" y="${size-8}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="8" fill="rgba(255,255,255,0.60)">${label}</text>\n`+
`</svg>\n`
  );
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
