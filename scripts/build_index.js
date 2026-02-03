const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const hive = fs.readFileSync(path.join(docs, 'hive_state.json'), 'utf8').trim();
const hiveObj = JSON.parse(hive);

function esc(s){
  // prevent accidental </script> termination (paranoid)
  return s.replace(/<\//g, '<\\/');
}

const updatedAt = hiveObj?.meta?.updatedAt || '—';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SolarFlow Status Feed</title>
  <meta name="color-scheme" content="dark light" />
  <style>
    :root{--bg1:#070A12;--bg2:#0B1530;--card:rgba(255,255,255,.08);--card2:rgba(255,255,255,.06);--stroke:rgba(255,255,255,.14);--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.62);--good:#22c55e;--warn:#f59e0b;--bad:#ef4444;--blue:#60a5fa;--purple:#a78bfa;--cyan:#22d3ee;}
    *{box-sizing:border-box}
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text);
      background:radial-gradient(1200px 600px at 10% 10%, rgba(167,139,250,.22), transparent 60%),
               radial-gradient(900px 500px at 85% 20%, rgba(34,211,238,.18), transparent 55%),
               radial-gradient(1000px 700px at 50% 110%, rgba(96,165,250,.14), transparent 60%),
               linear-gradient(180deg,var(--bg1),var(--bg2));
      min-height:100vh;overflow-x:hidden}
    .wrap{max-width:980px;margin:0 auto;padding:28px 18px 80px}
    .top{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
    .brand{display:flex;flex-direction:column;gap:2px}
    .brand h1{margin:0;font-size:22px;letter-spacing:.2px}
    .brand .sub{font-size:13px;color:var(--muted)}
    .pillbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .pill{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border-radius:999px;padding:8px 12px;font-size:12px;color:var(--muted)}
    .pill strong{color:var(--text);font-weight:600}
    .btn{cursor:pointer;border:1px solid var(--stroke);background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06));color:var(--text);
      padding:9px 12px;border-radius:10px;font-size:13px}
    .spin{display:inline-block;width:12px;height:12px;border-radius:999px;border:2px solid rgba(255,255,255,.25);border-top-color:rgba(34,211,238,.95);animation:spin 0.9s linear infinite;vertical-align:-2px;margin-right:6px}
    .spin.paused{animation:none;border-top-color:rgba(255,255,255,.25)}
    @keyframes spin{to{transform:rotate(360deg)}}
    .grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}
    @media (max-width:880px){.grid{grid-template-columns:1fr}}
    .card{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-radius:16px;padding:14px}
    .progressRow{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .bar{height:10px;border-radius:999px;overflow:hidden;flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);min-width:220px}
    .bar>div{height:100%;width:0%;background:linear-gradient(90deg,var(--cyan),var(--purple),var(--blue))}
    .pct{font-size:12px;color:var(--muted)}
    .milestones{margin-top:12px;display:flex;flex-direction:column;gap:8px}
    .ms{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.12)}
    .left{display:flex;flex-direction:column;gap:2px}
    .title{font-size:13px;font-weight:600}
    .id{font-size:11px;color:var(--muted)}
    .tag{font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14)}
    .tag.done{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.35);color:#bff3cc}
    .tag.ip{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.35);color:#d7e9ff}
    .tag.todo{background:rgba(148,163,184,.14);border-color:rgba(148,163,184,.25);color:#e5e7eb}
    .tag.blocked{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#ffe6b5}
    .feed{margin-top:14px;display:flex;flex-direction:column;gap:10px}
    .tweet{padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16)}
    .tweetTop{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .who{display:flex;gap:10px;align-items:center}
    .avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg, rgba(34,211,238,.45), rgba(167,139,250,.35));border:1px solid rgba(255,255,255,.16);overflow:hidden;flex:0 0 34px}
    .avatar img{width:100%;height:100%;object-fit:cover;display:block}
    .name{font-weight:700;font-size:13px}
    .meta{font-size:12px;color:var(--muted)}
    .tweetBody{margin-top:8px;font-size:13px;line-height:1.45}
    .footer{margin-top:16px;font-size:12px;color:var(--muted)}
  </style>
