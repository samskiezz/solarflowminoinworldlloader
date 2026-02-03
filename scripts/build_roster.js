const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const hive = fs.readFileSync(path.join(docs, 'hive_state.json'), 'utf8').trim();
const hiveObj = JSON.parse(hive);

function esc(s){
  return s.replace(/<\//g, '<\\/');
}

const updatedAt = hiveObj?.meta?.updatedAt || '—';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roster • SolarFlow Minion World</title>
  <meta name="color-scheme" content="dark light" />
  <style>
    :root{--bg1:#070A12;--bg2:#0B1530;--card:rgba(255,255,255,.08);--card2:rgba(255,255,255,.06);--stroke:rgba(255,255,255,.14);--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.62);--blue:#60a5fa;--purple:#a78bfa;--cyan:#22d3ee;}
    *{box-sizing:border-box}
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text);
      background:radial-gradient(1200px 600px at 10% 10%, rgba(167,139,250,.22), transparent 60%),
               radial-gradient(900px 500px at 85% 20%, rgba(34,211,238,.18), transparent 55%),
               radial-gradient(1000px 700px at 50% 110%, rgba(96,165,250,.14), transparent 60%),
               linear-gradient(180deg,var(--bg1),var(--bg2));
      min-height:100vh;overflow-x:hidden}
    a{color:rgba(255,255,255,.88)}
    .wrap{max-width:1100px;margin:0 auto;padding:28px 18px 80px}
    .top{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
    .brand{display:flex;flex-direction:column;gap:2px}
    .brand h1{margin:0;font-size:22px;letter-spacing:.2px}
    .brand .sub{font-size:13px;color:var(--muted)}
    .pillbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .pill{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border-radius:999px;padding:8px 12px;font-size:12px;color:var(--muted)}
    .btn{cursor:pointer;border:1px solid var(--stroke);background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06));color:var(--text);
      padding:9px 12px;border-radius:10px;font-size:13px}
    .card{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-radius:16px;padding:14px}

    .controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
    input, select{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.14);color:var(--text);padding:10px 12px;border-radius:12px;font-size:13px;outline:none}
    input{min-width:240px;flex:1}

    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    @media (max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
    @media (max-width:620px){.grid{grid-template-columns:1fr}}

    .m{padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16)}
    .topRow{display:flex;gap:10px;align-items:center;justify-content:space-between}
    .who{display:flex;gap:10px;align-items:center;min-width:0}
    .av{width:38px;height:38px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.16);flex:0 0 38px;background:linear-gradient(135deg, rgba(34,211,238,.40), rgba(167,139,250,.30))}
    .av img{width:100%;height:100%;object-fit:cover;display:block}
    .id{font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .meta{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
    .chip{font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.14);color:rgba(255,255,255,.86)}
    .kv{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .kv div{font-size:12px;color:rgba(255,255,255,.86)}
    .kv span{color:var(--muted)}

    .footer{margin-top:12px;font-size:12px;color:var(--muted)}
  </style>
</head>
<body>
  <script id="data-hive" type="application/json">${esc(hive)}</script>

  <div class="wrap">
    <div class="top">
      <div class="brand">
        <h1>Roster</h1>
        <div class="sub">All minions from canonical hive_state • updated <span style="color:rgba(255,255,255,.85)">${updatedAt}</span></div>
      </div>
      <div class="pillbar">
        <button class="btn" onclick="location.href='./index.html'">Back</button>
        <button class="btn" onclick="location.href='./realm.html'">Enter 3D Realm</button>
        <div class="pill" id="countPill">—</div>
      </div>
    </div>

    <div class="card">
      <div class="controls">
        <input id="q" placeholder="Search: id, role, mode, specialty…" />
        <select id="tier">
          <option value="">All tiers</option>
          <option value="3">Tier 3</option>
          <option value="2">Tier 2</option>
          <option value="1">Tier 1</option>
          <option value="0">Tier 0</option>
        </select>
        <select id="mode">
          <option value="">All modes</option>
          <option value="EXECUTION">EXECUTION</option>
          <option value="COLLAB">COLLAB</option>
          <option value="EVOLVE">EVOLVE</option>
          <option value="WAR_ROOM">WAR_ROOM</option>
          <option value="FAILSAFE">FAILSAFE</option>
        </select>
        <button class="btn" id="clear">Clear</button>
      </div>

      <div class="grid" id="grid"></div>
      <div class="footer">No fetch(). Rendering from embedded <code>hive_state</code>.</div>
    </div>
  </div>

  <script>
    function safeParse(id){
      try{
        const el = document.getElementById(id);
        const txt = (el && el.textContent || '').trim();
        return txt ? JSON.parse(txt) : {};
      }catch(e){ return {}; }
    }
    function el(tag, attrs){
      const n=document.createElement(tag);
      if(attrs){
        for(const k in attrs){
          const v = attrs[k];
          if(k==='class') n.className=v;
          else if(k==='text') n.textContent=v;
          else n.setAttribute(k,v);
        }
      }
      return n;
    }

    const HIVE = safeParse('data-hive');
    const roster = (HIVE.minions && Array.isArray(HIVE.minions.roster)) ? HIVE.minions.roster : [];

    const q = document.getElementById('q');
    const tier = document.getElementById('tier');
    const mode = document.getElementById('mode');
    const grid = document.getElementById('grid');
    const countPill = document.getElementById('countPill');

    function norm(s){ return String(s||'').toLowerCase(); }

    function match(m){
      const qq = norm(q.value).trim();
      const t = String(tier.value||'').trim();
      const md = String(mode.value||'').trim();
      if(t && String(m.tier) !== t) return false;
      if(md && String(m.mode||'') !== md) return false;
      if(!qq) return true;
      const blob = [m.id, m.role, m.mode, (m.specialties||[]).join(' '), m.tier].map(norm).join(' ');
      return blob.includes(qq);
    }

    function render(){
      grid.innerHTML='';
      const filtered = roster.filter(match);
      countPill.textContent = filtered.length + ' / ' + roster.length;

      filtered.forEach(m=>{
        const card = el('div',{class:'m'});

        const topRow = el('div',{class:'topRow'});
        const who = el('div',{class:'who'});
        const av = el('div',{class:'av'});
        if(m.avatar_url){
          const img = el('img');
          img.src = m.avatar_url;
          img.alt = m.id || 'Minion';
          av.appendChild(img);
        }
        const metaWrap = el('div');
        metaWrap.appendChild(el('div',{class:'id',text:(m.id||'')}));
        metaWrap.appendChild(el('div',{class:'meta',text:(String(m.role||'') + ' • T' + String(m.tier??'') + ' • ' + String(m.mode||''))}));
        who.appendChild(av);
        who.appendChild(metaWrap);
        topRow.appendChild(who);
        card.appendChild(topRow);

        const chips = el('div',{class:'chips'});
        (m.specialties||[]).slice(0,6).forEach(s=> chips.appendChild(el('div',{class:'chip',text:s}))); 
        card.appendChild(chips);

        const kv = el('div',{class:'kv'});
        kv.appendChild(el('div',{text:'Credits: '}));
        kv.lastChild.appendChild(el('span',{text:String(m.energy_credits ?? '—')}));
        kv.appendChild(el('div',{text:'Reputation: '}));
        kv.lastChild.appendChild(el('span',{text:String(m.reputation ?? '—')}));
        kv.appendChild(el('div',{text:'Happiness(sim): '}));
        kv.lastChild.appendChild(el('span',{text:String(m.happiness_sim ?? '—')}));
        kv.appendChild(el('div',{text:'Avatar: '}));
        kv.lastChild.appendChild(el('span',{text:(m.avatar_url || '—')}));
        card.appendChild(kv);

        grid.appendChild(card);
      });
    }

    q.addEventListener('input', render);
    tier.addEventListener('change', render);
    mode.addEventListener('change', render);
    document.getElementById('clear').addEventListener('click', ()=>{ q.value=''; tier.value=''; mode.value=''; render(); });

    render();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(docs, 'roster.html'), html);
console.log('build_roster ok');
