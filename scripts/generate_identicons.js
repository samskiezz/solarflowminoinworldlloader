const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashHex(s){
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function pick(hex, offset, mod){
  return (parseInt(hex.slice(offset, offset + 2), 16) || 0) % mod;
}

function clamp(n, lo, hi){
  return Math.min(Math.max(n, lo), hi);
}

function hsl(h,s,l){
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function featuresFor(id, salt=0){
  const hex = hashHex(`${id}|${salt}`);

  // Body palette: mostly minion-yellow, but allow distinct “humanoid” variants.
  const bodyPal = pick(hex, 0, 6); // 0..5
  const body = (function(){
    if(bodyPal === 0) return { a: 'hsl(48 98% 62%)', b: 'hsl(45 92% 52%)' }; // classic minion
    if(bodyPal === 1) return { a: 'hsl(55 92% 70%)', b: 'hsl(48 88% 56%)' }; // banana bright
    if(bodyPal === 2) return { a: 'hsl(160 75% 58%)', b: 'hsl(160 70% 44%)' }; // mint
    if(bodyPal === 3) return { a: 'hsl(200 90% 62%)', b: 'hsl(210 85% 46%)' }; // sky
    if(bodyPal === 4) return { a: 'hsl(330 85% 68%)', b: 'hsl(335 78% 52%)' }; // pink
    return { a: 'hsl(25 90% 62%)', b: 'hsl(18 82% 48%)' }; // orange
  })();

  const accentHue = (parseInt(hex.slice(2, 6), 16) || 0) % 360;
  const accent2Hue = (accentHue + 120 + pick(hex, 6, 60)) % 360;

  const bg = {
    h1: accentHue,
    h2: (accentHue + 42 + pick(hex, 8, 40)) % 360
  };

  const goggle = {
    type: pick(hex, 10, 3), // 0=mono,1=dual,2=tri
    rim: pick(hex, 12, 3),  // 0=steel,1=gold,2=black
    strap: pick(hex, 14, 2) // 0 dark, 1 colored
  };

  const eye = {
    irisHue: (accent2Hue + pick(hex, 16, 80)) % 360,
    mood: pick(hex, 18, 4) // 0 normal,1 happy,2 sleepy,3 surprised
  };

  const hair = {
    style: pick(hex, 20, 7),
    hue: (accent2Hue + 180 + pick(hex, 22, 120)) % 360,
    sat: 40 + pick(hex, 24, 50),
    lit: 20 + pick(hex, 26, 35)
  };

  const outfit = {
    type: pick(hex, 28, 4), // 0 overalls,1 hoodie,2 suit,3 robe
    hue: (accentHue + 200 + pick(hex, 30, 120)) % 360,
    sat: 55 + pick(hex, 32, 30),
    litA: 28 + pick(hex, 34, 18),
    litB: 18 + pick(hex, 36, 16)
  };

  const accessory = {
    type: pick(hex, 38, 6), // 0 none,1 cap,2 antenna,3 bow,4 badge,5 earmuffs
    hue: (accentHue + pick(hex, 40, 180)) % 360
  };

  const mouth = pick(hex, 42, 6); // more variety
  const cheeks = pick(hex, 44, 3) !== 0; // ~66%
  const freckles = pick(hex, 46, 5) === 0; // ~20%

  return { hex, body, bg, goggle, eye, hair, outfit, accessory, mouth, cheeks, freckles };
}

function svgFor(id, salt=0){
  // Humanoid "minion" SVG (no filters, no external refs)
  const F = featuresFor(id, salt);

  const size = 112;
  const pad = 8;
  const cx = size/2;

  const label = String(id).slice(0, 12).toUpperCase();

  const bodyRx = 34;
  const headY = 16;
  const headH = 78;
  const headX = 28;
  const headW = 56;

  const strapFill = F.goggle.strap ? `rgba(255,255,255,0.10)` : `rgba(0,0,0,0.25)`;

  const rim = (function(){
    if(F.goggle.rim === 0) return { fill: 'hsl(0 0% 88%)', stroke: 'hsl(0 0% 35%)' };
    if(F.goggle.rim === 1) return { fill: 'hsl(46 95% 55%)', stroke: 'hsl(34 85% 22%)' };
    return { fill: 'hsl(0 0% 20%)', stroke: 'hsl(0 0% 10%)' };
  })();

  function irisColor(){
    return hsl(F.eye.irisHue, 70, 45);
  }

  function pupilOffset(x){
    const hx = hashHex(id + ':' + salt + ':' + x);
    const dx = ((parseInt(hx.slice(0,2),16)%7)-3) * 0.55;
    const dy = ((parseInt(hx.slice(2,4),16)%7)-3) * 0.45;
    return { dx, dy };
  }

  function eyeSvg(x, y, rOuter){
    const { dx, dy } = pupilOffset(x);

    // eyelid variants (simple paths)
    const lid = (function(){
      if(F.eye.mood === 2){
        return `<path d="M ${x-rOuter+2} ${y-2} Q ${x} ${y+rOuter-2} ${x+rOuter-2} ${y-2}" stroke="rgba(0,0,0,0.35)" stroke-width="4" stroke-linecap="round" fill="none"/>`;
      }
      if(F.eye.mood === 1){
        return `<path d="M ${x-rOuter+2} ${y-4} Q ${x} ${y-10} ${x+rOuter-2} ${y-4}" stroke="rgba(0,0,0,0.25)" stroke-width="4" stroke-linecap="round" fill="none"/>`;
      }
      return '';
    })();

    const irisR = rOuter * 0.38;
    const pupilR = rOuter * 0.18;

    const sparkle = `<circle cx="${x + dx + 1.2}" cy="${y + dy - 1.4}" r="1.3" fill="rgba(255,255,255,0.75)"/>`;

    return (
      `<circle cx="${x}" cy="${y}" r="${rOuter}" fill="${rim.fill}" stroke="${rim.stroke}" stroke-width="3"/>`+
      `<circle cx="${x}" cy="${y}" r="${rOuter*0.62}" fill="white" stroke="rgba(0,0,0,0.10)" stroke-width="2"/>`+
      `<circle cx="${x}" cy="${y}" r="${irisR}" fill="${irisColor()}"/>`+
      `<circle cx="${x + dx}" cy="${y + dy}" r="${pupilR}" fill="hsl(0 0% 12%)"/>`+
      sparkle +
      lid
    );
  }

  // Goggles layout
  const eyeY = 44;
  let eyes = [];
  if(F.goggle.type === 0){
    eyes = [{ x: cx, y: eyeY, r: 15 }];
  } else if(F.goggle.type === 1){
    eyes = [{ x: cx - 12, y: eyeY, r: 14 }, { x: cx + 12, y: eyeY, r: 14 }];
  } else {
    eyes = [{ x: cx - 18, y: eyeY, r: 13 }, { x: cx, y: eyeY, r: 13 }, { x: cx + 18, y: eyeY, r: 13 }];
  }

  // Hair styles (simple, very different silhouettes)
  const hairStroke = hsl(F.hair.hue, F.hair.sat, F.hair.lit);
  const hairSvg = (function(){
    const top = headY + 6;
    if(F.hair.style === 0) return '';
    if(F.hair.style === 1) return `<path d="M ${cx-10} ${top+4} L ${cx-6} ${top-8} L ${cx-2} ${top+4}" stroke="${hairStroke}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    if(F.hair.style === 2) return `<path d="M ${cx-20} ${top+8} Q ${cx} ${top-12} ${cx+20} ${top+8}" stroke="${hairStroke}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    if(F.hair.style === 3) return `<path d="M ${cx-24} ${top+12} C ${cx-10} ${top-18} ${cx+10} ${top-18} ${cx+24} ${top+12}" stroke="${hairStroke}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    if(F.hair.style === 4) return `<path d="M ${cx-26} ${top+10} L ${cx-18} ${top-10} L ${cx-10} ${top+10} L ${cx-2} ${top-12} L ${cx+6} ${top+10} L ${cx+14} ${top-8} L ${cx+22} ${top+10}" stroke="${hairStroke}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    if(F.hair.style === 5) return `<path d="M ${cx-18} ${top+10} Q ${cx-10} ${top-10} ${cx} ${top+6} Q ${cx+10} ${top-10} ${cx+18} ${top+10}" stroke="${hairStroke}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    return `<path d="M ${cx-26} ${top+16} Q ${cx-10} ${top-18} ${cx+6} ${top+10} Q ${cx+16} ${top-8} ${cx+26} ${top+14}" stroke="${hairStroke}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  })();

  // Accessories
  const acc = (function(){
    const a = hsl(F.accessory.hue, 80, 55);
    const a2 = hsl((F.accessory.hue + 30) % 360, 85, 45);
    if(F.accessory.type === 0) return '';
    if(F.accessory.type === 1){ // cap
      return (
        `<path d="M 30 26 Q 56 8 82 26" fill="${a}" opacity="0.95"/>`+
        `<rect x="30" y="24" width="52" height="10" rx="5" fill="${a2}" opacity="0.95"/>`
      );
    }
    if(F.accessory.type === 2){ // antenna
      return `<path d="M ${cx} 14 L ${cx} 4" stroke="${a2}" stroke-width="4" stroke-linecap="round"/>`+
             `<circle cx="${cx}" cy="4" r="4" fill="${a}"/>`;
    }
    if(F.accessory.type === 3){ // bow
      return `<path d="M ${cx-10} 22 Q ${cx-18} 14 ${cx-10} 10 Q ${cx-2} 14 ${cx-10} 22" fill="${a}"/>`+
             `<path d="M ${cx+10} 22 Q ${cx+18} 14 ${cx+10} 10 Q ${cx+2} 14 ${cx+10} 22" fill="${a}"/>`+
             `<circle cx="${cx}" cy="14" r="3" fill="${a2}"/>`;
    }
    if(F.accessory.type === 4){ // badge
      return `<circle cx="${cx+18}" cy="78" r="6" fill="${a}" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>`+
             `<path d="M ${cx+15} 78 L ${cx+21} 78" stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linecap="round"/>`;
    }
    // earmuffs
    return `<circle cx="24" cy="48" r="8" fill="${a}" opacity="0.95"/>`+
           `<circle cx="88" cy="48" r="8" fill="${a}" opacity="0.95"/>`+
           `<path d="M 26 44 Q 56 20 86 44" stroke="${a2}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9"/>`;
  })();

  // Mouth variants
  const mouth = (function(){
    const x1 = cx - 14;
    const x2 = cx + 14;
    const y = 66;
    if(F.mouth === 0) return `M ${x1} ${y} Q ${cx} ${y+10} ${x2} ${y}`;            // smile
    if(F.mouth === 1) return `M ${x1} ${y+2} Q ${cx} ${y-6} ${x2} ${y+2}`;        // frown-ish
    if(F.mouth === 2) return `M ${x1} ${y} Q ${cx} ${y} ${x2} ${y}`;              // neutral
    if(F.mouth === 3) return `M ${x1} ${y+1} Q ${cx} ${y+8} ${x2} ${y-2}`;        // smirk
    if(F.mouth === 4) return `M ${x1+2} ${y} Q ${cx} ${y+12} ${x2-2} ${y}`;       // big grin
    return `M ${x1} ${y+2} Q ${cx-4} ${y-2} ${cx} ${y+2} Q ${cx+4} ${y+6} ${x2} ${y+2}`; // wavy
  })();

  const cheekSvg = F.cheeks
    ? `<circle cx="${cx-20}" cy="62" r="4" fill="rgba(255,120,150,0.25)"/>`+
      `<circle cx="${cx+20}" cy="62" r="4" fill="rgba(255,120,150,0.25)"/>`
    : '';

  const frecklesSvg = F.freckles
    ? `<circle cx="${cx-10}" cy="60" r="1.2" fill="rgba(0,0,0,0.18)"/>`+
      `<circle cx="${cx-6}" cy="62" r="1.2" fill="rgba(0,0,0,0.16)"/>`+
      `<circle cx="${cx-2}" cy="60" r="1.2" fill="rgba(0,0,0,0.14)"/>`+
      `<circle cx="${cx+10}" cy="60" r="1.2" fill="rgba(0,0,0,0.18)"/>`+
      `<circle cx="${cx+6}" cy="62" r="1.2" fill="rgba(0,0,0,0.16)"/>`+
      `<circle cx="${cx+2}" cy="60" r="1.2" fill="rgba(0,0,0,0.14)"/>`
    : '';

  const outfitA = hsl(F.outfit.hue, F.outfit.sat, F.outfit.litA);
  const outfitB = hsl(F.outfit.hue, clamp(F.outfit.sat - 10, 20, 90), F.outfit.litB);

  const outfitSvg = (function(){
    // All outfits share the same body area so silhouettes still vary via details.
    if(F.outfit.type === 0){
      // overalls
      const btn = hsl(F.bg.h1, 85, 60);
      return (
        `<path d="M 30 64 C 40 56 46 56 56 62 C 66 56 72 56 82 64 L 82 96 L 30 96 Z" fill="${outfitA}"/>`+
        `<rect x="38" y="62" width="10" height="16" rx="4" fill="${outfitB}"/>`+
        `<rect x="64" y="62" width="10" height="16" rx="4" fill="${outfitB}"/>`+
        `<circle cx="43" cy="74" r="2.4" fill="${btn}"/>`+
        `<circle cx="69" cy="74" r="2.4" fill="${btn}"/>`+
        `<rect x="48" y="78" width="16" height="12" rx="4" fill="rgba(0,0,0,0.18)"/>`+
        `<path d="M 51 84 L 61 84" stroke="rgba(255,255,255,0.30)" stroke-width="2" stroke-linecap="round"/>`
      );
    }
    if(F.outfit.type === 1){
      // hoodie
      return (
        `<path d="M 28 64 Q 56 48 84 64 L 84 96 L 28 96 Z" fill="${outfitA}"/>`+
        `<path d="M 40 66 Q 56 56 72 66" stroke="rgba(255,255,255,0.25)" stroke-width="3" stroke-linecap="round" fill="none"/>`+
        `<path d="M 52 70 L 50 80 M 60 70 L 62 80" stroke="rgba(0,0,0,0.20)" stroke-width="2" stroke-linecap="round"/>`
      );
    }
    if(F.outfit.type === 2){
      // suit
      return (
        `<path d="M 30 62 L 82 62 L 82 96 L 30 96 Z" fill="${outfitA}"/>`+
        `<path d="M 56 62 L 48 78 L 56 78 L 64 78 Z" fill="${outfitB}"/>`+
        `<path d="M 48 62 L 56 78 L 64 62" fill="rgba(255,255,255,0.08)"/>`+
        `<rect x="54" y="78" width="4" height="14" rx="2" fill="rgba(0,0,0,0.25)"/>`
      );
    }
    // robe
    return (
      `<path d="M 30 60 Q 56 50 82 60 L 82 96 L 30 96 Z" fill="${outfitA}"/>`+
      `<path d="M 56 60 L 56 96" stroke="rgba(255,255,255,0.20)" stroke-width="3"/>`+
      `<path d="M 40 76 Q 56 86 72 76" stroke="${outfitB}" stroke-width="4" stroke-linecap="round" fill="none"/>`
    );
  })();

  const bg0 = hsl(F.bg.h1, 75, 14);
  const bg1 = hsl(F.bg.h2, 85, 8);

  const bodyGradA = F.body.a;
  const bodyGradB = F.body.b;

  const svg =
`<?xml version="1.0" encoding="UTF-8"?>\n`+
`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n`+
`  <defs>\n`+
`    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">\n`+
`      <stop offset="0" stop-color="${bg0}"/>\n`+
`      <stop offset="1" stop-color="${bg1}"/>\n`+
`    </linearGradient>\n`+
`    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">\n`+
`      <stop offset="0" stop-color="${bodyGradA}"/>\n`+
`      <stop offset="1" stop-color="${bodyGradB}"/>\n`+
`    </linearGradient>\n`+
`    <linearGradient id="outfit" x1="0" y1="0" x2="0" y2="1">\n`+
`      <stop offset="0" stop-color="${outfitA}"/>\n`+
`      <stop offset="1" stop-color="${outfitB}"/>\n`+
`    </linearGradient>\n`+
`  </defs>\n`+
`\n`+
`  <rect x="0" y="0" width="${size}" height="${size}" rx="22" fill="url(#bg)"/>\n`+
`  <rect x="${pad}" y="${pad}" width="${size-pad*2}" height="${size-pad*2}" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>\n`+
`\n`+
`  ${acc}\n`+
`\n`+
`  <!-- body/head -->\n`+
`  <rect x="${headX}" y="${headY}" width="${headW}" height="${headH}" rx="${bodyRx}" fill="url(#body)" stroke="rgba(0,0,0,0.22)"/>\n`+
`\n`+
`  ${hairSvg}\n`+
`\n`+
`  <!-- strap -->\n`+
`  <rect x="${headX-6}" y="${eyeY-7}" width="${headW+12}" height="14" rx="7" fill="${strapFill}"/>\n`+
`\n`+
`  <!-- goggles/eyes -->\n`+
`  ${eyes.map(e => eyeSvg(e.x, e.y, e.r)).join('\n  ')}\n`+
`\n`+
`  <!-- mouth/face details -->\n`+
`  ${cheekSvg}\n`+
`  ${frecklesSvg}\n`+
`  <path d="${mouth}" stroke="rgba(0,0,0,0.45)" stroke-width="3" stroke-linecap="round" fill="none"/>\n`+
`\n`+
`  <!-- outfit -->\n`+
`  ${outfitSvg.replaceAll(outfitA, 'url(#outfit)').replaceAll(outfitB, 'url(#outfit)')}\n`+
`\n`+
`  <!-- id label -->\n`+
`  <text x="${cx}" y="${size-10}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="8" fill="rgba(255,255,255,0.60)">${label}</text>\n`+
`</svg>\n`;

  return svg;
}

function signatureForFeatures(F){
  // A feature signature used to avoid “every 5 look the same”.
  // We bias toward silhouette/major-color features.
  return [
    F.body?.a,
    `g${F.goggle.type}${F.goggle.rim}${F.goggle.strap}`,
    `h${F.hair.style}`,
    `o${F.outfit.type}`,
    `a${F.accessory.type}`,
    `m${F.mouth}`,
    `bg${F.bg.h1}`
  ].join('|');
}

const docs = path.join(__dirname,'..','docs');
const hivePath = path.join(docs,'hive_state.json');
const outDir = path.join(docs,'avatars','identicons');
fs.mkdirSync(outDir,{recursive:true});

const hive = JSON.parse(fs.readFileSync(hivePath,'utf8'));
const roster = hive?.minions?.roster || [];

const used = new Set();
for(const m of roster){
  const id = m.id;

  // ensure uniqueness of major features
  let salt = 0;
  for(;;){
    const F = featuresFor(id, salt);
    const sig = signatureForFeatures(F);
    if(!used.has(sig)){
      used.add(sig);
      const svg = svgFor(id, salt);
      const out = path.join(outDir, `${id}.svg`);
      fs.writeFileSync(out, svg);
      m.avatar_url = `./avatars/identicons/${id}.svg`;
      m.avatar_salt = salt; // harmless extra metadata; helps debugging
      break;
    }
    salt++;
    if(salt > 50){
      // Should never happen for 50 minions; fall back to last attempt.
      const svg = svgFor(id, salt);
      const out = path.join(outDir, `${id}.svg`);
      fs.writeFileSync(out, svg);
      m.avatar_url = `./avatars/identicons/${id}.svg`;
      m.avatar_salt = salt;
      break;
    }
  }
}

// write hive back (canonical source of truth)
fs.writeFileSync(hivePath, JSON.stringify(hive, null, 2) + '\n');
console.log('generate_identicons ok', roster.length);