</head>
<body>
  <!-- Canonical embedded hive_state snapshot: no fetch required -->
  <script id="data-hive" type="application/json">${esc(hive)}</script>

  <div class="wrap">
    <div class="top">
      <div class="brand">
        <h1>SolarFlow Status Feed</h1>
        <div class="sub">A–Z Realm v1 • no network required • hive updated <span style="color:rgba(255,255,255,.85)">${updatedAt}</span> • <a href="./system-prompt-v1.3.md" style="color:rgba(255,255,255,.85)">System Prompt v1.3</a></div>
      </div>
      <div class="pillbar">
        <div class="pill"><strong>CI</strong>: <span id="ciText">—</span></div>
        <div class="pill"><span id="spin" class="spin"></span>Last update: <strong id="updatedAt">—</strong></div>
        <button class="btn" id="btnToggle">Pause</button>
        <button class="btn" onclick="location.href='./realm.html'">Enter 3D Realm</button>
        <button class="btn" onclick="location.reload()">Refresh</button>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="progressRow">
          <div style="min-width:140px;font-weight:700">Overall</div>
          <div class="bar"><div id="bar"></div></div>
          <div class="pct" id="pct">—%</div>
        </div>
        <div style="margin-top:8px;color:var(--muted);font-size:13px" id="overallLabel">—</div>
        <div class="milestones" id="milestones"></div>
        <div class="footer" id="diag"></div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-weight:800">Minion Feed</div>
          <div class="pill" style="padding:6px 10px">@projectsolarbot</div>
        </div>
        <div class="feed" id="feed"></div>
        <div class="footer">Source of truth: embedded <code>hive_state</code>. No fetch().</div>
      </div>
    </div>

    <div class="footer" style="margin-top:18px">If this page loads, the UI is healthy. If the feed is stale, regenerate from <code>docs/hive_state.json</code>.</div>
  </div>

  <script>
    function safeParse(jsonElId){
      try{
        const el = document.getElementById(jsonElId);
        const txt = (el && el.textContent || '').trim();
        return txt ? JSON.parse(txt) : {};
      }catch(e){
        return {};
      }
    }

    const HIVE = safeParse('data-hive');
    const HEALTH = (HIVE.world && HIVE.world.health) ? HIVE.world.health : { tick_interval_sec: 60, paused: false };

    // Derive view models from canonical hive_state.
    const STATUS = (HIVE.activities && HIVE.activities.status) ? {
      updatedAt: (HIVE.meta && HIVE.meta.updatedAt) || '—',
      ci: HIVE.activities.status.ci || 'unknown',
      overall: typeof HIVE.activities.status.overall === 'number' ? HIVE.activities.status.overall : 0,
      overallLabel: HIVE.activities.status.overallLabel || '—',
      milestones: Array.isArray(HIVE.activities.status.milestones) ? HIVE.activities.status.milestones : []
    } : {
      updatedAt: '—', ci: 'unknown', overall: 0, overallLabel: '—', milestones: []
    };

    const FEED = (HIVE.activities && Array.isArray(HIVE.activities.feed_posts)) ? {
      posts: HIVE.activities.feed_posts
    } : { posts: [] };

    function pctFromOverall(o){
      const n = typeof o === 'number' ? o : 0;
      return Math.max(0, Math.min(100, Math.round((n/10)*100)));
    }
    function tagClass(s){
      if(s==='done') return 'done';
      if(s==='in-progress') return 'ip';
      if(s==='blocked') return 'blocked';
      return 'todo';
    }
    function el(tag, attrs){
      const n=document.createElement(tag);
      if(attrs){
        for(const [k,v] of Object.entries(attrs)){
          if(k==='class') n.className=v;
          else if(k==='text') n.textContent=v;
          else n.setAttribute(k,v);
        }
      }
      return n;
    }

    // loader spinner + pause/start
    let paused = !!HEALTH.paused;
    const btn = document.getElementById('btnToggle');
    const spin = document.getElementById('spin');
    function setPaused(v){
      paused = !!v;
      if(btn) btn.textContent = paused ? 'Start' : 'Pause';
      if(spin) spin.classList.toggle('paused', paused);
    }
    setPaused(paused);

    // auto-refresh loop (reload page to pick up new deploy snapshot)
    const intervalMs = Math.max(10, (Number(HEALTH.tick_interval_sec)||60)) * 1000;
    setInterval(()=>{ if(!paused) location.reload(); }, intervalMs);
    btn?.addEventListener('click', ()=> setPaused(!paused));

    // render
    document.getElementById('updatedAt').textContent = STATUS.updatedAt || '—';
    document.getElementById('ciText').textContent = STATUS.ci || 'unknown';
    document.getElementById('overallLabel').textContent = STATUS.overallLabel || '—';
    const p = pctFromOverall(STATUS.overall);
    document.getElementById('pct').textContent = p + '%';
    document.getElementById('bar').style.width = p + '%';

    const ms = document.getElementById('milestones');
    ms.innerHTML='';
    (STATUS.milestones||[]).forEach(m=>{
      const row = el('div',{class:'ms'});
      const left = el('div',{class:'left'});
      left.appendChild(el('div',{class:'title',text:m.label||m.id||''}));
      left.appendChild(el('div',{class:'id',text:m.id||''}));
      row.appendChild(left);
      row.appendChild(el('div',{class:'tag '+tagClass(m.status),text:m.status||''}));
      ms.appendChild(row);
    });

    const feedEl = document.getElementById('feed');
    feedEl.innerHTML='';
    (FEED.posts||[]).slice(0,10).forEach(post=>{
      const t = el('div',{class:'tweet'});
      const top = el('div',{class:'tweetTop'});
      const who = el('div',{class:'who'});
      const av = el('div',{class:'avatar'});
      if(post.avatar_url){
        const img = el('img');
        img.src = post.avatar_url;
        img.alt = post.who || 'Minion';
        av.appendChild(img);
      }
      const metaWrap = el('div');
      const name = el('div',{class:'name'});
      name.appendChild(document.createTextNode(post.who||'Minion'));
      const meta = el('span',{class:'meta',text:(post.when ? ' • '+post.when : '')});
      name.appendChild(meta);
      metaWrap.appendChild(name);
      metaWrap.appendChild(el('div',{class:'meta',text:post.topic||''}));
      who.appendChild(av);
      who.appendChild(metaWrap);
      top.appendChild(who);
      top.appendChild(el('div',{class:'tag '+tagClass(post.status),text:post.status||'update'}));
      t.appendChild(top);
      t.appendChild(el('div',{class:'tweetBody',text:post.text||''}));
      feedEl.appendChild(t);
    });

    const rosterCount = Array.isArray(HIVE.minions && HIVE.minions.roster) ? HIVE.minions.roster.length : 0;
    document.getElementById('diag').textContent = 'render: hive_state embedded • roster ' + rosterCount + ' • no-fetch';
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(docs, 'index.html'), html);
console.log('build_index ok');
